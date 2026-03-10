const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');
const { authMiddleware } = require('../middleware/auth');
const { essentialItems } = require('../utils/reminders');
const financeController = require('../controllers/financeController');
const validOrderNotesPattern = /^[a-zA-Z0-9\s.,!?\-'"()/:&]*$/;

const isMeaningfulOrderNote = (note) => {
  const normalizedNote = note.trim().toLowerCase();
  const words = normalizedNote.split(/\s+/).filter(Boolean);
  const hasAtLeastTwoWords = words.length >= 2;
  const hasUsefulLength = normalizedNote.length >= 5;
  const hasOnlyOneRepeatedCharacter = /^([a-z])\1+$/.test(normalizedNote.replace(/\s/g, ''));

  // Check if text has reasonable vowel/consonant distribution (not random gibberish)
  const vowelCount = (normalizedNote.match(/[aeiou]/g) || []).length;
  const letterCount = (normalizedNote.match(/[a-z]/g) || []).length;
  const hasReasonableVowels = letterCount > 0 && (vowelCount / letterCount) >= 0.15 && (vowelCount / letterCount) <= 0.7;

  return hasUsefulLength && hasAtLeastTwoWords && !hasOnlyOneRepeatedCharacter && hasReasonableVowels;
};

const getDatePart = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
};

const getDayRange = (date) => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);

  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  return { start, end };
};

const generateOrderId = async () => {
  const now = new Date();
  const datePart = getDatePart(now);
  const { start, end } = getDayRange(now);

  const todaysOrderCount = await Order.countDocuments({
    createdAt: { $gte: start, $lte: end },
  });

  let sequence = todaysOrderCount + 1;
  let readableOrderId = `ORD${datePart}${String(sequence).padStart(3, '0')}`;

  while (await Order.exists({ orderId: readableOrderId })) {
    sequence += 1;
    readableOrderId = `ORD${datePart}${String(sequence).padStart(3, '0')}`;
  }

  return readableOrderId;
};

// Create order
router.post('/create', authMiddleware, async (req, res) => {
  try {
    const { shippingAddress, paymentMethod, notes } = req.body;
    const sanitizedNotes = typeof notes === 'string' ? notes.trim() : '';

    if (!sanitizedNotes) {
      return res.status(400).json({ message: 'Special instructions are required.' });
    }

    if (sanitizedNotes.length > 500) {
      return res.status(400).json({ message: 'Special instructions are invalid. Maximum 500 characters allowed.' });
    }

    if (sanitizedNotes && !validOrderNotesPattern.test(sanitizedNotes)) {
      return res.status(400).json({
        message: 'Special instructions are invalid. Use only letters, numbers, spaces, and basic punctuation.',
      });
    }

    if (!isMeaningfulOrderNote(sanitizedNotes)) {
      return res.status(400).json({ message: 'Invalid order note. Please enter a valid order note.' });
    }

    const cart = await Cart.findOne({ userId: req.userId }).populate('items.productId');
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: 'Cart is empty' });
    }

    // Recalculate line items and total amount so that:
    // - Only up to the remaining daily-deal quantity is charged at the
    //   discounted price
    // - Any extra quantity for the same product in this order is billed
    //   at the normal/original price
    const dailyDealUsageByProduct = new Map(); // productId -> discounted units used in this order

    const recalculatedItems = [];
    let recalculatedTotalAmount = 0;

    for (const cartItem of cart.items) {
      const productDoc = cartItem.productId;
      const productIdStr = productDoc._id.toString();
      const quantity = cartItem.quantity;

      let discountedUnits = 0;
      let dealPricePerUnit;
      let normalPricePerUnit;

      const hasOriginalPrice =
        typeof productDoc.originalPrice === 'number' && productDoc.originalPrice > 0;

      if (
        productDoc.isDailyDeal &&
        typeof productDoc.dailyDealRemaining === 'number' &&
        productDoc.dailyDealRemaining > 0
      ) {
        const availableForThisOrder = productDoc.dailyDealRemaining;
        discountedUnits = Math.min(quantity, availableForThisOrder);

        dealPricePerUnit = hasOriginalPrice
          ? productDoc.originalPrice / 2
          : productDoc.price;
        normalPricePerUnit = hasOriginalPrice
          ? productDoc.originalPrice
          : productDoc.price;

        const prevUsed = dailyDealUsageByProduct.get(productIdStr) || 0;
        dailyDealUsageByProduct.set(productIdStr, prevUsed + discountedUnits);
      } else {
        discountedUnits = 0;
        normalPricePerUnit = hasOriginalPrice
          ? productDoc.originalPrice
          : productDoc.price;
        dealPricePerUnit = normalPricePerUnit;
      }

      const regularUnits = quantity - discountedUnits;
      const lineTotal = discountedUnits * dealPricePerUnit + regularUnits * normalPricePerUnit;
      recalculatedTotalAmount += lineTotal;

      const effectiveUnitPrice = lineTotal / quantity;

      recalculatedItems.push({
        productId: productDoc._id,
        name: productDoc.name,
        quantity,
        price: Number(effectiveUnitPrice.toFixed(2)),
      });
    }

    let order;
    let isSaved = false;
    let attempts = 0;

    while (!isSaved && attempts < 3) {
      attempts += 1;
      const readableOrderId = await generateOrderId();

      order = new Order({
        orderId: readableOrderId,
        userId: req.userId,
        items: recalculatedItems,
        shippingAddress,
        totalAmount: Number(recalculatedTotalAmount.toFixed(2)),
        paymentMethod,
        paymentStatus: 'pending',
        status: 'pending',
        notes: sanitizedNotes,
      });

      try {
        await order.save();
        isSaved = true;
      } catch (saveError) {
        if (saveError.code !== 11000 || attempts >= 3) {
          throw saveError;
        }
      }
    }

    // Automatically record income in Finance module
    try {
      await financeController.recordIncome(
        order._id,
        order.totalAmount,
        order.paymentMethod
      );
    } catch (financeError) {
      console.error('Failed to record income:', financeError);
      // Don't fail the order if finance recording fails
    }

    // Update daily deal remaining counts immediately when the order is created
    // so customers see the reduced offer count on the home page.
    try {
      for (const [productId, discountedUnits] of dailyDealUsageByProduct.entries()) {
        if (!discountedUnits || discountedUnits <= 0) continue;

        const product = await Product.findById(productId);
        if (!product) continue;

        if (typeof product.dailyDealRemaining === 'number') {
          product.dailyDealRemaining = Math.max(0, product.dailyDealRemaining - discountedUnits);

          // When all 10 discounted units are sold, end the deal and
          // restore the original price for future customers.
          if (product.dailyDealRemaining <= 0) {
            product.isDailyDeal = false;

            if (typeof product.originalPrice === 'number' && product.originalPrice > 0) {
              product.price = product.originalPrice;
            }
          }

          await product.save();
        }
      }
    } catch (dealError) {
      console.error('Failed to update daily deal counts:', dealError);
      // Do not fail order creation if this logic has an issue
    }

    await Cart.findOneAndUpdate({ userId: req.userId }, { items: [], totalPrice: 0, totalItems: 0 });

    res.status(201).json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get user orders
