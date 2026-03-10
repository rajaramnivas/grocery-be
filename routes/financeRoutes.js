const express = require('express');
const router = express.Router();
const financeController = require('../controllers/financeController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

/**
 * Finance Routes
 * All routes require authentication and admin privileges
 */

// Add manual expense
router.post('/expense', authMiddleware, adminMiddleware, financeController.addExpense);

// Get all transactions with filters
router.get('/transactions', authMiddleware, adminMiddleware, financeController.getTransactions);

// Get financial summary
router.get('/summary', authMiddleware, adminMiddleware, financeController.getFinancialSummary);

// Get recent transactions
router.get('/recent', authMiddleware, adminMiddleware, financeController.getRecentTransactions);

// Delete transaction
router.delete('/:id', authMiddleware, adminMiddleware, financeController.deleteTransaction);

module.exports = router;
