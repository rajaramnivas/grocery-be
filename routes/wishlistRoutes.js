const express = require('express');
const router = express.Router();
const Wishlist = require('../models/Wishlist');
const Product = require('../models/Product');
const { authMiddleware } = require('../middleware/auth');

// Get user's wishlist
router.get('/', authMiddleware, async (req, res) => {
  try {
    let wishlist = await Wishlist.findOne({ userId: req.userId }).populate('products.productId');
    
    if (!wishlist) {
      return res.json({ products: [] });
    }

    res.json({ products: wishlist.products });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching wishlist', error: error.message });
  }
});

// Add product to wishlist
router.post('/add/:productId', authMiddleware, async (req, res) => {
  try {
    const { productId } = req.params;

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Find or create wishlist for user
    let wishlist = await Wishlist.findOne({ userId: req.userId });
    
    if (!wishlist) {
      wishlist = new Wishlist({
        userId: req.userId,
        products: [{ productId }]
      });
    } else {
      // Check if product already in wishlist
      const productExists = wishlist.products.some(
        item => item.productId.toString() === productId
      );

      if (productExists) {
        return res.status(400).json({ message: 'Product already in wishlist' });
      }

      wishlist.products.push({ productId });
    }

    await wishlist.save();
    await wishlist.populate('products.productId');
    
    res.status(201).json({ message: 'Added to wishlist', products: wishlist.products });
  } catch (error) {
    res.status(500).json({ message: 'Error adding to wishlist', error: error.message });
  }
});

// Remove product from wishlist
router.delete('/remove/:productId', authMiddleware, async (req, res) => {
  try {
    const { productId } = req.params;

    const wishlist = await Wishlist.findOne({ userId: req.userId });
    
    if (!wishlist) {
      return res.status(404).json({ message: 'Wishlist not found' });
    }

    wishlist.products = wishlist.products.filter(
      item => item.productId.toString() !== productId
    );

    await wishlist.save();
    await wishlist.populate('products.productId');

    res.json({ message: 'Removed from wishlist', products: wishlist.products });
  } catch (error) {
    res.status(500).json({ message: 'Error removing from wishlist', error: error.message });
  }
});

// Clear entire wishlist
router.delete('/clear', authMiddleware, async (req, res) => {
  try {
    await Wishlist.findOneAndDelete({ userId: req.userId });
    res.json({ message: 'Wishlist cleared' });
  } catch (error) {
    res.status(500).json({ message: 'Error clearing wishlist', error: error.message });
  }
});

// Check if product is in wishlist
router.get('/check/:productId', authMiddleware, async (req, res) => {
  try {
    const { productId } = req.params;

    const wishlist = await Wishlist.findOne({ userId: req.userId });
    
    if (!wishlist) {
      return res.json({ inWishlist: false });
    }

    const inWishlist = wishlist.products.some(
      item => item.productId.toString() === productId
    );

    res.json({ inWishlist });
  } catch (error) {
    res.status(500).json({ message: 'Error checking wishlist', error: error.message });
  }
});

module.exports = router;
