const mongoose = require('mongoose');

const billSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    billNumber: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },
    billDate: {
      type: Date,
      default: Date.now,
    },
    items: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Product',
        },
        name: String,
        quantity: Number,
        unitPrice: Number,
        totalPrice: Number,
      },
    ],
    subtotal: {
      type: Number,
      required: true,
    },
    tax: {
      type: Number,
      default: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    shippingAddress: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
    },
    paymentMethod: String,
    paymentStatus: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'completed',
    },
    customerName: String,
    customerEmail: String,
    customerPhone: String,
    notes: String,
    status: {
      type: String,
      enum: ['draft', 'issued', 'paid', 'overdue', 'cancelled'],
      default: 'issued',
    },
    dueDate: Date,
    pdfPath: {
      type: String,
      description: 'Path to stored PDF file',
    },
    ledgerEntryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AccountLedger',
      description: 'Reference to ledger entry',
    },
  },
  { timestamps: true }
);

// Auto-generate bill number
billSchema.pre('save', async function(next) {
  if (!this.isNew) return next();
  
  try {
    const latestBill = await mongoose.model('Bill').findOne({}, {}, { sort: { 'createdAt': -1 } });
    const billNumber = latestBill ? `BILL-${Date.now()}` : `BILL-${Date.now()}`;
    this.billNumber = billNumber;
    next();
  } catch (error) {
    return next(error);
  }
});

module.exports = mongoose.model('Bill', billSchema);
