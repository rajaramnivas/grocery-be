const express = require('express');
const router = express.Router();
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const Product = require('../models/Product');
const ProductLedger = require('../models/ProductLedger');

// Get all products ledger summary (accounting overview)
router.get('/accounts', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const products = await Product.find();
    
    const accountsSummary = await Promise.all(
      products.map(async (product) => {
        const transactions = await ProductLedger.find({ productId: product._id }).sort({
          transactionDate: 1,
        });
        
        if (transactions.length === 0) {
          return {
            productId: product._id,
            productName: product.name,
            category: product.category,
            openingQuantity: 0,
            totalPurchased: 0,
            totalSold: 0,
            closingQuantity: 0,
            totalCost: 0,
            totalSaleValue: 0,
            netProfit: 0,
          };
        }
        
        // Calculate running totals
        let openingQty = 0;
        let totalCost = 0;
        let totalSold = 0;
        let totalSaleValue = 0;
        
        transactions.forEach((txn) => {
          if (txn.transactionType === 'opening_stock') {
            openingQty = txn.quantity;
            totalCost = txn.amount;
          } else if (txn.transactionType === 'purchase') {
            totalCost += txn.amount;
          } else if (txn.transactionType === 'sale') {
            totalSold += txn.quantity;
            totalSaleValue += txn.amount;
          }
        });
        
        const closingQty = openingQty + 
          transactions
            .filter(t => t.transactionType === 'purchase')
            .reduce((sum, t) => sum + t.quantity, 0) -
          totalSold -
          transactions
            .filter(t => t.transactionType === 'damage' || t.transactionType === 'adjustment')
            .reduce((sum, t) => sum + t.quantity, 0);
        
        return {
          productId: product._id,
          productName: product.name,
          category: product.category,
          openingQuantity: openingQty,
          totalPurchased: transactions
            .filter(t => t.transactionType === 'purchase')
            .reduce((sum, t) => sum + t.quantity, 0),
          totalSold: totalSold,
          closingQuantity: Math.max(0, closingQty),
          totalCost: totalCost,
          totalSaleValue: totalSaleValue,
          netProfit: totalSaleValue - totalCost,
          transactionCount: transactions.length,
        };
      })
    );
    
    res.json(accountsSummary);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching accounts summary', error: error.message });
  }
});

// Get ledger entries for all products
router.get('/accounts/ledger/all', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { startDate, endDate, transactionType, productId } = req.query;

    const filter = {};
    if (productId) filter.productId = productId;
    if (transactionType) filter.transactionType = transactionType;
    if (startDate || endDate) {
      filter.transactionDate = {};
      if (startDate) filter.transactionDate.$gte = new Date(startDate);
      if (endDate) filter.transactionDate.$lte = new Date(endDate);
    }

    const entries = await ProductLedger.find(filter).sort({ transactionDate: -1 });
    const productIds = [...new Set(entries.map((entry) => entry.productId.toString()))];
    const products = await Product.find({ _id: { $in: productIds } }).select('name category');
    const productMap = products.reduce((acc, product) => {
      acc[product._id.toString()] = product;
      return acc;
    }, {});

    const enrichedEntries = entries.map((entry) => {
      const product = productMap[entry.productId.toString()];
      return {
        ...entry.toObject(),
        productName: entry.productName || product?.name || 'Unknown',
        productCategory: product?.category || 'Unknown',
      };
    });

    res.json({
      entries: enrichedEntries,
      total: enrichedEntries.length,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching ledger entries', error: error.message });
  }
});

// Get product ledger (account statement for a specific product)
router.get('/accounts/:productId', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { productId } = req.params;
    
    // Get product details
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Get all ledger entries for this product
    const ledgerEntries = await ProductLedger.find({ productId }).sort({
      transactionDate: 1,
    });
    
    // Calculate account balances
    let openingQuantity = 0;
    let runningQuantity = 0;
    let totalCost = 0;
    let totalSaleValue = 0;
    
    const enrichedEntries = ledgerEntries.map((entry) => {
      if (entry.transactionType === 'opening_stock') {
        openingQuantity = entry.quantity;
        runningQuantity = entry.quantity;
        totalCost = entry.amount;
      } else if (entry.transactionType === 'purchase' || entry.transactionType === 'adjustment') {
        runningQuantity += entry.quantity;
        totalCost += entry.amount;
      } else if (entry.transactionType === 'sale' || entry.transactionType === 'damage' || entry.transactionType === 'return') {
        runningQuantity -= entry.quantity;
        if (entry.transactionType === 'sale') {
          totalSaleValue += entry.amount;
        }
      }
      
      return {
        ...entry.toObject(),
        runningQuantity,
        runningCost: totalCost,
        runningProfit: totalSaleValue - totalCost,
      };
    });
    
    // Calculate summary
    const summary = {
      productId,
      productName: product.name,
      category: product.category,
      picture: product.image,
      openingQuantity,
      totalPurchased: ledgerEntries
        .filter(e => e.transactionType === 'purchase')
        .reduce((sum, e) => sum + e.quantity, 0),
      totalSold: ledgerEntries
        .filter(e => e.transactionType === 'sale')
        .reduce((sum, e) => sum + e.quantity, 0),
      totalAdjustment: ledgerEntries
        .filter(e => e.transactionType === 'adjustment')
        .reduce((sum, e) => sum + e.quantity, 0),
      totalDamage: ledgerEntries
        .filter(e => e.transactionType === 'damage')
        .reduce((sum, e) => sum + e.quantity, 0),
      closingQuantity: runningQuantity,
      totalCost,
      totalSaleValue,
      netProfit: totalSaleValue - totalCost,
      averageCost: ledgerEntries.length > 0 ? (totalCost / runningQuantity).toFixed(2) : 0,
    };
    
    res.json({
      summary,
      ledger: enrichedEntries,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching product ledger', error: error.message });
  }
});

