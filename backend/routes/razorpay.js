import crypto from 'crypto';
import express from 'express';
import Invoice from '../models/Invoice.js';
import Order from '../models/Order.js';
import { protect, restrictTo } from '../middleware/auth.js';
import { createOrderFromPayload } from '../utils/orderCreation.js';

const router = express.Router();

const getCredentials = () => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    const error = new Error('Razorpay credentials are missing. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in backend/.env.');
    error.statusCode = 500;
    throw error;
  }
  return { keyId, keySecret };
};

const razorpayRequest = async (path, options = {}) => {
  const { keyId, keySecret } = getCredentials();
  const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
  const response = await fetch(`https://api.razorpay.com/v1${path}`, {
    ...options,
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error?.description || 'Razorpay request failed');
    error.statusCode = response.status;
    error.data = data;
    throw error;
  }
  return data;
};

router.post('/create-order', protect, restrictTo('customer'), async (req, res) => {
  try {
    const amount = Number(req.body.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({ message: 'Valid payment amount is required' });
    }

    const { keyId } = getCredentials();
    const razorpayOrder = await razorpayRequest('/orders', {
      method: 'POST',
      body: JSON.stringify({
        amount: Math.round(amount * 100),
        currency: req.body.currency || 'INR',
        receipt: `sr_${Date.now()}`,
        payment_capture: 1,
        notes: {
          source: 'sr_bakery_checkout',
          userId: req.user._id.toString()
        }
      })
    });

    res.status(201).json({
      status: 'success',
      data: {
        keyId,
        razorpayOrder,
        razorpayOrderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency
      }
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      message: error.message || 'Unable to create Razorpay order',
      data: error.data
    });
  }
});

router.post('/verify-payment', protect, restrictTo('customer'), async (req, res) => {
  try {
    const {
      orderPayload
    } = req.body;
    const razorpayOrderId = req.body.razorpay_order_id || req.body.razorpayOrderId;
    const razorpayPaymentId = req.body.razorpay_payment_id || req.body.razorpayPaymentId;
    const razorpaySignature = req.body.razorpay_signature || req.body.razorpaySignature;

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature || !orderPayload) {
      return res.status(400).json({ message: 'Payment verification details are required' });
    }

    const existingOrder = await Order.findOne({
      $or: [
        { razorpayOrderId },
        { razorpayPaymentId }
      ]
    });
    if (existingOrder) {
      return res.status(409).json({ message: 'This payment has already been used for an order' });
    }

    const { keySecret } = getCredentials();
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    if (expectedSignature !== razorpaySignature) {
      return res.status(400).json({ message: 'Invalid Razorpay payment signature' });
    }

    const payment = await razorpayRequest(`/payments/${razorpayPaymentId}`, { method: 'GET' });
    if (payment.order_id !== razorpayOrderId || payment.status !== 'captured') {
      return res.status(400).json({ message: 'Razorpay payment is not captured yet', data: { paymentStatus: payment.status } });
    }

    const payload = {
      ...orderPayload,
      userId: req.user._id,
      paymentMethod: 'razorpay'
    };
    const expectedAmount = Math.round(Number(payload.totalAmount || 0) * 100);
    if (expectedAmount > 0 && Number(payment.amount) !== expectedAmount) {
      return res.status(400).json({ message: 'Paid amount does not match the order total' });
    }

    const { order, invoice } = await createOrderFromPayload(payload, req.app, {
      paymentStatus: 'Paid',
      razorpayOrderId,
      razorpayPaymentId
    });

    res.status(201).json({
      status: 'success',
      data: {
        order,
        invoice,
        paymentStatus: payment.status
      }
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      message: error.message || 'Unable to verify Razorpay payment',
      data: error.data
    });
  }
});

router.post('/payment-failed', protect, restrictTo('customer'), async (req, res) => {
  try {
    const { razorpayOrderId, reason } = req.body;
    const order = razorpayOrderId
      ? await Order.findOneAndUpdate(
        { razorpayOrderId },
        { paymentStatus: 'Failed' },
        { new: true }
      )
      : null;

    if (order) {
      await Invoice.findOneAndUpdate({ orderId: order._id }, { paymentStatus: 'Failed' });
    }

    res.status(200).json({
      status: 'success',
      message: reason || 'Payment failed',
      data: { razorpayOrderId, order, paymentStatus: 'Failed' }
    });
  } catch (error) {
    res.status(500).json({ message: 'Payment failure handling error', error: error.message });
  }
});

router.post('/refund', protect, restrictTo('admin'), async (req, res) => {
  try {
    const { razorpayPaymentId, amount, orderId } = req.body;
    if (!razorpayPaymentId || !amount || !orderId) {
      return res.status(400).json({ message: 'razorpayPaymentId, amount and orderId required' });
    }

    const refund = await razorpayRequest(`/payments/${razorpayPaymentId}/refund`, {
      method: 'POST',
      body: JSON.stringify({ amount: Math.round(Number(amount) * 100) })
    });

    const order = await Order.findByIdAndUpdate(
      orderId,
      { paymentStatus: 'Refunded', status: 'Cancelled' },
      { new: true }
    );
    if (order) {
      await Invoice.findOneAndUpdate({ orderId: order._id }, { paymentStatus: 'Refunded' });
    }

    res.status(200).json({
      status: 'success',
      message: 'Refund processed',
      data: { refund, order }
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message, data: error.data });
  }
});

router.get('/payment-status/:razorpayPaymentId', protect, async (req, res) => {
  try {
    const payment = await razorpayRequest(`/payments/${req.params.razorpayPaymentId}`, { method: 'GET' });
    res.status(200).json({ status: 'success', data: { payment } });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message, data: error.data });
  }
});

export default router;
