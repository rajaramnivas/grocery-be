// Grocery reminder configuration
// Define essential items and their suggested restock frequency in days

const essentialItems = [
  {
    id: 'dairy',
    name: 'Dairy Products',
    items: ['milk', 'yogurt', 'butter', 'cheese'],
    frequency: 5,
    emoji: '🥛',
    message: 'Your milk is running low! Time to restock dairy essentials.',
    shortMessage: 'Milk & dairy items'
  },
  {
    id: 'grains',
    name: 'Rice & Grains',
    items: ['rice', 'wheat', 'flour', 'oats'],
    frequency: 14,
    emoji: '🍚',
    message: 'Don\'t forget rice and grains! These staples run out quickly.',
    shortMessage: 'Rice & grains'
  },
  {
    id: 'vegetables',
    name: 'Fresh Vegetables',
    items: ['tomato', 'onion', 'potato', 'carrot', 'spinach'],
    frequency: 3,
    emoji: '🥬',
    message: 'Fresh vegetables are running out. Stock up today!',
    shortMessage: 'Fresh vegetables'
  },
  {
    id: 'fruits',
    name: 'Fresh Fruits',
    items: ['apple', 'banana', 'orange', 'grapes'],
    frequency: 7,
    emoji: '🍎',
    message: 'Your fruit supplies are getting low.',
    shortMessage: 'Fresh fruits'
  },
  {
    id: 'staples',
    name: 'Kitchen Staples',
    items: ['salt', 'sugar', 'spices', 'oil'],
    frequency: 20,
    emoji: '🧂',
    message: 'Time to restock your kitchen staples and spices.',
    shortMessage: 'Kitchen staples'
  }
];

module.exports = { essentialItems };
