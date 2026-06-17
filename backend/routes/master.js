import express from 'express';
import bcrypt from 'bcryptjs';
import Category from '../models/Category.js';
import Coupon from '../models/Coupon.js';
import Inventory from '../models/Inventory.js';
import Product from '../models/Product.js';
import Recipe from '../models/Recipe.js';
import RolePermission from '../models/RolePermission.js';
import Setting from '../models/Setting.js';
import User from '../models/User.js';
import Vendor from '../models/Vendor.js';
import { protect, restrictTo } from '../middleware/auth.js';
import { getDeliverySettings, updateDeliverySettings } from '../utils/delivery.js';

const router = express.Router();
router.use(protect, restrictTo('admin'));

const asyncHandler = (fn) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (error) {
    res.status(500).json({ message: error.message || 'Master management error' });
  }
};

const send = (res, key, value, statusCode = 200) => {
  res.status(statusCode).json({ status: 'success', data: { [key]: value } });
};

router.get('/summary', asyncHandler(async (req, res) => {
  const [
    ingredientCount,
    recipeCount,
    productCount,
    categoryCount,
    staffCount,
    vendorCount,
    activeCouponCount,
    roleCount,
    lowStockIngredients
  ] = await Promise.all([
    Inventory.countDocuments(),
    Recipe.countDocuments(),
    Product.countDocuments(),
    Category.countDocuments(),
    User.countDocuments({ role: 'staff' }),
    Vendor.countDocuments(),
    Coupon.countDocuments({ active: true, expiryDate: { $gte: new Date() } }),
    RolePermission.countDocuments(),
    Inventory.find({ $expr: { $lte: ['$quantity', '$minThreshold'] } }).sort({ quantity: 1 }).limit(8)
  ]);

  send(res, 'summary', {
    ingredientCount,
    recipeCount,
    productCount,
    categoryCount,
    staffCount,
    vendorCount,
    activeCouponCount,
    roleCount,
    lowStockIngredients
  });
}));

router.get('/ingredients', asyncHandler(async (req, res) => {
  const ingredients = await Inventory.find().populate('supplier', 'name phone').sort({ category: 1, name: 1 });
  send(res, 'ingredients', ingredients);
}));

router.post('/ingredients', asyncHandler(async (req, res) => {
  const ingredient = await Inventory.create(req.body);
  send(res, 'ingredient', ingredient, 201);
}));

router.patch('/ingredients/:id', asyncHandler(async (req, res) => {
  const ingredient = await Inventory.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  send(res, 'ingredient', ingredient);
}));

router.delete('/ingredients/:id', asyncHandler(async (req, res) => {
  await Inventory.findByIdAndDelete(req.params.id);
  res.status(204).json({ status: 'success', data: null });
}));

router.get('/categories', asyncHandler(async (req, res) => {
  const categories = await Category.find().sort({ sortOrder: 1, name: 1 });
  send(res, 'categories', categories);
}));

router.post('/categories', asyncHandler(async (req, res) => {
  const category = await Category.create(req.body);
  send(res, 'category', category, 201);
}));

router.patch('/categories/:id', asyncHandler(async (req, res) => {
  const category = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  send(res, 'category', category);
}));

router.delete('/categories/:id', asyncHandler(async (req, res) => {
  await Category.findByIdAndDelete(req.params.id);
  res.status(204).json({ status: 'success', data: null });
}));

router.get('/recipes', asyncHandler(async (req, res) => {
  const recipes = await Recipe.find()
    .populate('product', 'name price category')
    .populate('ingredients.ingredient', 'name unit costPerUnit quantity')
    .sort({ updatedAt: -1 });
  send(res, 'recipes', recipes);
}));

router.post('/recipes', asyncHandler(async (req, res) => {
  const recipe = await Recipe.create(req.body);
  if (recipe.product) {
    await Product.findByIdAndUpdate(recipe.product, { recipe: recipe._id });
  }
  send(res, 'recipe', recipe, 201);
}));

router.patch('/recipes/:id', asyncHandler(async (req, res) => {
  const recipe = await Recipe.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (recipe?.product) {
    await Product.findByIdAndUpdate(recipe.product, { recipe: recipe._id });
  }
  send(res, 'recipe', recipe);
}));

router.delete('/recipes/:id', asyncHandler(async (req, res) => {
  await Product.updateMany({ recipe: req.params.id }, { $set: { recipe: null } });
  await Recipe.findByIdAndDelete(req.params.id);
  res.status(204).json({ status: 'success', data: null });
}));

router.get('/food-items', asyncHandler(async (req, res) => {
  const products = await Product.find().populate('recipe', 'name').sort({ category: 1, name: 1 });
  send(res, 'products', products);
}));

router.get('/today-special', asyncHandler(async (req, res) => {
  const setting = await Setting.findOne({ key: 'todaySpecial' });
  const value = setting?.value || {
    productId: '',
    image: '',
    title: '',
    description: '',
    active: true
  };
  send(res, 'todaySpecial', value);
}));

router.patch('/today-special', asyncHandler(async (req, res) => {
  const payload = {
    productId: req.body.productId || '',
    image: req.body.image || '',
    title: req.body.title || '',
    description: req.body.description || '',
    active: req.body.active !== false
  };

  if (payload.productId) {
    const product = await Product.findById(payload.productId);
    if (!product) {
      return res.status(404).json({ message: 'Selected product not found' });
    }
  }

  const setting = await Setting.findOneAndUpdate(
    { key: 'todaySpecial' },
    { key: 'todaySpecial', value: payload },
    { upsert: true, new: true, runValidators: true }
  );
  send(res, 'todaySpecial', setting.value);
}));

