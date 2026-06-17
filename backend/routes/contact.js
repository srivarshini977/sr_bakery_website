import express from 'express';
import ContactSubmission from '../models/ContactSubmission.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { protect, restrictTo } from '../middleware/auth.js';

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { kind, name, email, phone, subject, rating, message } = req.body;
    if (!kind || !name || !message) {
      return res.status(400).json({ message: 'kind, name and message are required' });
    }

    const submission = await ContactSubmission.create({
      kind,
      name,
      email: email || '',
      phone: phone || '',
      subject: subject || '',
      rating: kind === 'feedback' ? Number(rating || 5) : null,
      message
    });

    const admins = await User.find({ role: 'admin' }, '_id');
    if (admins.length > 0) {
      await Notification.insertMany(admins.map((admin) => ({
        user: admin._id,
        title: kind === 'feedback' ? 'New customer feedback' : 'New contact message',
        message: `${name} sent ${subject || kind}.`,
        type: 'system'
      })));
    }

    res.status(201).json({ status: 'success', data: { submission } });
  } catch (error) {
    res.status(500).json({ message: 'Error saving contact submission', error: error.message });
  }
});

router.get('/', protect, restrictTo('admin'), async (req, res) => {
  try {
    const submissions = await ContactSubmission.find().sort({ createdAt: -1 }).limit(100);
    res.status(200).json({ status: 'success', results: submissions.length, data: { submissions } });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching contact submissions', error: error.message });
  }
});

router.patch('/:id/read', protect, restrictTo('admin'), async (req, res) => {
  try {
    const submission = await ContactSubmission.findByIdAndUpdate(
      req.params.id,
      { status: 'read' },
      { new: true }
    );
    res.status(200).json({ status: 'success', data: { submission } });
  } catch (error) {
    res.status(500).json({ message: 'Error updating contact submission', error: error.message });
  }
});

router.patch('/:id/unread', protect, restrictTo('admin'), async (req, res) => {
  try {
    const submission = await ContactSubmission.findByIdAndUpdate(
      req.params.id,
      { status: 'new' },
      { new: true }
    );
    res.status(200).json({ status: 'success', data: { submission } });
  } catch (error) {
    res.status(500).json({ message: 'Error updating contact submission', error: error.message });
  }
});

router.delete('/:id', protect, restrictTo('admin'), async (req, res) => {
  try {
    await ContactSubmission.findByIdAndDelete(req.params.id);
    res.status(204).json({ status: 'success', data: null });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting contact submission', error: error.message });
  }
});

export default router;
