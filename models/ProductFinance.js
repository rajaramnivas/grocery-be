const mongoose = require('mongoose');

const productFinanceSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Please provide a product ID'],
      index: true,
    },
    costPrice: {
      type: Number,
      required: [true, 'Please provide cost price'],
      min: [0, 'Cost price must be positive'],
    },
    sellingPrice: {
      type: Number,
      required: [true, 'Please provide selling price'],
      min: [0, 'Selling price must be positive'],
    },
    buyingDate: {
      type: Date,
      required: [true, 'Please provide buying date'],
    },
    expiryDate: {
      type: Date,
      required: [true, 'Please provide expiry date'],
    },
    quantity: {
      type: Number,
      required: [true, 'Please provide quantity purchased'],
      min: [1, 'Quantity must be at least 1'],
      default: 1,
    },
    quantitySold: {
      type: Number,
      default: 0,
      min: 0,
    },
    quantityRemaining: {
      type: Number,
      default: function() {
        return this.quantity - this.quantitySold;
      },
    },
    profitPerUnit: {
      type: Number,
      default: function() {
        return this.sellingPrice - this.costPrice;
      },
    },
    totalCost: {
      type: Number,
      default: function() {
        return this.costPrice * this.quantity;
      },
    },
    totalSaleValue: {
      type: Number,
      default: function() {
        return this.sellingPrice * this.quantitySold;
      },
    },
    totalProfit: {
      type: Number,
      default: function() {
        return this.profitPerUnit * this.quantitySold;
      },
    },
    profitMargin: {
      type: Number,
      default: function() {
        if (this.sellingPrice === 0) return 0;
        return ((this.profitPerUnit / this.sellingPrice) * 100).toFixed(2);
      },
    },
    status: {
      type: String,
      enum: ['active', 'expired', 'out_of_stock', 'archived'],
      default: 'active',
    },
    batchNumber: {
      type: String,
      description: 'Batch/Lot number for tracking',
    },
    supplier: {
      type: String,
      description: 'Supplier name',
    },
    notes: {
      type: String,
      description: 'Additional notes about this product batch',
      maxlength: 500,
    },
  },
  {
    timestamps: true,
  }
);

// Middleware to calculate fields before saving
productFinanceSchema.pre('save', function(next) {
  this.profitPerUnit = this.sellingPrice - this.costPrice;
  this.totalCost = this.costPrice * this.quantity;
  this.totalSaleValue = this.sellingPrice * this.quantitySold;
  this.totalProfit = this.profitPerUnit * this.quantitySold;
  this.quantityRemaining = this.quantity - this.quantitySold;
  this.profitMargin = this.sellingPrice === 0 ? 0 : ((this.profitPerUnit / this.sellingPrice) * 100).toFixed(2);
  
  // Auto-update status based on expiry date
  const today = new Date();
  if (this.expiryDate && this.expiryDate < today) {
    this.status = 'expired';
  } else if (this.quantityRemaining === 0) {
    this.status = 'out_of_stock';
  }
  
  next();
});

// Index for common queries
productFinanceSchema.index({ productId: 1, status: 1 });
productFinanceSchema.index({ expiryDate: 1 });
productFinanceSchema.index({ createdAt: -1 });

module.exports = mongoose.model('ProductFinance', productFinanceSchema);
