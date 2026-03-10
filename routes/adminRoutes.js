const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Order = require('../models/Order');
const User = require('../models/User');
const Bill = require('../models/Bill');
const AccountLedger = require('../models/AccountLedger');
const DailyStats = require('../models/DailyStats');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// Normalize and sanitize product payload coming from the client.
// In particular, make sure that an empty SKU is not stored as null/'' so
// Mongo's unique index on `sku` does not treat multiple products as duplicates.
const normalizeProductPayload = (body) => {
  const data = { ...body };

  if (Object.prototype.hasOwnProperty.call(data, 'sku')) {
    if (typeof data.sku === 'string') {
      const trimmed = data.sku.trim();
      if (!trimmed) {
        delete data.sku;
      } else {
        data.sku = trimmed;
      }
    } else if (data.sku == null) {
      // Explicit null/undefined should behave as "no SKU"
      delete data.sku;
    }
  }

  return data;
};

// Create product
router.post('/products', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const payload = normalizeProductPayload(req.body);
    const product = new Product(payload);
    await product.save();
    res.status(201).json(product);
  } catch (error) {
    // Surface a clearer message for duplicate SKU errors
    if (error.code === 11000 && error.keyPattern && error.keyPattern.sku) {
      return res.status(400).json({ message: 'SKU must be unique. Please use a different SKU or leave it blank.' });
    }
    res.status(500).json({ message: error.message });
  }
});

// Update product
router.put('/products/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const payload = normalizeProductPayload(req.body);
    const product = await Product.findByIdAndUpdate(req.params.id, payload, { new: true });
    res.json(product);
  } catch (error) {
    if (error.code === 11000 && error.keyPattern && error.keyPattern.sku) {
      return res.status(400).json({ message: 'SKU must be unique. Please use a different SKU or leave it blank.' });
    }
    res.status(500).json({ message: error.message });
  }
});