router.get('/', authMiddleware, async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.userId });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single order
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Cancel order - only allowed before approval (pending status)
router.post('/cancel/:orderId', authMiddleware, async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.orderId, userId: req.userId });
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if order is still in pending status
    if (order.status !== 'pending') {
      return res.status(400).json({ 
        message: `Cannot cancel order. Order is already ${order.status}. Orders can only be cancelled before approval.` 
      });
    }

    // Update order status to cancelled
    order.status = 'cancelled';
    order.paymentStatus = 'failed';
    await order.save();

    res.json({ 
      message: 'Order cancelled successfully',
      order 
    });
  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({ message: 'Error cancelling order: ' + error.message });
  }
});

// Reorder from previous order
router.post('/reorder/:orderId', authMiddleware, async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.orderId, userId: req.userId });
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Get or create cart
    let cart = await Cart.findOne({ userId: req.userId });
    if (!cart) {
      cart = new Cart({ userId: req.userId, items: [] });
    }

    // Add all items from order to cart
    let addedCount = 0;
    let unavailableItems = [];

    for (const orderItem of order.items) {
      const product = await Product.findById(orderItem.productId);
      
      if (!product) {
        unavailableItems.push(orderItem.name);
        continue;
      }

      // Check if product has stock
      if (product.stock <= 0) {
        unavailableItems.push(`${orderItem.name} (out of stock)`);
        continue;
      }

      const itemIndex = cart.items.findIndex(item => item.productId.toString() === orderItem.productId.toString());
      
      if (itemIndex > -1) {
        cart.items[itemIndex].quantity += orderItem.quantity;
      } else {
        cart.items.push({
          productId: orderItem.productId,
          quantity: orderItem.quantity,
          price: product.price,
        });
      }
      addedCount++;
    }

    // Recalculate cart totals
    cart.totalItems = cart.items.reduce((total, item) => total + item.quantity, 0);
    cart.totalPrice = cart.items.reduce((total, item) => total + item.price * item.quantity, 0);

    await cart.save();

    res.json({
      message: 'Items added to cart successfully',
      addedCount,
      unavailableItems,
      cart
    });
  } catch (error) {
    console.error('Reorder error:', error);
    res.status(500).json({ message: 'Error processing reorder: ' + error.message });
  }
});

