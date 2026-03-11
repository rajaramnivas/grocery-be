const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// MongoDB Connection – cache the promise so serverless re-invocations reuse it
let dbPromise = null;
function connectDB() {
  if (!dbPromise) {
    dbPromise = mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/grocery_store', {
      serverSelectionTimeoutMS: 15000,
      socketTimeoutMS: 45000,
    })
      .then(() => console.log('MongoDB connected'))
      .catch(err => {
        console.log('MongoDB connection error:', err);
        dbPromise = null; // allow retry on next request
        throw err;
      });
  }
  return dbPromise;
}

// Ensure DB is connected before any route handler runs
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    res.status(503).json({ message: 'Database connection failed. Please try again.' });
  }
});

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/cart', require('./routes/cartRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/payments', require('./routes/paymentRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/admin', require('./routes/productFinanceRoutes'));
app.use('/api/admin', require('./routes/accountingRoutes'));
app.use('/api/admin/shopping-lists', require('./routes/adminShoppingListRoutes'));
app.use('/api/shopping-lists', require('./routes/shoppingListRoutes'));
app.use('/api/wishlist', require('./routes/wishlistRoutes'));
app.use('/api/bills', require('./routes/billRoutes'));
app.use('/api/account-ledger', require('./routes/accountLedgerRoutes'));
app.use('/api/finance', require('./routes/financeRoutes'));

// Basic route
app.get('/', (req, res) => {
  res.json({ message: 'Grocery Store API is running' });
});

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
