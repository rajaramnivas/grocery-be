const express = require('express');
const router = express.Router();
const AccountLedger = require('../models/AccountLedger');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// Create ledger entry (for manual entries by admin)
router.post('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const {
      transactionType,
      description,
      amount,
      account,
      referenceNumber,
      dueDate,
      notes,
    } = req.body;

    const transactionId = `TXN-${Date.now()}`;

    const ledgerEntry = new AccountLedger({
      transactionId,
      transactionType,
      description,
      amount,
      debit: ['revenue', 'payment', 'expense'].includes(transactionType) ? amount : 0,
      credit: transactionType === 'refund' ? amount : 0,
      account,
      referenceNumber,
      transactionDate: new Date(),
      dueDate,
      status: 'completed',
      notes,
      createdBy: req.user._id,
    });

    await ledgerEntry.save();

    res.status(201).json({
      message: 'Ledger entry created successfully',
      ledgerEntry,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all ledger entries with filters
router.get('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const {
      account,
      transactionType,
      startDate,
      endDate,
      status,
      limit = 50,
      skip = 0,
    } = req.query;

    const filter = {};

    if (account) filter.account = account;
    if (transactionType) filter.transactionType = transactionType;
    if (status) filter.status = status;

    if (startDate || endDate) {
      filter.transactionDate = {};
      if (startDate) filter.transactionDate.$gte = new Date(startDate);
      if (endDate) filter.transactionDate.$lte = new Date(endDate);
    }

    const entries = await AccountLedger.find(filter)
      .populate('billId', 'billNumber totalAmount')
      .populate('orderId', 'totalAmount status')
      .populate('userId', 'name email')
      .populate('createdBy', 'name')
      .sort({ transactionDate: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await AccountLedger.countDocuments(filter);

    res.json({
      entries,
      total,
      limit: parseInt(limit),
      skip: parseInt(skip),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get ledger entries by account
router.get('/account/:account', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const filter = { account: req.params.account };

    if (startDate || endDate) {
      filter.transactionDate = {};
      if (startDate) filter.transactionDate.$gte = new Date(startDate);
      if (endDate) filter.transactionDate.$lte = new Date(endDate);
    }

    const entries = await AccountLedger.find(filter)
      .populate('billId', 'billNumber')
      .populate('createdBy', 'name')
      .sort({ transactionDate: -1 });

    // Calculate running balance
    let balance = 0;
    const entriesWithBalance = entries.map((entry) => {
      balance += entry.debit - entry.credit;
      return {
        ...entry.toObject(),
        balance,
      };
    });

    res.json(entriesWithBalance);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single ledger entry
router.get('/:entryId', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const entry = await AccountLedger.findById(req.params.entryId)
      .populate('billId')
      .populate('orderId')
      .populate('userId')
      .populate('createdBy', 'name');

    if (!entry) {
      return res.status(404).json({ message: 'Ledger entry not found' });
    }

    res.json(entry);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update ledger entry
router.put('/:entryId', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { status, notes } = req.body;

    const entry = await AccountLedger.findByIdAndUpdate(
      req.params.entryId,
      { status, notes },
      { new: true }
    );

    if (!entry) {
      return res.status(404).json({ message: 'Ledger entry not found' });
    }

    res.json(entry);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get trial balance
router.get('/summary/trial-balance', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const accounts = ['revenue', 'accounts_receivable', 'cash', 'inventory', 'expense'];

    const trialBalance = await Promise.all(
      accounts.map(async (account) => {
        const entries = await AccountLedger.find({ account });
        const totalDebit = entries.reduce((sum, entry) => sum + entry.debit, 0);
        const totalCredit = entries.reduce((sum, entry) => sum + entry.credit, 0);

        return {
          account,
          debit: totalDebit,
          credit: totalCredit,
          balance: totalDebit - totalCredit,
        };
      })
    );

    const totalDebit = trialBalance.reduce((sum, acc) => sum + acc.debit, 0);
    const totalCredit = trialBalance.reduce((sum, acc) => sum + acc.credit, 0);

    res.json({
      accounts: trialBalance,
      total: {
        debit: totalDebit,
        credit: totalCredit,
        difference: totalDebit - totalCredit,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get account summary
router.get('/summary/:account', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const entries = await AccountLedger.find({ account: req.params.account }).sort({
      transactionDate: -1,
    });

    const totalDebit = entries.reduce((sum, entry) => sum + entry.debit, 0);
    const totalCredit = entries.reduce((sum, entry) => sum + entry.credit, 0);
    const balance = totalDebit - totalCredit;

    res.json({
      account: req.params.account,
      entries: entries.length,
      totalDebit,
      totalCredit,
      balance,
      transactions: entries,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
