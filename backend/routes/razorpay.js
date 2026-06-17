import express from 'express';
import Order from '../models/Order.js';
import Invoice from '../models/Invoice.js';
import crypto from 'crypto';

const router = express.Router();

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

// CREATE RAZORPAY ORDER (Mock)
router.post('/create-order', async (req, res) => {
  try {
    const { amount, currency = 'INR', orderId } = req.body;

    if (!amount || !orderId) {
      return res.status(400).json({ message: 'amount and orderId required' });
    }

    // Generate mock Razorpay order ID
    const mockRazorpayOrderId = `order_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    res.status(200).json({
      status: 'success',
      data: {
        razorpayOrderId: mockRazorpayOrderId,
        keyId: RAZORPAY_KEY_ID,
        amount: amount * 100, // in paise
        currency: currency,
        customerId: `cust_${Date.now()}`,
        description: `Order #${orderId}`,
        // Frontend will use these for payment gateway simulation
        testCardNumber: '4111111111111111',
        testOTP: '123456',
        testCVV: '123'
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error creating Razorpay order', error: error.message });
  }
});

// VERIFY RAZORPAY PAYMENT (Mock)
router.post('/verify-payment', async (req, res) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, orderId } = req.body;

    if (!razorpayOrderId || !razorpayPaymentId) {
      return res.status(400).json({ message: 'razorpayOrderId and razorpayPaymentId required' });
    }

    // Mock signature verification (in real Razorpay, this uses HMAC)
    // For demo, we'll simulate success if all params are present
    const generatedSignature = crypto
      .createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    // Mock verification (always passes for development)
    const isValid = true; // In production, compare with razorpaySignature

    if (!isValid) {
      return res.status(400).json({ message: 'Payment verification failed' });
    }

    // Update order payment status
    const order = await Order.findById(orderId);
    if (order) {
      order.razorpayOrderId = razorpayOrderId;
      order.razorpayPaymentId = razorpayPaymentId;
      order.paymentStatus = 'Paid';
      await order.save();
      await Invoice.findOneAndUpdate({ orderId: order._id }, { paymentStatus: 'Paid', paymentMethod: 'razorpay' });
    }

    res.status(200).json({
      status: 'success',
      message: 'Payment verified successfully (Mock)',
      data: {
        orderId,
        razorpayOrderId,
        razorpayPaymentId,
        paymentStatus: 'Paid',
        amount: order?.totalAmount || 0
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Payment verification error', error: error.message });
  }
});

// REFUND ORDER (Mock)
router.post('/refund', async (req, res) => {
  try {
    const { razorpayPaymentId, amount, orderId } = req.body;

    if (!razorpayPaymentId || !amount) {
      return res.status(400).json({ message: 'razorpayPaymentId and amount required' });
    }

    const mockRefundId = `rfnd_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    // Update order status to refunded
    if (orderId) {
      const order = await Order.findByIdAndUpdate(
        orderId,
        { paymentStatus: 'Refunded', status: 'Cancelled' },
        { new: true }
      );
      if (order) {
        await Invoice.findOneAndUpdate({ orderId: order._id }, { paymentStatus: 'Refunded' });
      }
    }

    res.status(200).json({
      status: 'success',
      message: 'Refund processed (Mock)',
      data: {
        refundId: mockRefundId,
        razorpayPaymentId,
        amount,
        currency: 'INR',
        status: 'processed'
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Refund error', error: error.message });
  }
});

// GET PAYMENT STATUS
router.get('/payment-status/:razorpayPaymentId', async (req, res) => {
  try {
    const { razorpayPaymentId } = req.params;

    // Mock payment status response
    res.status(200).json({
      status: 'success',
      data: {
        razorpayPaymentId,
        paymentStatus: 'captured',
        amount: 5000, // in paise
        currency: 'INR',
        method: 'card',
        description: 'SR Bakery Order Payment',
        createdAt: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching payment status', error: error.message });
  }
});

export default router;
