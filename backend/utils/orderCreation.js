import Inventory from '../models/Inventory.js';
import Notification from '../models/Notification.js';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import Recipe from '../models/Recipe.js';
import User from '../models/User.js';
import { createInvoiceForOrder } from './billing.js';
import { evaluateDelivery } from './delivery.js';
import { getActiveCoupons, withProductOffer } from './offers.js';

export const createOrderFromPayload = async (payload, app = null, paymentOverrides = {}) => {
  const {
    userId,
    guestName,
    items,
    discountAmount,
    couponCode,
    paymentMethod,
    orderType,
    tableNumber,
    deliveryAddress,
    customerAddress,
    customerLatitude,
    customerLongitude
  } = payload;

  if (!Array.isArray(items) || items.length === 0) {
    const error = new Error('Order items are required');
    error.statusCode = 400;
    throw error;
  }

  let deliveryDetails = null;
  let normalizedDeliveryAddress = deliveryAddress || '';
  if (orderType === 'delivery') {
    const addressParts = customerAddress || {};
    normalizedDeliveryAddress = addressParts.fullAddress || [
      addressParts.houseNumber,
      addressParts.street,
      addressParts.area,
      addressParts.city,
      addressParts.pincode
    ].filter(Boolean).join(', ') || deliveryAddress || '';

    if (!normalizedDeliveryAddress.trim()) {
      const error = new Error('Delivery address is required');
      error.statusCode = 400;
      throw error;
    }

    deliveryDetails = await evaluateDelivery({
      address: normalizedDeliveryAddress,
      latitude: customerLatitude,
      longitude: customerLongitude
    });

    if (!deliveryDetails.deliveryAvailable) {
      const error = new Error('Delivery is not available for this address');
      error.statusCode = 400;
      error.data = { delivery: deliveryDetails };
      throw error;
    }
  }

  const productUpdates = [];
  const ingredientRequirements = new Map();
  const activeCoupons = await getActiveCoupons();
  const pricedItems = [];

  for (const item of items) {
    const product = await Product.findById(item.product).populate('recipe');
    if (!product) {
      const error = new Error(`Product ${item.name} not found.`);
      error.statusCode = 404;
      throw error;
    }
    if (!product.inStock || product.stock < item.quantity) {
      const error = new Error(`${product.name} is out of stock or has insufficient quantity.`);
      error.statusCode = 400;
      throw error;
    }

    productUpdates.push({ product, quantity: item.quantity });
    const pricedProduct = withProductOffer(product, activeCoupons);
    pricedItems.push({
      product: product._id,
      name: product.name,
      quantity: item.quantity,
      price: Number(pricedProduct.price || product.price)
    });

    const recipe = product.recipe || await Recipe.findOne({ product: product._id, active: true });
    if (recipe?.active && recipe.ingredients?.length) {
      recipe.ingredients.forEach((recipeItem) => {
        const ingredientId = recipeItem.ingredient.toString();
        const current = ingredientRequirements.get(ingredientId) || 0;
        ingredientRequirements.set(ingredientId, current + (Number(recipeItem.quantity || 0) * Number(item.quantity || 0)));
      });
    }
  }

  if (ingredientRequirements.size > 0) {
    const ingredientIds = Array.from(ingredientRequirements.keys());
    const ingredients = await Inventory.find({ _id: { $in: ingredientIds } });
    for (const [ingredientId, requiredQuantity] of ingredientRequirements.entries()) {
      const ingredient = ingredients.find((item) => item._id.toString() === ingredientId);
      if (!ingredient) {
        const error = new Error('Recipe ingredient not found in inventory.');
        error.statusCode = 400;
        throw error;
      }
      if (Number(ingredient.quantity) < requiredQuantity) {
        const error = new Error(`${ingredient.name} stock is too low for this recipe. Required ${requiredQuantity} ${ingredient.unit}, available ${ingredient.quantity} ${ingredient.unit}.`);
        error.statusCode = 400;
        throw error;
      }
    }
  }

  for (const { product, quantity } of productUpdates) {
    product.stock -= quantity;
    if (product.stock <= 0) {
      product.stock = 0;
      product.inStock = false;
    }
    await product.save();
  }

  for (const [ingredientId, requiredQuantity] of ingredientRequirements.entries()) {
    await Inventory.findByIdAndUpdate(ingredientId, { $inc: { quantity: -requiredQuantity } });
  }

  const itemsAmount = pricedItems.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0);
  const deliveryCharge = deliveryDetails?.deliveryCharge || 0;
  const payableAmount = itemsAmount + deliveryCharge;
  const pointsEarned = Math.floor(payableAmount / 100);
  const resolvedPaymentMethod = paymentMethod || 'cash';

  const order = await Order.create({
    user: userId || null,
    guestName: guestName || '',
    items: pricedItems,
    totalAmount: payableAmount,
    discountAmount: discountAmount || 0,
    couponCode: couponCode || '',
    paymentMethod: resolvedPaymentMethod,
    paymentStatus: paymentOverrides.paymentStatus || (resolvedPaymentMethod === 'razorpay' ? 'Pending' : 'Paid'),
    razorpayOrderId: paymentOverrides.razorpayOrderId || '',
    razorpayPaymentId: paymentOverrides.razorpayPaymentId || '',
    orderType,
    tableNumber: tableNumber || '',
    deliveryAddress: normalizedDeliveryAddress,
    customerAddress: {
      ...(customerAddress || {}),
      fullAddress: normalizedDeliveryAddress
    },
    customerLatitude: deliveryDetails?.customerLatitude ?? null,
    customerLongitude: deliveryDetails?.customerLongitude ?? null,
    distanceKm: deliveryDetails?.distanceKm ?? null,
    estimatedTime: deliveryDetails?.estimatedTime ?? null,
    deliveryCharge,
    deliveryAvailable: deliveryDetails?.deliveryAvailable ?? orderType !== 'delivery',
    deliveryServiceStatus: deliveryDetails?.serviceAreaStatus || '',
    loyaltyPointsEarned: pointsEarned,
    status: 'Pending'
  });

  const invoice = await createInvoiceForOrder(
    await Order.findById(order._id).populate('user', 'name email phone')
  );
  invoice.paymentStatus = order.paymentStatus;
  invoice.paymentMethod = order.paymentMethod;
  await invoice.save();
  order.invoice = invoice._id;
  order.totalAmount = invoice.totalAmount;
  await order.save();

  if (userId) {
    await User.findByIdAndUpdate(userId, { $inc: { loyaltyPoints: pointsEarned } });
  }

  const adminUsers = await User.find({ role: 'admin' }, '_id');
  if (adminUsers.length > 0) {
    await Notification.insertMany(adminUsers.map((admin) => ({
      user: admin._id,
      title: order.orderType === 'delivery' ? 'New delivery order' : 'New order received',
      message: order.orderType === 'delivery'
        ? `Order #${order._id.toString().slice(-6)} is ${order.distanceKm} KM away, ETA ${order.estimatedTime} minutes, ${order.deliveryServiceStatus}.`
        : `Order #${order._id.toString().slice(-6)} is waiting for assignment.`,
      type: 'order',
      order: order._id
    })));
  }

  try {
    const io = app?.get?.('io');
    if (io) {
      io.emit('order:new', order);
      io.to('kds').emit('order:new', order);
    }
  } catch (error) {
    console.warn('Socket emit failed for new order', error.message);
  }

  return { order, invoice };
};
