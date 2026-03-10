const express = require('express');
const router = express.Router();
const Bill = require('../models/Bill');
const Order = require('../models/Order');
const AccountLedger = require('../models/AccountLedger');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// Generate bill for a delivered order
// - Admins can generate for any order
// - Customers can generate for their own delivered orders after delivery
router.post('/generate/:orderId', authMiddleware, async (req, res) => {
  try {
    const order = await Order.findById(req.params.orderId)
      .populate('userId', 'name email phone')
      .populate('items.productId', 'name stock');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const isAdmin = req.user.role === 'admin';
    const isOwner = order.userId && order.userId._id.toString() === req.user._id.toString();

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    // Non-admin users can only generate bills after delivery
    if (!isAdmin && order.status !== 'delivered') {
      return res.status(400).json({ message: 'Bill can only be generated after the order is delivered.' });
    }

    // Check if bill already exists for this order
    const existingBill = await Bill.findOne({ orderId: order._id });
    if (existingBill) {
      return res.status(400).json({ message: 'Bill already generated for this order' });
    }

    // Create bill
    const bill = new Bill({
      orderId: order._id,
      userId: order.userId._id,
      items: order.items,
      subtotal: order.totalAmount,
      totalAmount: order.totalAmount,
      shippingAddress: order.shippingAddress,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      customerName: order.userId.name,
      customerEmail: order.userId.email,
      customerPhone: order.userId.phone,
      notes: req.body.notes || '',
    });

    await bill.save();

    // Create ledger entry for the bill
    const transactionId = `TXN-${Date.now()}`;
    const ledgerEntry = new AccountLedger({
      transactionId,
      billId: bill._id,
      orderId: order._id,
      userId: order.userId._id,
      transactionType: 'sale',
      description: `Sales Invoice ${bill.billNumber} - Order ${order._id}`,
      debit: order.totalAmount,
      credit: 0,
      amount: order.totalAmount,
      account: 'revenue',
      referenceNumber: bill.billNumber,
      transactionDate: new Date(),
      status: 'completed',
      createdBy: req.user._id,
      notes: `Bill generated for order ${order._id}`,
    });

    await ledgerEntry.save();

    // Update order with bill reference
    order.billId = bill._id;
    order.billGeneratedAt = new Date();
    await order.save();

    // Update bill with ledger reference
    bill.ledgerEntryId = ledgerEntry._id;
    await bill.save();

    res.status(201).json({
      message: 'Bill generated successfully',
      bill,
      ledgerEntry,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all bills
router.get('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const bills = await Bill.find()
      .populate('userId', 'name email')
      .populate('orderId', 'totalAmount status')
      .sort({ billDate: -1 });

    res.json(bills);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single bill
router.get('/:billId', authMiddleware, async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.billId)
      .populate('userId', 'name email phone')
      .populate('orderId', 'status')
      .populate('ledgerEntryId');

    if (!bill) {
      return res.status(404).json({ message: 'Bill not found' });
    }

    res.json(bill);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get bills for specific customer
router.get('/customer/:userId', authMiddleware, async (req, res) => {
  try {
    // Verify user is requesting their own bills or is admin
    if (req.user._id.toString() !== req.params.userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const bills = await Bill.find({ userId: req.params.userId })
      .populate('orderId', 'status')
      .sort({ billDate: -1 });

    res.json(bills);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update bill status
router.put('/:billId/status', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { status } = req.body;

    const bill = await Bill.findByIdAndUpdate(
      req.params.billId,
      { status },
      { new: true }
    );

    if (!bill) {
      return res.status(404).json({ message: 'Bill not found' });
    }

    res.json(bill);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Download bill as PDF (generate on demand)
router.get('/download/:billId', authMiddleware, async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.billId)
      .populate('userId', 'name email phone')
      .populate('orderId');

    if (!bill) {
      return res.status(404).json({ message: 'Bill not found' });
    }

    // Verify user owns bill or is admin
    if (bill.userId._id.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    // Generate PDF content
    const pdfContent = generateBillPDF(bill);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${bill.billNumber}.pdf"`);
    res.send(pdfContent);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Helper function to generate bill PDF
function generateBillPDF(bill) {
  // For now, returning a simple text-based representation
  // In production, use a library like pdfkit or puppeteer
  let content = `
================== BILL ====================
Bill Number: ${bill.billNumber}
Bill Date: ${new Date(bill.billDate).toLocaleDateString()}

Customer Information:
Name: ${bill.customerName}
Email: ${bill.customerEmail}
Phone: ${bill.customerPhone}

Shipping Address:
${bill.shippingAddress.street}
${bill.shippingAddress.city}, ${bill.shippingAddress.state} ${bill.shippingAddress.zipCode}
${bill.shippingAddress.country}

================================================
Items:
================================================
`;

  bill.items.forEach((item, index) => {
    content += `
${index + 1}. ${item.name}
   Quantity: ${item.quantity}
   Unit Price: $${item.unitPrice}
   Total: $${item.totalPrice}
`;
  });

  content += `
================================================
Subtotal: $${bill.subtotal}
Tax: $${bill.tax}
Total Amount: $${bill.totalAmount}

Payment Method: ${bill.paymentMethod}
Payment Status: ${bill.paymentStatus}

Status: ${bill.status}
${bill.notes ? `Notes: ${bill.notes}` : ''}

Generated on: ${new Date().toLocaleString()}
================================================
Thank you for your purchase!
`;

  return Buffer.from(content);
}

module.exports = router;
