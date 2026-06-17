import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';
import dotenv from 'dotenv';

dotenv.config();
const router = express.Router();
const JWT_EXPIRES_IN = '7d';

const signToken = (id) => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN
  });
};

// SIGNUP CUSTOMER
router.post('/signup', async (req, res) => {
  try {
    const { name, email, phone, password, address } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Create user (password will be hashed by User model pre-save)
    const newUser = await User.create({
      name,
      email,
      phone,
      password,
      address,
      role: 'customer' // Defaults to customer
    });

    const token = signToken(newUser._id);

    // Hide password
    newUser.password = undefined;

    res.status(201).json({
      status: 'success',
      token,
      data: { user: newUser }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error signing up', error: error.message });
  }
});

// LOGIN
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.correctPassword(password, user.password))) {
      return res.status(401).json({ message: 'Incorrect email or password' });
    }

    const token = signToken(user._id);
    user.password = undefined;

    res.status(200).json({
      status: 'success',
      token,
      data: { user }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error logging in', error: error.message });
  }
});

// GET CURRENT USER PROFILE
router.get('/me', protect, async (req, res) => {
  res.status(200).json({
    status: 'success',
    data: { user: req.user }
  });
});

// UPDATE PROFILE
router.patch('/updateMe', protect, async (req, res) => {
  try {
    const { name, phone, address } = req.body;
    
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { name, phone, address },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      status: 'success',
      data: { user: updatedUser }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating profile', error: error.message });
  }
});

// Backward-compatible profile update endpoint used by the customer dashboard
router.patch('/update/:id', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user._id.toString() !== req.params.id) {
      return res.status(403).json({ message: 'You can only update your own profile' });
    }

    const { name, phone, address } = req.body;
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { name, phone, address },
      { new: true, runValidators: true, select: '-password' }
    );

    res.status(200).json({
      status: 'success',
      data: { user: updatedUser }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating profile', error: error.message });
  }
});

// SIMULATED FORGOT & RESET PASSWORD
const resetTokens = new Map(); // Simple in-memory storage for mock reset codes

router.post('/forgotPassword', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'No user found with that email address.' });
    }

    // Generate simple 6 digit reset code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    resetTokens.set(email, { code: resetCode, expires: Date.now() + 10 * 60 * 1000 }); // 10 mins expiry

    // Send back the code for the mockup
    res.status(200).json({
      status: 'success',
      message: 'Reset code sent to email (simulated).',
      resetCode // Sending it directly back to make testing easy for the user
    });
  } catch (error) {
    res.status(500).json({ message: 'Error processing forgot password request', error: error.message });
  }
});

router.post('/resetPassword', async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    const record = resetTokens.get(email);
    
    if (!record || record.code !== code || record.expires < Date.now()) {
      return res.status(400).json({ message: 'Invalid or expired reset code.' });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(404).json({ message: 'No user found with that email address.' });
    }
    user.password = newPassword;
    await user.save();
    resetTokens.delete(email);

    res.status(200).json({
      status: 'success',
      message: 'Password successfully updated. You can now login.'
    });
  } catch (error) {
    res.status(500).json({ message: 'Error resetting password', error: error.message });
  }
});

export default router;
