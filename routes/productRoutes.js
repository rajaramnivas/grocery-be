const express = require('express');
const router = express.Router();
const Product = require('../models/Product');
const { authMiddleware } = require('../middleware/auth');

// Categories allowed for filtering in the customer product listing.
// We support both the newer storefront-friendly names and the older
// internal ones so existing data keeps working.
const allowedCategories = [
  // New storefront categories
  'Rice & Grains',
  'Flours',
  'Pulses & Dals',
  'Spices & Masalas',
  'Cooking Essentials',
  'Dairy Products',
  'Eggs & Bakery',
  'Fruits (Daily Use)',
  'Vegetables (Daily Use)',
  'Snacks & Biscuits',
  'Instant & Packed Foods',
  'Beverages',
  'Personal Care',
  'Cleaning & Household',

  // Legacy categories kept for backward compatibility
  'Vegetables',
  'Fruits',
  'Dairy',
  'Grains',
  'Bakery',
  'Meat',
  'Snacks',
  'Spices',
  'Other',
];

const allowedSortBy = ['', 'price_asc', 'price_desc', 'rating'];
const validSearchPattern = /^[a-zA-Z0-9\s'\-]*$/;

// Map storefront-friendly category labels to one or more
// underlying categories stored in the database. This lets us
// keep older "Grains" data working while using the new
// "Rice & Grains" label in the UI.
const categoryAliasMap = {
  'Rice & Grains': ['Rice & Grains', 'Grains'],
  Grains: ['Grains', 'Rice & Grains'],
};

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const validateProductSearchQuery = (req, res, next) => {
  const category = typeof req.query.category === 'string' ? req.query.category.trim() : '';
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  const sortBy = typeof req.query.sortBy === 'string' ? req.query.sortBy.trim() : '';

  if (category && !allowedCategories.includes(category)) {
    return res.status(400).json({ message: 'Invalid category filter' });
  }

  if (!allowedSortBy.includes(sortBy)) {
    return res.status(400).json({ message: 'Invalid sortBy filter' });
  }

  if (search.length > 100) {
    return res.status(400).json({ message: 'Search text is too long (max 100 characters)' });
  }

  if (search && !validSearchPattern.test(search)) {
    return res.status(400).json({
      message: 'Invalid search text. Use letters, numbers, spaces, apostrophe, and hyphen only.',
    });
  }

  req.validatedProductQuery = {
    category,
    search,
    sortBy,
  };

  next();
};

// Get daily deals
router.get('/deals/today', async (req, res) => {
  try {
    // Return all products that are currently marked as daily deals
    // and are active. This keeps the customer view in sync with
    // what the shopkeeper configured in the admin panel.
    const deals = await Product.find({
      isDailyDeal: true,
      isActive: true,
    });
    res.json(deals);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all products (public for browsing; actions like cart still require auth)
router.get('/', validateProductSearchQuery, async (req, res) => {
  try {
    const { category, search, sortBy } = req.validatedProductQuery;
    let query = { isActive: true };

    if (category) {
      const aliases = categoryAliasMap[category];
      if (aliases) {
        query.category = { $in: aliases };
      } else {
        query.category = category;
      }
    }

    if (search) {
      const escapedSearch = escapeRegex(search);
      query.$or = [
        { name: { $regex: escapedSearch, $options: 'i' } },
        { description: { $regex: escapedSearch, $options: 'i' } },
      ];
    }

    let products = Product.find(query);

    if (sortBy === 'price_asc') {
      products = products.sort({ price: 1 });
    } else if (sortBy === 'price_desc') {
      products = products.sort({ price: -1 });
    } else if (sortBy === 'rating') {
      products = products.sort({ rating: -1 });
    } else {
      products = products.sort({ createdAt: -1 });
    }

    const result = await products;
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single product
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
