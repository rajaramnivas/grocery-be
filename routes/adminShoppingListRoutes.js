const express = require('express');
const router = express.Router();
const ShoppingList = require('../models/ShoppingList');
const Product = require('../models/Product');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// Get all shopping lists (admin view)
router.get('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const lists = await ShoppingList.find().populate('products').sort({ displayOrder: 1 });
    res.json(lists);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single shopping list
router.get('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const list = await ShoppingList.findById(req.params.id).populate('products');
    if (!list) {
      return res.status(404).json({ message: 'Shopping list not found' });
    }
    res.json(list);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create shopping list
router.post('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { name, description, icon, products, category, displayOrder, isActive } = req.body;
    
    const shoppingList = new ShoppingList({
      name,
      description,
      icon,
      products,
      category,
      displayOrder,
      isActive
    });
    
    await shoppingList.save();
    await shoppingList.populate('products');
    res.status(201).json(shoppingList);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update shopping list
router.put('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { name, description, icon, products, category, displayOrder, isActive } = req.body;
    
    const shoppingList = await ShoppingList.findById(req.params.id);
    if (!shoppingList) {
      return res.status(404).json({ message: 'Shopping list not found' });
    }
    
    if (name) shoppingList.name = name;
    if (description) shoppingList.description = description;
    if (icon) shoppingList.icon = icon;
    if (products) shoppingList.products = products;
    if (category) shoppingList.category = category;
    if (displayOrder !== undefined) shoppingList.displayOrder = displayOrder;
    if (isActive !== undefined) shoppingList.isActive = isActive;
    
    await shoppingList.save();
    await shoppingList.populate('products');
    res.json(shoppingList);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Add product to shopping list
router.post('/:id/products/:productId', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const shoppingList = await ShoppingList.findById(req.params.id);
    if (!shoppingList) {
      return res.status(404).json({ message: 'Shopping list not found' });
    }
    
    const product = await Product.findById(req.params.productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    if (!shoppingList.products.includes(req.params.productId)) {
      shoppingList.products.push(req.params.productId);
      await shoppingList.save();
    }
    
    await shoppingList.populate('products');
    res.json(shoppingList);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Remove product from shopping list
router.delete('/:id/products/:productId', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const shoppingList = await ShoppingList.findById(req.params.id);
    if (!shoppingList) {
      return res.status(404).json({ message: 'Shopping list not found' });
    }
    
    shoppingList.products = shoppingList.products.filter(
      p => p.toString() !== req.params.productId
    );
    
    await shoppingList.save();
    await shoppingList.populate('products');
    res.json(shoppingList);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete shopping list
router.delete('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const shoppingList = await ShoppingList.findById(req.params.id);
    if (!shoppingList) {
      return res.status(404).json({ message: 'Shopping list not found' });
    }
    
    await shoppingList.deleteOne();
    res.json({ message: 'Shopping list deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Toggle active status
router.patch('/:id/toggle-active', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const shoppingList = await ShoppingList.findById(req.params.id);
    if (!shoppingList) {
      return res.status(404).json({ message: 'Shopping list not found' });
    }
    
    shoppingList.isActive = !shoppingList.isActive;
    await shoppingList.save();
    await shoppingList.populate('products');
    res.json(shoppingList);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
