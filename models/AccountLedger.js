const mongoose = require('mongoose');

const accountLedgerSchema = new mongoose.Schema(
  {
    transactionId: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },
    billId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bill',
      index: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
    },
    transactionType: {
      type: String,
      enum: ['sale', 'purchase', 'payment', 'refund', 'adjustment', 'expense'],
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    debit: {
      type: Number,
      default: 0,
    },
    credit: {
      type: Number,
      default: 0,
    },
    amount: {
      type: Number,
      required: true,
    },
    account: {
      type: String,
      enum: ['revenue', 'accounts_receivable', 'cash', 'inventory', 'expense'],
      required: true,
    },
    referenceNumber: String,
    transactionDate: {
      type: Date,
      required: true,
      default: Date.now,
    },
    dueDate: Date,
    status: {
      type: String,
      enum: ['pending', 'completed', 'overdue'],
      default: 'completed',
    },
    notes: String,
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      description: 'Admin who created the entry',
    },
    attachments: [
      {
        filename: String,
        path: String,
        uploadedAt: Date,
      },
    ],
  },
  { timestamps: true }
);

// Index for efficient range queries
accountLedgerSchema.index({ transactionDate: -1, account: 1 });

module.exports = mongoose.model('AccountLedger', accountLedgerSchema);
