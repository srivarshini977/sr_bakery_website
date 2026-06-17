import express from 'express';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import Inventory from '../models/Inventory.js';
import Recipe from '../models/Recipe.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { protect, restrictTo } from '../middleware/auth.js';
import { staffWorkstationIds, staffWorkstations } from '../data/staffWorkstations.js';
import { evaluateDelivery, getDeliverySettings } from '../utils/delivery.js';
import { getActiveCoupons, withProductOffer } from '../utils/offers.js';
import { createInvoiceForOrder, createKotForOrder } from '../utils/billing.js';

const router = express.Router();

// GET ALL ORDERS (Admin dashboard)
router.get('/', protect, restrictTo('admin'), async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('user', 'name email phone')
      .populate('assignedTo', 'name email role staffRole')
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: 'success',
      results: orders.length,
      data: orders
    });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving orders', error: error.message });
  }
});

// CREATE NEW ORDER (Dine-in, Takeaway, Delivery)
router.post('/', async (req, res) => {
  try {
    const {
      userId,
      guestName,
      items,
      totalAmount,
      discountAmount,
      couponCode,
      paymentMethod,
      orderType,
      tableNumber,
      deliveryAddress,
      customerAddress,
      customerLatitude,
      customerLongitude
    } = req.body;

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
        return res.status(400).json({ message: 'Delivery address is required' });
      }

      deliveryDetails = await evaluateDelivery({
        address: normalizedDeliveryAddress,
        latitude: customerLatitude,
        longitude: customerLongitude
      });

      if (!deliveryDetails.deliveryAvailable) {
        return res.status(400).json({
          message: 'Delivery is not available for this address',
          data: { delivery: deliveryDetails }
        });
      }
    }

    const productUpdates = [];
    const ingredientRequirements = new Map();

    const activeCoupons = await getActiveCoupons();
    const pricedItems = [];

    // Verify product stock and recipe ingredient stock before mutating anything.
    for (const item of items) {
      const product = await Product.findById(item.product).populate('recipe');
      if (!product) {
        return res.status(404).json({ message: `Product ${item.name} not found.` });
      }
      if (!product.inStock || product.stock < item.quantity) {
        return res.status(400).json({ message: `Product ${product.name} is out of stock or has insufficient quantity.` });
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
          return res.status(400).json({ message: 'Recipe ingredient not found in inventory.' });
        }
        if (Number(ingredient.quantity) < requiredQuantity) {
          return res.status(400).json({
            message: `${ingredient.name} stock is too low for this recipe. Required ${requiredQuantity} ${ingredient.unit}, available ${ingredient.quantity} ${ingredient.unit}.`
          });
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
      await Inventory.findByIdAndUpdate(ingredientId, {
        $inc: { quantity: -requiredQuantity }
      });
    }

    // Calculate loyalty points (1 point per Rs. 100 spent)
    const itemsAmount = pricedItems.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0);
    const deliveryCharge = deliveryDetails?.deliveryCharge || 0;
    const payableAmount = itemsAmount + deliveryCharge;
    const pointsEarned = Math.floor(payableAmount / 100);

    // Create order
    const order = await Order.create({
      user: userId || null,
      guestName: guestName || '',
      items: pricedItems,
      totalAmount: payableAmount,
      discountAmount: discountAmount || 0,
      couponCode: couponCode || '',
      paymentMethod,
      paymentStatus: paymentMethod === 'razorpay' ? 'Pending' : 'Paid', // Paid on delivery/cash, pending for online until verified
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
    order.invoice = invoice._id;
    order.totalAmount = invoice.totalAmount;
    await order.save();

    // Update user loyalty points if registered
    if (userId) {
      await User.findByIdAndUpdate(userId, {
        $inc: { loyaltyPoints: pointsEarned }
      });
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

    // Mock Razorpay Order Creation if payment method is razorpay
    let razorpayOrderDetails = null;
    if (paymentMethod === 'razorpay') {
      const mockRazorpayOrderId = 'order_mock_' + Math.random().toString(36).substring(2, 11);
      order.razorpayOrderId = mockRazorpayOrderId;
      await order.save();
      razorpayOrderDetails = {
        id: mockRazorpayOrderId,
        amount: totalAmount * 100, // in paise
        currency: 'INR'
      };
    }

    // Emit socket event for new order (if io available)
    try {
      const io = req.app.get('io');
      if (io) {
        io.emit('order:new', order);
        // also emit specifically to KDS room
        io.to('kds').emit('order:new', order);
      }
    } catch (e) {
      console.warn('Socket emit failed for new order', e.message);
    }

    res.status(201).json({
      status: 'success',
      data: {
        order,
        invoice,
        razorpayOrderDetails
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error creating order', error: error.message });
  }
});

router.get('/delivery/settings', async (req, res) => {
  try {
    const settings = await getDeliverySettings();
    res.status(200).json({ status: 'success', data: { settings } });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving delivery settings', error: error.message });
  }
});

router.post('/delivery/check', async (req, res) => {
  try {
    const delivery = await evaluateDelivery(req.body);
    res.status(200).json({ status: 'success', data: { delivery } });
  } catch (error) {
    res.status(500).json({ message: 'Error checking delivery area', error: error.message });
  }
});

// GET LOGGED-IN CUSTOMER ORDERS
router.get('/my-orders', protect, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.status(200).json({ status: 'success', results: orders.length, data: { orders } });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving user orders', error: error.message });
  }
});

// Backward-compatible customer order endpoint used by the dashboard
router.get('/user/:userId', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user._id.toString() !== req.params.userId) {
      return res.status(403).json({ message: 'You can only view your own orders' });
    }

    const orders = await Order.find({ user: req.params.userId }).sort({ createdAt: -1 });
    res.status(200).json({ status: 'success', results: orders.length, data: orders });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving user orders', error: error.message });
  }
});

