require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('./models/Product');

const extraProducts = [
  // Flours & grains / pulses
  { name: 'Whole Wheat Atta', category: 'Grains' },
  { name: 'Multigrain Atta', category: 'Grains' },
  { name: 'Maida', category: 'Grains' },
  { name: 'Besan (Gram Flour)', category: 'Grains' },
  { name: 'Rice Flour', category: 'Grains' },
  { name: 'Ragi Flour', category: 'Grains' },
  { name: 'Bajra Flour', category: 'Grains' },
  { name: 'Toor Dal', category: 'Grains' },
  { name: 'Moong Dal (Yellow & Green)', category: 'Grains' },
  { name: 'Urad Dal', category: 'Grains' },
  { name: 'Chana Dal', category: 'Grains' },
  { name: 'Masoor Dal', category: 'Grains' },
  { name: 'Rajma', category: 'Grains' },
  { name: 'Kabuli Chana', category: 'Grains' },
  { name: 'Black Chana', category: 'Grains' },
  { name: 'Green Peas (Dry)', category: 'Grains' },

  // Spices & whole spices
  { name: 'Turmeric Powder', category: 'Spices' },
  { name: 'Red Chilli Powder', category: 'Spices' },
  { name: 'Coriander Powder', category: 'Spices' },
  { name: 'Garam Masala', category: 'Spices' },
  { name: 'Sambar Powder', category: 'Spices' },
  { name: 'Rasam Powder', category: 'Spices' },
  { name: 'Cumin Seeds', category: 'Spices' },
  { name: 'Mustard Seeds', category: 'Spices' },
  { name: 'Pepper', category: 'Spices' },
  { name: 'Cloves', category: 'Spices' },
  { name: 'Cardamom', category: 'Spices' },
  { name: 'Cinnamon', category: 'Spices' },
  { name: 'Bay Leaf', category: 'Spices' },
  { name: 'Asafoetida (Hing)', category: 'Spices' },

  // Oils, sugars, salt
  { name: 'Sunflower Oil', category: 'Other' },
  { name: 'Groundnut Oil', category: 'Other' },
  { name: 'Mustard Oil', category: 'Other' },
  { name: 'Coconut Oil', category: 'Other' },
  { name: 'Ghee', category: 'Other' },
  { name: 'Butter', category: 'Other' },
  { name: 'Sugar', category: 'Other' },
  { name: 'Brown Sugar', category: 'Other' },
  { name: 'Jaggery', category: 'Other' },
  { name: 'Salt', category: 'Other' },
  { name: 'Rock Salt', category: 'Other' },

  // Dairy
  { name: 'Milk', category: 'Dairy' },
  { name: 'Curd', category: 'Dairy' },
  { name: 'Buttermilk', category: 'Dairy' },
  { name: 'Paneer', category: 'Dairy' },
  { name: 'Butter (Dairy)', category: 'Dairy' },
  { name: 'Cheese', category: 'Dairy' },
  { name: 'Cream', category: 'Dairy' },

  // Bakery / eggs
  { name: 'Eggs', category: 'Other' },
  { name: 'Bread (White/Brown)', category: 'Bakery' },
  { name: 'Buns', category: 'Bakery' },
  { name: 'Rusk', category: 'Bakery' },
  { name: 'Cake', category: 'Bakery' },
  { name: 'Khari', category: 'Bakery' },

  // Fruits
  { name: 'Banana', category: 'Fruits' },
  { name: 'Apple', category: 'Fruits' },
  { name: 'Orange', category: 'Fruits' },
  { name: 'Pomegranate', category: 'Fruits' },
  { name: 'Grapes', category: 'Fruits' },
  { name: 'Papaya', category: 'Fruits' },
  { name: 'Mango (Seasonal)', category: 'Fruits' },
  { name: 'Watermelon (Seasonal)', category: 'Fruits' },

  // Vegetables
  { name: 'Onion', category: 'Vegetables' },
  { name: 'Tomato', category: 'Vegetables' },
  { name: 'Potato', category: 'Vegetables' },
  { name: 'Carrot', category: 'Vegetables' },
  { name: 'Beans', category: 'Vegetables' },
  { name: 'Brinjal', category: 'Vegetables' },
  { name: 'Cabbage', category: 'Vegetables' },
  { name: 'Cauliflower', category: 'Vegetables' },
  { name: 'Ladies Finger', category: 'Vegetables' },
  { name: 'Garlic', category: 'Vegetables' },
  { name: 'Ginger', category: 'Vegetables' },
  { name: 'Green Chilli', category: 'Vegetables' },
  { name: 'Curry Leaves', category: 'Vegetables' },
  { name: 'Coriander Leaves', category: 'Vegetables' },

  // Snacks
  { name: 'Glucose Biscuits', category: 'Snacks' },
  { name: 'Cream Biscuits', category: 'Snacks' },
  { name: 'Marie Biscuits', category: 'Snacks' },
  { name: 'Chips', category: 'Snacks' },
  { name: 'Mixture', category: 'Snacks' },
  { name: 'Murukku', category: 'Snacks' },
  { name: 'Popcorn', category: 'Snacks' },
  { name: 'Chocolates', category: 'Snacks' },
  { name: 'Candy', category: 'Snacks' },

  // Ready foods / breakfast
  { name: 'Maggi Noodles', category: 'Other' },
  { name: 'Pasta', category: 'Other' },
  { name: 'Vermicelli', category: 'Other' },
  { name: 'Poha', category: 'Other' },
  { name: 'Ready Mix (Idli/Dosa)', category: 'Other' },
  { name: 'Oats (Breakfast)', category: 'Other' },
  { name: 'Cornflakes', category: 'Other' },
  { name: 'Soup Packets', category: 'Other' },

  // Beverages
  { name: 'Tea Powder', category: 'Beverages' },
  { name: 'Coffee Powder', category: 'Beverages' },
  { name: 'Boost / Horlicks', category: 'Beverages' },
  { name: 'Soft Drinks', category: 'Beverages' },
  { name: 'Fruit Juices', category: 'Beverages' },
  { name: 'Mineral Water (Bottled)', category: 'Beverages' },

  // Personal care
  { name: 'Bath Soap', category: 'Other' },
  { name: 'Shampoo', category: 'Other' },
  { name: 'Hair Oil', category: 'Other' },
  { name: 'Toothpaste', category: 'Other' },
  { name: 'Toothbrush', category: 'Other' },
  { name: 'Face Wash', category: 'Other' },
  { name: 'Sanitary Pads', category: 'Other' },
  { name: 'Shaving Cream', category: 'Other' },

  // Home care
  { name: 'Washing Powder', category: 'Other' },
  { name: 'Dish Wash Liquid', category: 'Other' },
  { name: 'Floor Cleaner', category: 'Other' },
  { name: 'Toilet Cleaner', category: 'Other' },
  { name: 'Phenyl', category: 'Other' },
  { name: 'Garbage Bags', category: 'Other' },
  { name: 'Matchbox', category: 'Other' },
  { name: 'Agarbathi', category: 'Other' },
];

// Apply simple defaults so these items work with the Product schema
const buildProducts = () =>
  extraProducts.map((item) => ({
    name: item.name,
    description: `${item.name} - common grocery item.`,
    category: item.category,
    price: 50, // default price; can be edited later in Admin Dashboard
    stock: 50,
    rating: 4.5,
    isActive: true,
  }));

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');

    const docs = buildProducts();
    const result = await Product.insertMany(docs);
    console.log(`✅ Added ${result.length} inventory items.`);

    process.exit(0);
  } catch (err) {
    console.error('❌ Error adding inventory items:', err);
    process.exit(1);
  }
})();
