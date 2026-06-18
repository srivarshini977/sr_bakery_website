import express from 'express';
import Review from '../models/Review.js';
import Order from '../models/Order.js';
import { protect, restrictTo } from '../middleware/auth.js';

const router = express.Router();

const isRealCustomerFeedback = (review) => {
  const text = [
    review.user?.name,
    review.user?.email,
    review.title,
    review.comment
  ].filter(Boolean).join(' ').toLowerCase();

  return !(/\bqa\b|qa customer|qa rating|test customer|dummy|sample/.test(text));
};

router.get('/public', async (req, res) => {
  try {
    const reviews = await Review.find({ approved: true })
      .populate('user', 'name')
      .sort({ createdAt: -1 })
      .limit(50);
    res.status(200).json({
      status: 'success',
      data: { reviews: reviews.filter(isRealCustomerFeedback).slice(0, 12) }
    });
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
      { user: req.user._id, rating: Number(rating), title, comment, approved: false },
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
    res.status(200).json({ status: 'success', data: { reviews: reviews.filter(isRealCustomerFeedback) } });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching reviews', error: error.message });
  }
});

router.patch('/admin/:id/approval', protect, restrictTo('admin'), async (req, res) => {
  try {
    const review = await Review.findByIdAndUpdate(
      req.params.id,
      { approved: Boolean(req.body.approved) },
      { new: true, runValidators: true }
    ).populate('user', 'name email');
    if (!review) return res.status(404).json({ message: 'Feedback not found' });
    res.status(200).json({ status: 'success', data: { review } });
  } catch (error) {
    res.status(500).json({ message: 'Error updating feedback approval', error: error.message });
  }
});

router.delete('/admin/:id', protect, restrictTo('admin'), async (req, res) => {
  try {
    const review = await Review.findByIdAndDelete(req.params.id);
    if (!review) return res.status(404).json({ message: 'Feedback not found' });
    res.status(204).json({ status: 'success', data: null });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting feedback', error: error.message });
  }
});

export default router;