// TRACK ORDER DETAILS BY ID
router.get('/track/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'name email phone')
      .populate('assignedTo', 'name email role staffRole');
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    res.status(200).json({ status: 'success', data: { order } });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving order status', error: error.message });
  }
});

// MOCK RAZORPAY PAYMENT VERIFICATION
router.post('/razorpay-verification', async (req, res) => {
  try {
    const { razorpayOrderId, razorpayPaymentId } = req.body;
    
    // Find order
    const order = await Order.findOne({ razorpayOrderId });
    if (!order) {
      return res.status(404).json({ message: 'Associated order not found.' });
    }

    order.paymentStatus = 'Paid';
    order.razorpayPaymentId = razorpayPaymentId || 'pay_mock_' + Math.random().toString(36).substring(2, 11);
    await order.save();

    res.status(200).json({
      status: 'success',
      message: 'Razorpay payment successfully verified.',
      data: { order }
    });
  } catch (error) {
    res.status(500).json({ message: 'Payment verification failed', error: error.message });
  }
});

// GET ACTIVE ORDERS FOR KITCHEN DISPLAY SYSTEM (KDS)
router.get('/kds/queue', protect, async (req, res) => {
  try {
    if (req.user.staffRole === 'chef') {
      return res.status(403).json({ message: 'Chefs can only access Kitchen Order Tickets' });
    }
    // KDS needs active orders that are still moving through the kitchen flow.
    const activeOrders = await Order.find({
      status: { $in: ['Pending', 'Confirmed', 'Preparing', 'Packed', 'Ready'] }
    }).sort({ createdAt: 1 });
    res.status(200).json({ status: 'success', data: { orders: activeOrders } });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving KDS queue', error: error.message });
  }
});