router.post('/food-items', asyncHandler(async (req, res) => {
  const product = await Product.create(req.body);
  if (product.recipe) {
    await Recipe.findByIdAndUpdate(product.recipe, { product: product._id });
  }
  send(res, 'product', product, 201);
}));

router.patch('/food-items/:id', asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (product?.recipe) {
    await Recipe.findByIdAndUpdate(product.recipe, { product: product._id });
  }
  send(res, 'product', product);
}));

router.delete('/food-items/:id', asyncHandler(async (req, res) => {
  await Recipe.updateMany({ product: req.params.id }, { $set: { product: null } });
  await Product.findByIdAndDelete(req.params.id);
  res.status(204).json({ status: 'success', data: null });
}));

router.get('/staff', asyncHandler(async (req, res) => {
  const staff = await User.find({ role: 'staff' }, '-password').sort({ staffRole: 1, name: 1 });
  send(res, 'staff', staff);
}));

router.post('/staff', asyncHandler(async (req, res) => {
  const staff = await User.create({ ...req.body, role: 'staff' });
  staff.password = undefined;
  send(res, 'staffMember', staff, 201);
}));

router.patch('/staff/:id', asyncHandler(async (req, res) => {
  const allowed = (({ name, email, phone, staffRole, staffPerson, address }) => ({ name, email, phone, staffRole, staffPerson, address }))(req.body);
  const staff = await User.findByIdAndUpdate(req.params.id, allowed, { new: true, runValidators: true, select: '-password' });
  send(res, 'staffMember', staff);
}));

router.patch('/staff/:id/reset-password', asyncHandler(async (req, res) => {
  const password = req.body.password || 'Staff@123';
  const hashed = await bcrypt.hash(password, 12);
  await User.findByIdAndUpdate(req.params.id, { password: hashed });
  send(res, 'result', { message: 'Password reset successfully' });
}));

router.delete('/staff/:id', asyncHandler(async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  res.status(204).json({ status: 'success', data: null });
}));

router.get('/vendors', asyncHandler(async (req, res) => {
  const vendors = await Vendor.find().sort({ name: 1 });
  send(res, 'vendors', vendors);
}));

router.post('/vendors', asyncHandler(async (req, res) => {
  const vendor = await Vendor.create(req.body);
  send(res, 'vendor', vendor, 201);
}));

router.patch('/vendors/:id', asyncHandler(async (req, res) => {
  const vendor = await Vendor.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  send(res, 'vendor', vendor);
}));

router.post('/vendors/:id/purchases', asyncHandler(async (req, res) => {
  const vendor = await Vendor.findById(req.params.id);
  vendor.purchaseHistory.push(req.body);
  await vendor.save();
  send(res, 'vendor', vendor);
}));

router.delete('/vendors/:id', asyncHandler(async (req, res) => {
  await Vendor.findByIdAndDelete(req.params.id);
  res.status(204).json({ status: 'success', data: null });
}));

router.get('/coupons', asyncHandler(async (req, res) => {
  const coupons = await Coupon.find().populate('productIds', 'name price category image').sort({ expiryDate: 1, code: 1 });
  send(res, 'coupons', coupons);
}));

router.post('/coupons', asyncHandler(async (req, res) => {
  const payload = {
    ...req.body,
    startDate: req.body.startDate || null,
    expiryDate: req.body.expiryDate || new Date()
  };
  const coupon = await Coupon.create(payload);
  send(res, 'coupon', coupon, 201);
}));

router.patch('/coupons/:id', asyncHandler(async (req, res) => {
  const payload = {
    ...req.body,
    startDate: req.body.startDate || null
  };
  const coupon = await Coupon.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });
  send(res, 'coupon', coupon);
}));

router.delete('/coupons/:id', asyncHandler(async (req, res) => {
  await Coupon.findByIdAndDelete(req.params.id);
  res.status(204).json({ status: 'success', data: null });
}));

router.get('/settings', asyncHandler(async (req, res) => {
  const bakery = await Setting.findOne({ key: 'bakery' });
  const delivery = await getDeliverySettings();
  send(res, 'settings', {
    bakery: bakery?.value || {
      name: 'SR Bakery',
      phone: '',
      email: '',
      address: '',
      workingHours: '8:00 AM - 10:00 PM'
    },
    delivery
  });
}));

router.patch('/settings', asyncHandler(async (req, res) => {
  const { bakery, delivery } = req.body;
  if (bakery) {
    await Setting.findOneAndUpdate(
      { key: 'bakery' },
      { key: 'bakery', value: bakery },
      { upsert: true, new: true }
    );
  }
  if (delivery) {
    await updateDeliverySettings(delivery);
  }
  const bakeryDoc = await Setting.findOne({ key: 'bakery' });
  const deliverySettings = await getDeliverySettings();
  send(res, 'settings', { bakery: bakeryDoc?.value || {}, delivery: deliverySettings });
}));

router.get('/roles', asyncHandler(async (req, res) => {
  const roles = await RolePermission.find().sort({ name: 1 });
  send(res, 'roles', roles);
}));

router.post('/roles', asyncHandler(async (req, res) => {
  const role = await RolePermission.create(req.body);
  send(res, 'role', role, 201);
}));

router.patch('/roles/:id', asyncHandler(async (req, res) => {
  const role = await RolePermission.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  send(res, 'role', role);
}));

router.delete('/roles/:id', asyncHandler(async (req, res) => {
  await RolePermission.findByIdAndDelete(req.params.id);
  res.status(204).json({ status: 'success', data: null });
}));

export default router;
