const express = require('express');
const crypto = require('crypto');
const router = express.Router();

const { authMiddleware } = require('../middleware/auth');
const Order = require('../models/Order');
const getRazorpayInstance = require('../config/razorpay');

// Create a Razorpay order for an existing pending order
router.post('/razorpay/create-order', authMiddleware, async (req, res) => {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({ message: 'orderId is required' });
    }

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.userId.toString() !== req.userId) {
      return res.status(403).json({ message: 'Not authorized to pay for this order' });
    }

    if (order.paymentStatus === 'completed') {
      return res.status(400).json({ message: 'Payment already completed for this order' });
    }

    const razorpay = getRazorpayInstance();

    const amountInPaise = Math.round(order.totalAmount * 100);

    const options = {
      amount: amountInPaise,
      currency: 'INR',
      receipt: order.orderId || order._id.toString(),
      notes: {
        internalOrderId: order._id.toString(),
        paymentMethod: order.paymentMethod,
      },
    };

    const razorpayOrder = await razorpay.orders.create(options);

    order.paymentGateway = {
      provider: 'razorpay',
      razorpayOrderId: razorpayOrder.id,
    };
    await order.save();

    return res.json({
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      orderId: order._id,
      razorpayKeyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error('Error creating Razorpay order:', error);
    return res.status(500).json({ message: 'Failed to create Razorpay order' });
  }
});

// Verify Razorpay payment signature and update order status
router.post('/razorpay/verify', authMiddleware, async (req, res) => {
  try {
    const { orderId, razorpayPaymentId, razorpayOrderId, razorpaySignature } = req.body;

    if (!orderId || !razorpayPaymentId || !razorpayOrderId || !razorpaySignature) {
      return res.status(400).json({ message: 'Missing required payment verification fields' });
    }

    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.userId.toString() !== req.userId) {
      return res.status(403).json({ message: 'Not authorized to verify payment for this order' });
    }

    const signBody = `${razorpayOrderId}|${razorpayPaymentId}`;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(signBody)
      .digest('hex');

    if (expectedSignature !== razorpaySignature) {
      order.paymentStatus = 'failed';
      await order.save();
      return res.status(400).json({ message: 'Payment verification failed' });
    }

    order.paymentStatus = 'completed';
    if (order.status === 'pending') {
      order.status = 'processing';
    }

    order.paymentGateway = {
      ...(order.paymentGateway || {}),
      provider: 'razorpay',
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      verifiedAt: new Date(),
    };

    await order.save();

    return res.json({ message: 'Payment verified successfully', order });
  } catch (error) {
    console.error('Error verifying Razorpay payment:', error);
    return res.status(500).json({ message: 'Failed to verify Razorpay payment' });
  }
});

module.exports = router;
