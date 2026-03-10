const express = require('express');
const router = express.Router();
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const Product = require('../models/Product');
const ProductFinance = require('../models/ProductFinance');

// Get financial summary (specific route - must be before :id route)
router.get('/finances/summary/stats', authMiddleware, async (req, res) => {
  try {
    const finances = await ProductFinance.find();
    
    if (finances.length === 0) {
      return res.json({
        totalProducts: 0,
        totalCost: 0,
        totalProfit: 0,
        totalSaleValue: 0,
        averageProfitMargin: 0,
        expiringProducts: 0,
        expiredProducts: 0,
      });
    }
    
    const today = new Date();
    const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    const summary = {
      totalProducts: finances.length,
      totalCost: finances.reduce((sum, f) => sum + f.totalCost, 0),
      totalProfit: finances.reduce((sum, f) => sum + f.totalProfit, 0),
      totalSaleValue: finances.reduce((sum, f) => sum + f.totalSaleValue, 0),
      averageProfitMargin: finances.length > 0
        ? (finances.reduce((sum, f) => sum + parseFloat(f.profitMargin), 0) / finances.length).toFixed(2)
        : 0,
      expiringProducts: finances.filter(f => f.expiryDate >= today && f.expiryDate <= thirtyDaysFromNow).length,
      expiredProducts: finances.filter(f => f.expiryDate < today).length,
      outOfStock: finances.filter(f => f.quantityRemaining === 0).length,
    };
    
    res.json(summary);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching financial summary', error: error.message });
  }
});

// Get all product financial records
router.get('/finances', authMiddleware, async (req, res) => {
  try {
    const { status, productId, sortBy } = req.query;
    
    let query = {};
    
    if (status) {
      query.status = status;
    }
    
    if (productId) {
      query.productId = productId;
    }
    
    let finances = ProductFinance.find(query).populate('productId', 'name category price');
    
    if (sortBy === 'profit') {
      finances = finances.sort({ totalProfit: -1 });
    } else if (sortBy === 'expiry') {
      finances = finances.sort({ expiryDate: 1 });
    } else if (sortBy === 'newest') {
      finances = finances.sort({ createdAt: -1 });
    } else {
      finances = finances.sort({ createdAt: -1 });
    }
    
    const result = await finances;
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching product finances', error: error.message });
  }
});

// Get single product financial record
router.get('/finances/:id', authMiddleware, async (req, res) => {
  try {
    const finance = await ProductFinance.findById(req.params.id).populate('productId');
    
    if (!finance) {
      return res.status(404).json({ message: 'Product finance record not found' });
    }
    
    res.json(finance);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching product finance record', error: error.message });
  }
});

// Create new product finance record
router.post('/finances', authMiddleware, async (req, res) => {
  try {
    const { productId, costPrice, sellingPrice, buyingDate, expiryDate, quantity, supplier, batchNumber, notes } = req.body;
    
    // Verify product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Validate dates
    const buying = new Date(buyingDate);
    const expiry = new Date(expiryDate);
    
    if (expiry <= buying) {
      return res.status(400).json({ message: 'Expiry date must be after buying date' });
    }
    
    const finance = new ProductFinance({
      productId,
      costPrice,
      sellingPrice,
      buyingDate: buying,
      expiryDate: expiry,
      quantity,
      supplier,
      batchNumber,
      notes,
    });
    
    await finance.save();
    
    res.status(201).json({
      message: 'Product finance record created successfully',
      data: finance,
    });
  } catch (error) {
    res.status(400).json({ message: 'Error creating product finance record', error: error.message });
  }
});

// Update product finance record
router.put('/finances/:id', authMiddleware, async (req, res) => {
  try {
    const { costPrice, sellingPrice, buyingDate, expiryDate, quantity, quantitySold, supplier, batchNumber, notes, status } = req.body;
    
    let finance = await ProductFinance.findById(req.params.id);
    
    if (!finance) {
      return res.status(404).json({ message: 'Product finance record not found' });
    }
    
    if (costPrice !== undefined) finance.costPrice = costPrice;
    if (sellingPrice !== undefined) finance.sellingPrice = sellingPrice;
    if (buyingDate !== undefined) finance.buyingDate = new Date(buyingDate);
    if (expiryDate !== undefined) finance.expiryDate = new Date(expiryDate);
    if (quantity !== undefined) finance.quantity = quantity;
    if (quantitySold !== undefined) finance.quantitySold = quantitySold;
    if (supplier !== undefined) finance.supplier = supplier;
    if (batchNumber !== undefined) finance.batchNumber = batchNumber;
    if (notes !== undefined) finance.notes = notes;
    if (status !== undefined) finance.status = status;
    
    await finance.save();
    
    res.json({
      message: 'Product finance record updated successfully',
      data: finance,
    });
  } catch (error) {
    res.status(400).json({ message: 'Error updating product finance record', error: error.message });
  }
});

// Update quantity sold (update sales)
router.patch('/finances/:id/sold', authMiddleware, async (req, res) => {
  try {
    const { quantitySold } = req.body;
    
    const finance = await ProductFinance.findById(req.params.id);
    
    if (!finance) {
      return res.status(404).json({ message: 'Product finance record not found' });
    }
    
    if (quantitySold > finance.quantity) {
      return res.status(400).json({ message: 'Sold quantity cannot exceed purchased quantity' });
    }
    
    finance.quantitySold = quantitySold;
    await finance.save();
    
    res.json({
      message: 'Quantity sold updated successfully',
      data: finance,
    });
  } catch (error) {
    res.status(400).json({ message: 'Error updating sold quantity', error: error.message });
  }
});

// Delete product finance record
router.delete('/finances/:id', authMiddleware, async (req, res) => {
  try {
    const finance = await ProductFinance.findByIdAndDelete(req.params.id);
    
    if (!finance) {
      return res.status(404).json({ message: 'Product finance record not found' });
    }
    
    res.json({
      message: 'Product finance record deleted successfully',
      data: finance,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting product finance record', error: error.message });
  }
});

module.exports = router;
