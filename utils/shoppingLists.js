// Predefined shopping lists with product categories
const shoppingLists = [
  {
    id: 'breakfast-items',
    name: 'Breakfast Essentials',
    description: 'Start your day right with these breakfast staples',
    icon: '🍳',
    items: [
      { category: 'Dairy', searchTerms: ['milk', 'butter', 'cheese', 'yogurt'] },
      { category: 'Bakery', searchTerms: ['bread', 'toast'] },
      { category: 'Beverages', searchTerms: ['tea', 'coffee', 'juice'] },
      { category: 'Fruits', searchTerms: ['banana', 'apple', 'orange'] },
      { category: 'Grains', searchTerms: ['oats', 'cereal', 'corn flakes'] }
    ]
  },
  {
    id: 'weekly-vegetables',
    name: 'Weekly Vegetables Pack',
    description: 'Fresh vegetables for the entire week',
    icon: '🥗',
    items: [
      { category: 'Vegetables', searchTerms: ['tomato', 'potato', 'onion', 'carrot', 'cabbage', 'broccoli', 'spinach', 'cauliflower', 'bell pepper', 'cucumber'] }
    ]
  },
  {
    id: 'student-budget',
    name: 'Student Budget Pack',
    description: 'Affordable essentials for students',
    icon: '🎓',
    items: [
      { category: 'Grains', searchTerms: ['rice', 'pasta', 'noodles'] },
      { category: 'Snacks', searchTerms: ['biscuit', 'chips', 'cookies'] },
      { category: 'Beverages', searchTerms: ['tea', 'coffee'] },
      { category: 'Dairy', searchTerms: ['milk'] },
      { category: 'Bakery', searchTerms: ['bread'] }
    ]
  },
  {
    id: 'healthy-living',
    name: 'Healthy Living Pack',
    description: 'Nutritious choices for a healthy lifestyle',
    icon: '💪',
    items: [
      { category: 'Fruits', searchTerms: ['apple', 'banana', 'orange', 'grapes'] },
      { category: 'Vegetables', searchTerms: ['broccoli', 'spinach', 'carrot', 'tomato'] },
      { category: 'Dairy', searchTerms: ['yogurt', 'milk'] },
      { category: 'Grains', searchTerms: ['oats', 'brown rice'] }
    ]
  },
  {
    id: 'party-snacks',
    name: 'Party Snacks Pack',
    description: 'Perfect for parties and gatherings',
    icon: '🎉',
    items: [
      { category: 'Snacks', searchTerms: ['chips', 'popcorn', 'nachos', 'cookies', 'biscuit'] },
      { category: 'Beverages', searchTerms: ['juice', 'soda', 'cold drink'] },
      { category: 'Bakery', searchTerms: ['cake', 'pastry'] }
    ]
  },
  {
    id: 'cooking-basics',
    name: 'Cooking Basics',
    description: 'Essential ingredients for cooking',
    icon: '👨‍🍳',
    items: [
      { category: 'Spices', searchTerms: ['salt', 'pepper', 'turmeric', 'cumin', 'chili'] },
      { category: 'Grains', searchTerms: ['rice', 'flour'] },
      { category: 'Vegetables', searchTerms: ['onion', 'tomato', 'garlic', 'ginger'] },
      { category: 'Dairy', searchTerms: ['butter', 'ghee'] }
    ]
  }
];

module.exports = { shoppingLists };
