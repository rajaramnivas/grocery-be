const mongoose = require('mongoose');

/**
 * Finance Model
 * Tracks all financial transactions (income and expenses)
 * Used for financial reporting and profit calculation
 */
const financeSchema = new mongoose.Schema(
  {
    // Transaction type: income (from orders) or expense (manual entries)
    transactionType: {
      type: String,
      enum: ['income', 'expense'],
      required: true,
    },
    
    // Reference to order (only for income transactions)
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      sparse: true,
    },
    
    // Transaction amount
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    
    // Category for expenses
    category: {
      type: String,
      enum: ['Inventory', 'Salary', 'Utilities', 'Transport', 'Maintenance', 'Others'],
      required: function() {
        return this.transactionType === 'expense';
      },
    },
    
    // Description of the transaction
    description: {
      type: String,
      default: '',
    },
    
    // Payment method (for income transactions)
    paymentMethod: {
      type: String,
      enum: ['credit_card', 'debit_card', 'upi', 'net_banking', 'cash_on_delivery', 'cash'],
    },
    
    // Transaction date
    date: {
      type: Date,
      default: Date.now,
    },
    
    // Admin who created the expense entry
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  { timestamps: true }
);

// Index for faster queries
financeSchema.index({ transactionType: 1, date: -1 });
financeSchema.index({ orderId: 1 });

module.exports = mongoose.model('Finance', financeSchema);