// Update product inventory (stock)
router.patch('/products/:id/inventory', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { stock } = req.body;
    if (stock === undefined || stock < 0) {
      return res.status(400).json({ message: 'Valid stock quantity is required' });
    }
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { stock },
      { new: true }
    );
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete product
router.delete('/products/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await Product.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ message: 'Product deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all orders with full details
router.get('/orders', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const orders = await Order.find()
      .populate('userId', 'name email phone')
      .populate('items.productId', 'name')
      .sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single order details for admin
router.get('/orders/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('userId', 'name email phone')
      .populate('items.productId', 'name image stock');
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update order status and track inventory
router.put('/orders/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    // notes from client are treated as admin-side notes; keep customer notes intact
    const { status, paymentStatus, trackingNumber, notes, adminNotes } = req.body;
    const internalNotes = typeof adminNotes === 'string' ? adminNotes : (typeof notes === 'string' ? notes : '');
    const order = await Order.findById(req.params.id).populate('items.productId').populate('userId');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // If admin approves order (moves from pending to processing), reduce stock
    if (order.status === 'pending' && status === 'processing') {
      for (const item of order.items) {
        const product = await Product.findById(item.productId);
        if (product) {
          if (product.stock < item.quantity) {
            return res.status(400).json({
              message: `Insufficient stock for ${product.name}. Available: ${product.stock}`
            });
          }
          product.stock -= item.quantity;
          await product.save();
        }
      }
    }

    // If order is cancelled, restore stock if it was previously approved
    if (order.status === 'processing' && status === 'cancelled') {
      for (const item of order.items) {
        const product = await Product.findById(item.productId);
        if (product) {
          product.stock += item.quantity;
          await product.save();
        }
      }
    }


    // Daily Profit Calculation: When order is marked as delivered
    if (status === 'delivered' && order.status !== 'delivered') {
      try {
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Normalize to midnight

        for (const item of order.items) {
          const product = await Product.findById(item.productId);

          if (product && product.costPrice !== undefined) {
            const quantitySold = item.quantity;
            const sellingPrice = item.price; // Use price from order item (historical price)
            const costPrice = product.costPrice;

            const revenue = sellingPrice * quantitySold;
            const cost = costPrice * quantitySold;
            const profit = revenue - cost;

            // Update or create DailyStats for this product and date
            await DailyStats.findOneAndUpdate(
              { date: today, productId: product._id },
              {
                $inc: {
                  quantitySold: quantitySold,
                  totalRevenue: revenue,
                  totalCost: cost,
                  totalProfit: profit
                }
              },
              { upsert: true, new: true }
            );
          }
        }
      } catch (statsError) {
        console.error('Error updating daily stats:', statsError);
        // Continue with order update even if stats update fails
      }
    }

    // Auto-generate bill when order is marked as delivered
    if (status === 'delivered' && order.status !== 'delivered' && !order.billId) {
      try {
        const bill = new Bill({
          orderId: order._id,
          userId: order.userId._id,
          items: order.items,
          subtotal: order.totalAmount,
          totalAmount: order.totalAmount,
          shippingAddress: order.shippingAddress,
          paymentMethod: order.paymentMethod,
          paymentStatus: order.paymentStatus,
          customerName: order.userId.name,
          customerEmail: order.userId.email,
          customerPhone: order.userId.phone,
          // Prefer existing customer notes on the order; fall back to admin notes if provided
          notes: order.notes || internalNotes || '',
        });

        await bill.save();

        // Create ledger entry for the bill
        const transactionId = `TXN-${Date.now()}`;
        const ledgerEntry = new AccountLedger({
          transactionId,
          billId: bill._id,
          orderId: order._id,
          userId: order.userId._id,
          transactionType: 'sale',
          description: `Sales Invoice ${bill.billNumber} - Order ${order._id}`,
          debit: order.totalAmount,
          credit: 0,
          amount: order.totalAmount,
          account: 'revenue',
          referenceNumber: bill.billNumber,
          transactionDate: new Date(),
          status: 'completed',
          createdBy: req.user._id,
          notes: `Bill generated for order ${order._id}`,
        });

        await ledgerEntry.save();

        // Update bill with ledger reference
        bill.ledgerEntryId = ledgerEntry._id;
        await bill.save();

        // Update order with bill reference
        order.billId = bill._id;
        order.billGeneratedAt = new Date();
      } catch (billError) {
        console.error('Error generating bill:', billError);
        // Continue with order update even if bill generation fails
      }
    }

    const updatePayload = {
      status,
      paymentStatus,
      trackingNumber,
      billId: order.billId,
      billGeneratedAt: order.billGeneratedAt,
    };

    if (internalNotes) {
      updatePayload.adminNotes = internalNotes;
    }

    const updatedOrder = await Order.findByIdAndUpdate(
      req.params.id,
      updatePayload,
      { new: true }
    ).populate('userId', 'name email phone');

    res.json(updatedOrder);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get users
router.get('/users', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Set product as daily deal (max 5)
router.post('/daily-deals/:productId', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    // Check how many daily deals already exist
    const currentDealsCount = await Product.countDocuments({ isDailyDeal: true });

    const product = await Product.findById(req.params.productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // If product is already a daily deal, allow to toggle it OFF
    if (product.isDailyDeal) {
      // When turning off the deal, restore original price (if present)
      if (typeof product.originalPrice === 'number' && product.originalPrice > 0) {
        product.price = product.originalPrice;
      }

      product.isDailyDeal = false;
      product.dailyDealRemaining = 0;
      await product.save();
      return res.json({ message: 'Product removed from daily deals', product });
    }

    // If trying to add and already have 5, reject
    if (currentDealsCount >= 5) {
      return res.status(400).json({
        message: 'Maximum 5 daily deals allowed. Remove one first.'
      });
    }

    // When enabling as daily deal:
    // - Store the current price as originalPrice (if not already set)
    // - Set the deal price to half of the original price
    // - Give 10 discounted units for today
    if (typeof product.originalPrice !== 'number' || product.originalPrice <= 0) {
      product.originalPrice = product.price;
    }

    const halfPrice = product.originalPrice / 2;
    product.price = halfPrice;
    product.isDailyDeal = true;
    product.dailyDealRemaining = 10;

    await product.save();
    res.json({ message: 'Product added to daily deals with 50% discount for 10 units', product });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all daily deals
router.get('/daily-deals', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const deals = await Product.find({ isDailyDeal: true });
    res.json(deals);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Toggle Organic badge
router.patch('/products/:id/organic', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    product.isOrganic = !product.isOrganic;
    await product.save();
    res.json({
      message: `Product marked as ${product.isOrganic ? 'Organic' : 'Not Organic'}`,
      product
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Toggle Local badge
router.patch('/products/:id/local', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    product.isLocal = !product.isLocal;
    await product.save();
    res.json({
      message: `Product marked as ${product.isLocal ? 'Local Product' : 'Not Local'}`,
      product
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Toggle Fresh Today badge
router.patch('/products/:id/fresh', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    product.isFreshToday = !product.isFreshToday;
    if (product.isFreshToday) {
      product.freshnessDate = new Date();
    } else {
      product.freshnessDate = null;
    }
    await product.save();
    res.json({
      message: `Product marked as ${product.isFreshToday ? 'Fresh Today' : 'Not Fresh Today'}`,
      product
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
