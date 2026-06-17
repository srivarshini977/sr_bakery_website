import express from 'express';
import Product from '../models/Product.js';
import User from '../models/User.js';
import { protect, restrictTo } from '../middleware/auth.js';

const router = express.Router();
router.use(protect, restrictTo('customer'));

const populateWishlist = (query) => query.populate('wishlist', 'name category price image description inStock stock');

router.get('/', async (req, res) => {
  try {
    const user = await populateWishlist(User.findById(req.user._id));
    res.status(200).json({
      status: 'success',
      results: user.wishlist.length,
      data: { wishlist: user.wishlist }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error loading wishlist', error: error.message });
  }
});

router.get('/count', async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('wishlist');
    res.status(200).json({
      status: 'success',
      data: { count: user.wishlist.length }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error loading wishlist count', error: error.message });
  }
});

router.post('/add', async (req, res) => {
  try {
    const { productId } = req.body;
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { wishlist: product._id }
    });

    const user = await populateWishlist(User.findById(req.user._id));
    res.status(200).json({
      status: 'success',
      message: 'Added to Wishlist',
      data: {
        wishlist: user.wishlist,
        count: user.wishlist.length
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error adding to wishlist', error: error.message });
  }
});

router.delete('/remove/:id', async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { wishlist: req.params.id }
    });

    const user = await populateWishlist(User.findById(req.user._id));
    res.status(200).json({
      status: 'success',
      message: 'Removed from Wishlist',
      data: {
        wishlist: user.wishlist,
        count: user.wishlist.length
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error removing from wishlist', error: error.message });
  }
});

export default router;
