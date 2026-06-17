import express from 'express';
import Product from '../models/Product.js';
import Setting from '../models/Setting.js';
import { protect, restrictTo } from '../middleware/auth.js';
import { srBakeryCategoryOrder, srBakeryMenuNames } from '../data/srBakeryMenu.js';
import { getActiveCoupons, withProductOffer } from '../utils/offers.js';

const router = express.Router();

// GET ALL PRODUCTS WITH FILTERS AND SEARCH
router.get('/', async (req, res) => {
  try {
    const { category, search } = req.query;
    let query = {};

    if (category && category !== 'All') {
      query.category = category;
    }

    if (search) {
      query.$and = [{ name: { $regex: search, $options: 'i' } }];
    }

    const coupons = await getActiveCoupons();
    const products = await Product.find(query);
    const orderedProducts = products.sort((a, b) => {
      const categoryA = srBakeryCategoryOrder.indexOf(a.category);
      const categoryB = srBakeryCategoryOrder.indexOf(b.category);
      const categoryDiff = (categoryA === -1 ? 999 : categoryA) - (categoryB === -1 ? 999 : categoryB);
      if (categoryDiff !== 0) return categoryDiff;
      const nameA = srBakeryMenuNames.indexOf(a.name);
      const nameB = srBakeryMenuNames.indexOf(b.name);
      return (nameA === -1 ? 9999 : nameA) - (nameB === -1 ? 9999 : nameB) || a.name.localeCompare(b.name);
    });
    const pricedProducts = orderedProducts.map((product) => withProductOffer(product, coupons));
    res.status(200).json({ status: 'success', results: pricedProducts.length, data: { products: pricedProducts } });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving products', error: error.message });
  }
});

router.get('/dynamic/featured', async (req, res) => {
  try {
    const coupons = await getActiveCoupons();
    const todaySpecialSetting = await Setting.findOne({ key: 'todaySpecial' });
    const todaySpecial = todaySpecialSetting?.value || {};
    const products = await Product.find({
      inStock: true
    }).sort({ stock: -1, createdAt: -1 });
    const pricedProducts = products.map((product) => withProductOffer(product, coupons));

    const byCategory = [];
    srBakeryCategoryOrder.forEach((category) => {
      const item = pricedProducts.find((product) => product.category === category);
      if (item && byCategory.length < 3) byCategory.push(item);
    });

    if (todaySpecial.active && todaySpecial.productId) {
      const selectedSpecial = await Product.findById(todaySpecial.productId);
      if (selectedSpecial) {
        const specialProduct = withProductOffer(selectedSpecial, coupons);
        const decoratedSpecial = {
          ...specialProduct,
          specialTitle: todaySpecial.title || specialProduct.name,
          specialDescription: todaySpecial.description || specialProduct.description,
          specialImage: todaySpecial.image || specialProduct.image
        };
        const withoutDuplicate = byCategory.filter((product) => product._id.toString() !== specialProduct._id.toString());
        const featured = [decoratedSpecial, ...withoutDuplicate].slice(0, 3);
        return res.status(200).json({ status: 'success', data: { products: featured } });
      }
    }

    res.status(200).json({ status: 'success', data: { products: byCategory } });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving featured products', error: error.message });
  }
});

router.get('/dynamic/offers', async (req, res) => {
  try {
    const coupons = await getActiveCoupons();
    const products = await Product.find({
      inStock: true
    }).sort({ price: 1 });
    const pricedProducts = products.map((product) => withProductOffer(product, coupons));
    const couponOffers = coupons.map((coupon) => {
      const matchedProducts = pricedProducts.filter((product) =>
        coupon.productIds?.some((id) => id.toString() === product._id.toString())
      );
      if (matchedProducts.length === 0) return null;
      const originalTotal = matchedProducts.reduce((sum, product) => sum + Number(product.originalPrice || product.price || 0), 0);
      const offerTotal = matchedProducts.reduce((sum, product) => sum + Number(product.price || 0), 0);
      return {
        _id: coupon._id,
        title: coupon.title || coupon.occasion || coupon.code,
        code: coupon.code,
        occasion: coupon.occasion,
        description: coupon.description || `${coupon.code} is live today on selected menu items.`,
        price: offerTotal,
        originalPrice: originalTotal,
        expiryDate: coupon.expiryDate,
        productIds: matchedProducts.map((product) => product._id),
        products: matchedProducts.map((product) => ({
          _id: product._id,
          name: product.name,
          price: product.price,
          originalPrice: product.originalPrice || product.price
        }))
      };
    }).filter(Boolean);

    res.status(200).json({ status: 'success', data: { offers: couponOffers } });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving offers', error: error.message });
  }
});

// GET SINGLE PRODUCT
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.status(200).json({ status: 'success', data: { product } });
  } catch (error) {
    res.status(500).json({ message: 'Error retrieving product', error: error.message });
  }
});

// CREATE PRODUCT (Admin only)
router.post('/', protect, restrictTo('admin'), async (req, res) => {
  try {
    const { name, price, category, description, stock, lowStockThreshold, productionCost, image } = req.body;
    const newProduct = await Product.create({
      name,
      price,
      category,
      description,
      stock,
      lowStockThreshold,
      productionCost,
      image: image || undefined
    });
    res.status(201).json({ status: 'success', data: { product: newProduct } });
  } catch (error) {
    res.status(500).json({ message: 'Error creating product', error: error.message });
  }
});

// UPDATE PRODUCT (Admin only)
router.patch('/:id', protect, restrictTo('admin'), async (req, res) => {
  try {
    const updatedProduct = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    if (!updatedProduct) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.status(200).json({ status: 'success', data: { product: updatedProduct } });
  } catch (error) {
    res.status(500).json({ message: 'Error updating product', error: error.message });
  }
});

// DELETE PRODUCT (Admin only)
router.delete('/:id', protect, restrictTo('admin'), async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.status(204).json({ status: 'success', data: null });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting product', error: error.message });
  }
});

// TOGGLE STOCK STATE INSTANTLY (Admin only)
router.patch('/:id/toggle-stock', protect, restrictTo('admin'), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    product.inStock = !product.inStock;
    await product.save();
    res.status(200).json({ status: 'success', data: { product } });
  } catch (error) {
    res.status(500).json({ message: 'Error toggling product stock state', error: error.message });
  }
});

export default router;