// Add transaction to product ledger
router.post('/accounts/:productId/transaction', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { productId } = req.params;
    const {
      transactionType,
      quantity,
      unitPrice,
      transactionDate,
      description,
      batchNumber,
      reference,
      notes,
    } = req.body;
    
    // Verify product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    
    // Create ledger entry
    const ledgerEntry = new ProductLedger({
      productId,
      productName: product.name,
      transactionType,
      quantity,
      unitPrice,
      amount: quantity * unitPrice,
      transactionDate: transactionDate ? new Date(transactionDate) : new Date(),
      description: description || `${transactionType.replace('_', ' ').toUpperCase()}`,
      batchNumber,
      reference,
      notes,
      createdBy: req.userId,
    });
    
    await ledgerEntry.save();
    
    res.status(201).json({
      message: 'Transaction added successfully',
      data: ledgerEntry,
    });
  } catch (error) {
    res.status(400).json({ message: 'Error adding transaction', error: error.message });
  }
});

// Get ledger entries for a product with date range filter
router.get('/accounts/:productId/history', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { productId } = req.params;
    const { startDate, endDate, transactionType } = req.query;
    
    let query = { productId };
    
    if (startDate || endDate) {
      query.transactionDate = {};
      if (startDate) {
        query.transactionDate.$gte = new Date(startDate);
      }
      if (endDate) {
        query.transactionDate.$lte = new Date(endDate);
      }
    }
    
    if (transactionType) {
      query.transactionType = transactionType;
    }
    
    const ledgerEntries = await ProductLedger.find(query)
      .sort({ transactionDate: -1 })
      .populate('createdBy', 'name email');
    
    res.json(ledgerEntries);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching ledger history', error: error.message });
  }
});

// Update ledger entry (for corrections)
router.put('/accounts/entry/:entryId', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { entryId } = req.params;
    const { quantity, unitPrice, description, notes } = req.body;
    
    const entry = await ProductLedger.findById(entryId);
    if (!entry) {
      return res.status(404).json({ message: 'Ledger entry not found' });
    }
    
    if (quantity !== undefined) entry.quantity = quantity;
    if (unitPrice !== undefined) entry.unitPrice = unitPrice;
    if (description !== undefined) entry.description = description;
    if (notes !== undefined) entry.notes = notes;
    
    // Recalculate amount
    entry.amount = entry.quantity * entry.unitPrice;
    
    await entry.save();
    
    res.json({
      message: 'Ledger entry updated successfully',
      data: entry,
    });
  } catch (error) {
    res.status(400).json({ message: 'Error updating ledger entry', error: error.message });
  }
});

// Delete ledger entry (for corrections)
router.delete('/accounts/entry/:entryId', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { entryId } = req.params;
    
    const entry = await ProductLedger.findByIdAndDelete(entryId);
    if (!entry) {
      return res.status(404).json({ message: 'Ledger entry not found' });
    }
    
    res.json({
      message: 'Ledger entry deleted successfully',
      data: entry,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting ledger entry', error: error.message });
  }
});

// Get accounting summary (balance sheet style)
router.get('/accounts/summary/balance-sheet', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const allLedgers = await ProductLedger.find();
    
    const totalCost = allLedgers
      .filter(l => l.transactionType === 'opening_stock' || l.transactionType === 'purchase')
      .reduce((sum, l) => sum + l.amount, 0);
    
    const totalSaleValue = allLedgers
      .filter(l => l.transactionType === 'sale')
      .reduce((sum, l) => sum + l.amount, 0);
    
    const totalDamageValue = allLedgers
      .filter(l => l.transactionType === 'damage')
      .reduce((sum, l) => sum + (l.quantity * l.unitPrice), 0);
    
    const netProfit = totalSaleValue - totalCost;
    const profitMargin = totalCost > 0 ? ((netProfit / totalSaleValue) * 100).toFixed(2) : 0;
    
    res.json({
      totalCost: totalCost.toFixed(2),
      totalSaleValue: totalSaleValue.toFixed(2),
      totalDamageValue: totalDamageValue.toFixed(2),
      netProfit: netProfit.toFixed(2),
      profitMargin,
      totalTransactions: allLedgers.length,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching balance sheet', error: error.message });
  }
});

module.exports = router;
