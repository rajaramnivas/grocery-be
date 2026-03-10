const mongoose = require('mongoose');
const dotenv = require('dotenv');
const ShoppingList = require('./models/ShoppingList');
const Product = require('./models/Product');

dotenv.config();

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/grocery_store')
  .then(() => console.log('MongoDB connected for seeding shopping lists'))
  .catch((err) => console.log('MongoDB connection error:', err));

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// High-level pack definitions with suggested products
const packDefinitions = [
  {
    name: 'Breakfast Essentials Pack',
    description: 'Start your day right with these breakfast staples',
    icon: '🥣',
    category: 'breakfast',
    displayOrder: 1,
    keywords: [
      'Milk',
      'Bread',
      'Butter',
      'Egg',
      'Banana',
      'Oats',
      'Tea',
      'Coffee',
      'Honey',
      'Glucose',
    ],
  },
  {
    name: 'Weekly Vegetables Pack',
    description: 'Fresh vegetables for the entire week',
    icon: '🥕',
    category: 'weekly',
    displayOrder: 2,
    keywords: [
      'Potato',
      'Onion',
      'Tomato',
      'Carrot',
      'Cabbage',
      'Cauliflower',
      'Cucumber',
      'Green Chilli',
      'Ginger',
      'Garlic',
    ],
  },
  {
    name: 'Healthy Living Pack',
    description: 'Nutritious choices for a healthy lifestyle',
    icon: '🥗',
    category: 'healthy',
    displayOrder: 3,
    keywords: [
      'Brown Rice',
      'Multigrain Atta',
      'Ragi',
      'Oats',
      'Honey',
      'Whole Green Moong',
      'Masoor',
      'Country Egg',
      'Banana',
      'Apple',
      'Papaya',
      'Milk',
      'Curd',
    ],
  },
  {
    name: 'Party Snacks Pack',
    description: 'Perfect for parties and gatherings',
    icon: '🎉',
    category: 'party',
    displayOrder: 4,
    keywords: [
      'Chocolate',
      'Cookies',
      'Mixture',
      'Namkeen',
      'Soft Drink',
      'Glucose Biscuit',
      'Health Drink',
    ],
  },
  {
    name: 'Cooking Basics Pack',
    description: 'Essential ingredients for cooking',
    icon: '🍳',
    category: 'cooking',
    displayOrder: 5,
    keywords: [
      'Salt',
      'Sugar',
      'Sunflower Oil',
      'Groundnut Oil',
      'Turmeric',
      'Chili Powder',
      'Coriander Powder',
      'Cumin Powder',
      'Garam Masala',
      'Sambar Powder',
      'Rasam Powder',
    ],
  },
];

const findProductsByKeywords = async (keywords) => {
  const productIds = [];
  const seen = new Set();

  for (const keyword of keywords) {
    const regex = new RegExp(escapeRegex(keyword), 'i');

    // Try matching by name first, then by description as a fallback
    const product = await Product.findOne({
      $or: [{ name: regex }, { description: regex }],
    });

    if (product && !seen.has(product._id.toString())) {
      seen.add(product._id.toString());
      productIds.push(product._id);
    }
  }

  return productIds;
};

const seedShoppingLists = async () => {
  try {
    console.log('Starting to seed curated shopping lists...');

    // Clear existing shopping lists
    await ShoppingList.deleteMany({});
    console.log('Cleared existing shopping lists');

    const createdLists = [];

    for (const pack of packDefinitions) {
      const products = await findProductsByKeywords(pack.keywords);

      if (products.length === 0) {
        console.warn(`⚠️  No matching products found for list "${pack.name}". Skipping.`);
        continue;
      }

      const list = new ShoppingList({
        name: pack.name,
        description: pack.description,
        icon: pack.icon,
        category: pack.category,
        products,
        displayOrder: pack.displayOrder,
        isActive: true,
      });

      await list.save();
      console.log(`Created shopping list: ${list.name} with ${list.products.length} products`);
      createdLists.push(list);
    }

    console.log(`\n✅ Successfully seeded ${createdLists.length} curated shopping lists!`);
    process.exit(0);
  } catch (error) {
    console.error('Error seeding shopping lists:', error);
    process.exit(1);
  }
};

seedShoppingLists();