// Get grocery reminders for user
router.get('/reminders/check', authMiddleware, async (req, res) => {
  try {
    // Get user's last order
    const lastOrder = await Order.findOne({ userId: req.userId })
      .sort({ createdAt: -1 });

    if (!lastOrder) {
      // No orders yet - remind to place first order
      return res.json({
        shouldRemind: true,
        reminders: [
          {
            id: 'first-order',
            type: 'first-order',
            emoji: '🛒',
            message: 'Welcome! Place your first order and start shopping.',
            shortMessage: 'Place your first order',
            daysOverdue: 0
          }
        ]
      });
    }

    // Calculate days since last order
    const today = new Date();
    const lastOrderDate = new Date(lastOrder.createdAt);
    const daysSinceOrder = Math.floor((today - lastOrderDate) / (1000 * 60 * 60 * 24));

    // Check which items were in the last order
    const lastOrderItemNames = lastOrder.items.map(item => item.name.toLowerCase());

    // Find reminders for items that should be restocked
    const reminders = essentialItems
      .filter(category => {
        // Check if any item from this category was in the last order
        const hasItemInOrder = category.items.some(item =>
          lastOrderItemNames.some(orderItem => orderItem.includes(item))
        );
        
        // Only remind if item was ordered AND enough days have passed
        return hasItemInOrder && daysSinceOrder >= category.frequency;
      })
      .map(category => ({
        id: category.id,
        type: 'restock',
        emoji: category.emoji,
        message: category.message,
        shortMessage: category.shortMessage,
        daysOverdue: daysSinceOrder - category.frequency,
        daysFrequency: category.frequency
      }));

    // Also check for general reminder if > 10 days since last order
    if (daysSinceOrder > 10 && reminders.length === 0) {
      reminders.push({
        id: 'general',
        type: 'general',
        emoji: '🛒',
        message: `It's been ${daysSinceOrder} days since your last order. Time to restock!`,
        shortMessage: 'Time to restock',
        daysOverdue: daysSinceOrder - 10
      });
    }

    res.json({
      shouldRemind: reminders.length > 0,
      reminders,
      lastOrderDate: lastOrderDate,
      daysSinceOrder
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Submit feedback for an order
router.post('/:orderId/feedback', authMiddleware, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { rating, comment } = req.body;

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    // Find order
    const order = await Order.findById(orderId);
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if order belongs to user
    if (order.userId.toString() !== req.userId) {
      return res.status(403).json({ message: 'Not authorized to provide feedback for this order' });
    }

    // Check if order is delivered
    if (order.status !== 'delivered') {
      return res.status(400).json({ message: 'Feedback can only be submitted for delivered orders' });
    }

    // Update feedback
    order.feedback = {
      rating: parseInt(rating),
      comment: comment || '',
      submittedAt: new Date()
    };

    await order.save();

    res.json({
      message: 'Thank you for your feedback!',
      order
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Submit feedback for a specific product in an order
router.post('/:orderId/product-feedback/:productId', authMiddleware, async (req, res) => {
  try {
    const { orderId, productId } = req.params;
    const { rating, comment } = req.body;
    const parsedRating = parseInt(rating, 10);
    const normalizedComment = typeof comment === 'string' ? comment.trim() : '';

    // Validate rating
    if (!parsedRating || parsedRating < 1 || parsedRating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    // Find order
    const order = await Order.findById(orderId);
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if order belongs to user
    if (order.userId.toString() !== req.userId) {
      return res.status(403).json({ message: 'Not authorized to provide feedback for this order' });
    }

    // Check if order is delivered
    if (order.status !== 'delivered') {
      return res.status(400).json({ message: 'Product feedback can only be submitted for delivered orders' });
    }

    // Find the product in the order items
    const productItem = order.items.find(item => item.productId.toString() === productId);
    
    if (!productItem) {
      return res.status(404).json({ message: 'Product not found in this order' });
    }

    // Update product feedback
    productItem.feedback = {
      rating: parsedRating,
      comment: normalizedComment,
      submittedAt: new Date()
    };

    // Also update product-level reviews and aggregate rating
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const existingReviewIndex = product.reviews.findIndex(
      (review) => review.userId && review.userId.toString() === req.userId
    );

    const reviewPayload = {
      userId: req.userId,
      rating: parsedRating,
      comment: normalizedComment,
      date: new Date(),
    };

    if (existingReviewIndex >= 0) {
      product.reviews[existingReviewIndex] = {
        ...product.reviews[existingReviewIndex].toObject(),
        ...reviewPayload,
      };
    } else {
      product.reviews.push(reviewPayload);
    }

    const totalRatings = product.reviews.reduce((sum, review) => sum + (review.rating || 0), 0);
    product.rating = product.reviews.length > 0
      ? Number((totalRatings / product.reviews.length).toFixed(1))
      : 0;

    await order.save();
    await product.save();

    res.json({
      message: 'Thank you for your product feedback!',
      order
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
