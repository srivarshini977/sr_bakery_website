import express from 'express';
import Review from '../models/Review.js';
import Order from '../models/Order.js';
import { protect, restrictTo } from '../middleware/auth.js';

const router = express.Router();

router.get('/public', async (req, res) => {
  try {
    const reviews = await Review.find({ approved: true })
      .populate('user', 'name')
      .sort({ createdAt: -1 })
      .limit(12);
    res.status(200).json({ status: 'success', data: { reviews } });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching reviews', error: error.message });
  }
});

router.post('/', protect, restrictTo('customer'), async (req, res) => {
  try {
    const { orderId, rating, title, comment } = req.body;
    const order = await Order.findOne({ _id: orderId, user: req.user._id });

    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (order.status !== 'Delivered') {
      return res.status(400).json({ message: 'Reviews are available after delivery only' });
    }

    const review = await Review.findOneAndUpdate(
      { order: order._id },
      { user: req.user._id, rating: Number(rating), title, comment, approved: true },
      { new: true, upsert: true, runValidators: true }
    );

    res.status(201).json({ status: 'success', data: { review } });
  } catch (error) {
    res.status(500).json({ message: 'Error saving review', error: error.message });
  }
});

router.get('/admin', protect, restrictTo('admin'), async (req, res) => {
  try {
    const reviews = await Review.find()
      .populate('user', 'name email')
      .populate('order', 'totalAmount status')
      .sort({ createdAt: -1 })
      .limit(100);
    res.status(200).json({ status: 'success', data: { reviews } });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching reviews', error: error.message });
  }
});

export default router;
