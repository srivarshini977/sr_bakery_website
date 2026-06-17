import express from 'express';
import crypto from 'crypto';
import dotenv from 'dotenv';
import Invoice from '../models/Invoice.js';
import Order from '../models/Order.js';
import { protect, restrictTo } from '../middleware/auth.js';
import { createOrderFromPayload } from '../utils/orderCreation.js';

dotenv.config();

const router = express.Router();

const getRazorpayConfig = () => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    const error = new Error('Razorpay credentials are not configured');
    error.statusCode = 500;
    throw error;
  }
  return { keyId, keySecret };
};

const razorpayRequest = async (path, options = {}) => {
  const { keyId, keySecret } = getRazorpayConfig();
  const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
  const response = await fetch(`https://api.razorpay.com/v1${path}`, {
    ...options,
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body.error?.description || body.message || 'Razorpay request failed');
    error.statusCode = response.status;
    error.data = body;
    throw error;
  }
  return body;
};

router.post('/create-order', protect, restrictTo('customer'), async (req, res) => {
  try {
    const { amount, currency = 'INR' } = req.body;
    const payableAmount = Number(amount);
    if (!Number.isFinite(payableAmount) || payableAmount <= 0) {
      return res.status(400).json({ message: 'Valid amount is required' });
    }

    const { keyId } = getRazorpayConfig();
    const amountInPaise = Math.round(payableAmount * 100);
    const razorpayOrder = await razorpayRequest('/orders', {
      method: 'POST',
      body: JSON.stringify({
        amount: amountInPaise,
        currency,
        receipt: `sr_${Date.now()}_${req.user._id.toString().slice(-6)}`,
        payment_capture: 1,
        notes: {
          customerId: req.user._id.toString(),
          source: 'sr-bakery-checkout'
        }
      })
    });

    res.status(200).json({
      status: 'success',
      data: {
        keyId,
        razorpayOrderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        receipt: razorpayOrder.receipt
      }
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message, data: error.data });
  }
});

router.post('/verify-payment', protect, restrictTo('customer'), async (req, res) => {
  try {
    const {
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      orderPayload
    } = req.body;

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature || !orderPayload) {
      return res.status(400).json({ message: 'Payment verification details and order payload are required' });
    }

    const existing = await Order.findOne({
      $or: [
        { razorpayPaymentId },
        { razorpayOrderId, paymentStatus: 'Paid' }
      ]
    }).populate('invoice');
    if (existing) {
      return res.status(200).json({
        status: 'success',
        message: 'Payment already verified',
        data: {
          order: existing,
          invoice: existing.invoice,
          paymentId: razorpayPaymentId
        }
      });
    }

    const { keySecret } = getRazorpayConfig();
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    if (expectedSignature !== razorpaySignature) {
      return res.status(400).json({ message: 'Payment signature verification failed' });
    }

    const gatewayOrder = await razorpayRequest(`/orders/${razorpayOrderId}`, { method: 'GET' });
    const expectedAmount = Math.round(Number(orderPayload.totalAmount || 0) * 100);
    if (gatewayOrder.amount !== expectedAmount) {
      return res.status(400).json({ message: 'Payment amount does not match order total' });
    }

    const payment = await razorpayRequest(`/payments/${razorpayPaymentId}`, { method: 'GET' });
    if (!['captured', 'authorized'].includes(payment.status)) {
      return res.status(400).json({ message: `Payment is ${payment.status}` });
    }

    const { order, invoice } = await createOrderFromPayload({
      ...orderPayload,
      userId: req.user._id,
      paymentMethod: 'razorpay'
    }, req.app, {
      paymentStatus: 'Paid',
      razorpayOrderId,
      razorpayPaymentId
    });

    res.status(200).json({
      status: 'success',
      message: 'Payment Successful',
      data: {
        order,
        invoice,
        paymentId: razorpayPaymentId,
        orderNumber: order._id.toString().slice(-6).toUpperCase()
      }
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message, data: error.data });
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
