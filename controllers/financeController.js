const Finance = require('../models/Finance');
const Order = require('../models/Order');

/**
 * Finance Controller
 * Handles all financial operations including income tracking and expense management
 */

/**
 * Record income automatically when order is placed
 * Called internally from order creation
 */
exports.recordIncome = async (orderId, amount, paymentMethod) => {
  try {
    const income = new Finance({
      transactionType: 'income',
      orderId: orderId,
      amount: amount,
      paymentMethod: paymentMethod,
      description: `Income from Order #${orderId}`,
      date: new Date(),
    });
    
    await income.save();
    return income;
  } catch (error) {
    console.error('Error recording income:', error);
    throw error;
  }
};

/**
 * Record expense automatically when inventory is added
 * Called internally from inventory management
 */
exports.recordInventoryExpense = async (amount, description, adminId) => {
  try {
    const expense = new Finance({
      transactionType: 'expense',
      category: 'Inventory',
      amount: amount,
      description: description || 'Inventory investment',
      date: new Date(),
      createdBy: adminId,
    });
    
    await expense.save();
    return expense;
  } catch (error) {
    console.error('Error recording inventory expense:', error);
    throw error;
  }
};

/**
 * Add manual expense
 * POST /api/finance/expense
 */
exports.addExpense = async (req, res) => {
  try {
    const { category, amount, description, date } = req.body;
    
    // Validation
    if (!category || !amount) {
      return res.status(400).json({ 
        message: 'Category and amount are required' 
      });
    }
    
    if (amount <= 0) {
      return res.status(400).json({ 
        message: 'Amount must be greater than 0' 
      });
    }
    
    const expense = new Finance({
      transactionType: 'expense',
      category,
      amount,
      description: description || '',
      date: date ? new Date(date) : new Date(),
      createdBy: req.userId,
    });
    
    await expense.save();
    
    res.status(201).json({
      message: 'Expense added successfully',
      expense,
    });
  } catch (error) {
    console.error('Error adding expense:', error);
    res.status(500).json({ 
      message: 'Failed to add expense',
      error: error.message 
    });
  }
};

/**
 * Get all transactions with optional filters
 * GET /api/finance/transactions?startDate=...&endDate=...&type=...
 */
exports.getTransactions = async (req, res) => {
  try {
    const { startDate, endDate, type } = req.query;
    
    // Build query
    let query = {};
    
    if (type && (type === 'income' || type === 'expense')) {
      query.transactionType = type;
    }
    
    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        query.date.$gte = new Date(startDate);
      }
      if (endDate) {
        query.date.$lte = new Date(endDate);
      }
    }
    
    const transactions = await Finance.find(query)
      .populate('orderId', 'orderId totalAmount status')
      .populate('createdBy', 'name email')
      .sort({ date: -1 })
      .limit(100);
    
    res.json({
      success: true,
      count: transactions.length,
      transactions,
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ 
      message: 'Failed to fetch transactions',
      error: error.message 
    });
  }
};

/**
 * Get financial summary with aggregation
 * GET /api/finance/summary?startDate=...&endDate=...
 */
exports.getFinancialSummary = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Build date filter
    let dateFilter = {};
    if (startDate || endDate) {
      dateFilter.date = {};
      if (startDate) {
        dateFilter.date.$gte = new Date(startDate);
      }
      if (endDate) {
        dateFilter.date.$lte = new Date(endDate);
      }
    }
    
    // Aggregate income and expenses
    const summary = await Finance.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$transactionType',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]);
    
    // Process results
    let totalIncome = 0;
    let totalExpenses = 0;
    let incomeTransactions = 0;
    let expenseTransactions = 0;
    
    summary.forEach(item => {
      if (item._id === 'income') {
        totalIncome = item.total;
        incomeTransactions = item.count;
      } else if (item._id === 'expense') {
        totalExpenses = item.total;
        expenseTransactions = item.count;
      }
    });
    
    // Calculate net profit
    const netProfit = totalIncome - totalExpenses;
    
    // Get expense breakdown by category
    const expenseBreakdown = await Finance.aggregate([
      { 
        $match: { 
          transactionType: 'expense',
          ...dateFilter
        } 
      },
      {
        $group: {
          _id: '$category',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { total: -1 } },
    ]);
    
    // Get order count (for dashboard)
    let orderFilter = {};
    if (startDate || endDate) {
      orderFilter.createdAt = {};
      if (startDate) {
        orderFilter.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        orderFilter.createdAt.$lte = new Date(endDate);
      }
    }
    const orderCount = await Order.countDocuments(orderFilter);
    
    res.json({
      success: true,
      summary: {
        totalIncome,
        totalExpenses,
        netProfit,
        incomeTransactions,
        expenseTransactions,
        totalOrders: orderCount,
      },
      expenseBreakdown,
    });
  } catch (error) {
    console.error('Error fetching financial summary:', error);
    res.status(500).json({ 
      message: 'Failed to fetch financial summary',
      error: error.message 
    });
  }
};

/**
 * Get recent transactions (for dashboard)
 * GET /api/finance/recent?limit=10
 */
exports.getRecentTransactions = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    const transactions = await Finance.find()
      .populate('orderId', 'orderId totalAmount')
      .sort({ date: -1 })
      .limit(limit);
    
    res.json({
      success: true,
      transactions,
    });
  } catch (error) {
    console.error('Error fetching recent transactions:', error);
    res.status(500).json({ 
      message: 'Failed to fetch recent transactions',
      error: error.message 
    });
  }
};

/**
 * Delete a transaction (admin only)
 * DELETE /api/finance/:id
 */
exports.deleteTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    
    const transaction = await Finance.findById(id);
    
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }
    
    // Prevent deletion of income transactions linked to orders
    if (transaction.transactionType === 'income' && transaction.orderId) {
      return res.status(400).json({ 
        message: 'Cannot delete income transactions linked to orders' 
      });
    }
    
    await Finance.findByIdAndDelete(id);
    
    res.json({
      success: true,
      message: 'Transaction deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    res.status(500).json({ 
      message: 'Failed to delete transaction',
      error: error.message 
    });
  }
};