// UPDATE ORDER STATUS (Kitchen Staff or Admin updates order state)
router.patch('/:id/status', protect, async (req, res) => {
  try {
    const { status } = req.body;
    if (!['admin', 'staff'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Only staff or admin can update order status' });
    }
    if (req.user.staffRole === 'chef') {
      return res.status(403).json({ message: 'Chefs must update Kitchen Order Tickets, not billing orders' });
    }
    if (!['Pending', 'Confirmed', 'Preparing', 'Packed', 'Ready', 'Shipped', 'Delivered', 'Cancelled'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const existingOrder = await Order.findById(req.params.id);
    if (!existingOrder) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (req.user.role === 'staff') {
      const assignedToThisStaff = existingOrder.assignedTo?.toString() === req.user._id.toString();
      const assignedToThisPerson = existingOrder.assignedPerson === req.user.staffPerson;
      if (!assignedToThisStaff || !assignedToThisPerson) {
        return res.status(403).json({ message: 'You can only update your assigned orders' });
      }
    }

    existingOrder.status = status;
    if (['Delivered', 'Cancelled'].includes(status)) {
      existingOrder.completedAt = Date.now();
    }
    await existingOrder.save();

    const order = await Order.findById(existingOrder._id).populate('user', 'name email phone');
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

      // Emit socket event for status update
      try {
        const io = req.app.get('io');
        if (io) {
          io.emit('order:statusUpdated', order);
          io.to('kds').emit('order:statusUpdated', order);
          if (order.user) {
            io.to(`customer_${order.user._id}`).emit('order_status_update', {
              orderId: order._id,
              status: order.status,
              message: `Your order is now ${status}`
            });
          }
        }
      } catch (e) {
        console.warn('Socket emit failed for status update', e.message);
      }

      if (order.user) {
        await Notification.create({
          user: order.user._id,
          title: 'Order status updated',
          message: `Your order #${order._id.toString().slice(-6)} is now ${status}.`,
          type: 'status',
          order: order._id
        });
      }

      res.status(200).json({ status: 'success', data: { order } });
  } catch (error) {
    res.status(500).json({ message: 'Error updating order status', error: error.message });
  }
});

// ASSIGN ORDER TO STAFF (Admin only)
router.patch('/:id/assign', protect, restrictTo('admin'), async (req, res) => {
  try {
    const { assignedTo, assignedRole, assignedPerson } = req.body;

    if (!assignedTo || !assignedRole || !assignedPerson) {
      return res.status(400).json({ message: 'assignedTo, assignedRole and assignedPerson required' });
    }

    if (!staffWorkstationIds.includes(assignedPerson)) {
      return res.status(400).json({ message: 'Invalid staff page selected' });
    }

    const workstation = staffWorkstations.find((station) => station.id === assignedPerson);
    const assignedStaff = await User.findOne({ _id: assignedTo, role: 'staff', staffPerson: assignedPerson });
    if (!assignedStaff) {
      return res.status(400).json({ message: 'Selected staff account does not match this staff page' });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { assignedTo, assignedRole, assignedPerson, status: 'Confirmed' },
      { new: true, runValidators: true }
    ).populate('assignedTo', 'name email');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (workstation.role === 'chef' || assignedRole === 'chef') {
      const kot = await createKotForOrder(order, assignedTo, assignedPerson);
      order.kot = kot._id;
      await order.save();
    }

    // Emit assignment notification via Socket.IO
    const io = req.app.get('io');
    await Notification.create({
      user: order.assignedTo._id,
      title: 'New order assigned',
      message: `Order #${order._id.toString().slice(-6)} assigned to ${workstation.name}.`,
      type: 'assignment',
      order: order._id
    });

    if (io) {
      io.to(`staff_${order.assignedTo._id}`).emit('order_assigned', {
        orderId: order._id,
        message: `Order #${order._id.toString().slice(-6)} assigned to ${workstation.name}`,
        order: order
      });

      io.to('kds').emit('order_assigned', {
        orderId: order._id,
        assignedTo: workstation.name,
        assignedRole: order.assignedRole
      });
    }

    res.status(200).json({ status: 'success', data: { order } });
  } catch (error) {
    res.status(500).json({ message: 'Error assigning order', error: error.message });
  }
});

// GET STAFF ASSIGNED ORDERS
router.get('/staff/assigned/:staffId', protect, restrictTo('staff', 'admin'), async (req, res) => {
  try {
    const query = {
      assignedTo: req.params.staffId,
      status: { $nin: ['Packed', 'Ready', 'Shipped', 'Delivered', 'Cancelled'] }
    };
    if (req.user.role === 'staff') {
      query.assignedPerson = req.user.staffPerson;
    }

    const orders = await Order.find(query)
      .populate('user', 'name email phone')
      .populate('items.product')
      .sort({ createdAt: -1 });

    res.status(200).json({
      status: 'success',
      results: orders.length,
      data: { orders }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching assigned orders', error: error.message });
  }
});

export default router;
