const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const Cart = require('../models/Cart');
const ShoppingList = require('../models/ShoppingList');
const { authMiddleware } = require('../middleware/auth');

// Get all active shopping lists
router.get('/', async (req, res) => {
  try {
    const lists = await ShoppingList.find({ isActive: true })
      .populate('products')
      .sort({ displayOrder: 1 });
    
    // Return lists with product count
    const listsWithCount = lists.map(list => ({
      _id: list._id,
      id: list._id,
      name: list.name,
      description: list.description,
      icon: list.icon,
      category: list.category,
      itemCount: list.products.length,
      products: list.products
    }));
    
    res.json(listsWithCount);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get shopping list with products
router.get('/:listId', async (req, res) => {
  try {
    const list = await ShoppingList.findById(req.params.listId).populate('products');
    
    if (!list) {
      return res.status(404).json({ message: 'Shopping list not found' });
    }

    res.json({
      _id: list._id,
      id: list._id,
      name: list.name,
      description: list.description,
      icon: list.icon,
      category: list.category,
      products: list.products
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add selected products from shopping list to cart
router.post('/:listId/add-to-cart', authMiddleware, async (req, res) => {
  try {
    const { selectedProducts } = req.body; // Array of product IDs
    
    const list = await ShoppingList.findById(req.params.listId).populate('products');
    if (!list) {
      return res.status(404).json({ message: 'Shopping list not found' });
    }

    // If no specific products selected, add all available products
    const productsToAdd = selectedProducts && selectedProducts.length > 0 
      ? list.products.filter(p => selectedProducts.includes(p._id.toString()))
      : list.products;

    // Filter out out-of-stock items
    const availableProducts = productsToAdd.filter(p => p.stock > 0);

    if (availableProducts.length === 0) {
      return res.status(400).json({ message: 'No products available in stock' });
    }

    // Get or create cart
    let cart = await Cart.findOne({ userId: req.userId });
    if (!cart) {
      cart = new Cart({ userId: req.userId, items: [] });
    }

    let addedCount = 0;
    
    // Add products to cart
    for (const product of availableProducts) {
      const itemIndex = cart.items.findIndex(item => 
        item.productId.toString() === product._id.toString()
      );
      
      if (itemIndex > -1) {
        cart.items[itemIndex].quantity += 1;
      } else {
        cart.items.push({
          productId: product._id,
          quantity: 1,
          price: product.price,
        });
      }
      addedCount++;
    }

    // Recalculate cart totals
    cart.totalItems = cart.items.reduce((total, item) => total + item.quantity, 0);
    cart.totalPrice = cart.items.reduce((total, item) => total + item.price * item.quantity, 0);

    await cart.save();
    await cart.populate('items.productId');

    res.json({
      message: `${addedCount} items from ${list.name} added to cart`,
      addedCount,
      cart
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
