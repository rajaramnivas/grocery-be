const mongoose = require('mongoose');

const productLedgerSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Please provide a product ID'],
      index: true,
    },
    productName: {
      type: String,
      required: [true, 'Product name is required'],
    },
    transactionType: {
      type: String,
      enum: ['opening_stock', 'purchase', 'sale', 'adjustment', 'damage', 'return'],
      required: [true, 'Transaction type is required'],
    },
    description: {
      type: String,
      description: 'Transaction description',
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
    },
    unitPrice: {
      type: Number,
      required: [true, 'Unit price is required'],
    },
    amount: {
      type: Number,
      default: function() {
        return this.quantity * this.unitPrice;
      },
    },
    transactionDate: {
      type: Date,
      required: [true, 'Transaction date is required'],
      default: Date.now,
    },
    batchNumber: {
      type: String,
      description: 'Batch/Lot number',
    },
    reference: {
      type: String,
      description: 'Reference number (invoice, order, etc.)',
    },
    notes: {
      type: String,
      maxlength: 500,
    },
    runningQuantity: {
      type: Number,
      description: 'Quantity after this transaction',
    },
    runningAmount: {
      type: Number,
      description: 'Total value after this transaction',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      description: 'User who created this transaction',
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient querying
productLedgerSchema.index({ productId: 1, transactionDate: 1 });
productLedgerSchema.index({ transactionDate: -1 });
productLedgerSchema.index({ productId: 1, transactionType: 1 });

module.exports = mongoose.model('ProductLedger', productLedgerSchema);
