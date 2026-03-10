require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('./models/Product');
const User = require('./models/User');

const products = [
  // Vegetables (10)
  { name: 'Fresh Tomatoes', description: 'Farm-fresh ripe red tomatoes, perfect for salads and cooking. Rich in vitamins and antioxidants.', price: 45, category: 'Vegetables', stock: 100, rating: 4.5, sku: 'VEG001', image: 'https://images.unsplash.com/photo-1546470427-227cafd394b4?w=400' },
  { name: 'Onions', description: 'Premium quality golden onions, essential for every kitchen. Long-lasting and flavorful.', price: 30, category: 'Vegetables', stock: 150, rating: 4.2, sku: 'VEG002', image: 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=400' },
  { name: 'Potatoes', description: 'Fresh farm potatoes, versatile for frying, boiling, or baking. High in fiber and nutrients.', price: 25, category: 'Vegetables', stock: 200, rating: 4.6, sku: 'VEG003', image: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=400' },
  { name: 'Carrots', description: 'Crisp orange carrots packed with beta-carotene. Great for salads, juices, and cooking.', price: 40, category: 'Vegetables', stock: 120, rating: 4.4, sku: 'VEG004', image: 'https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=400' },
  { name: 'Cabbage', description: 'Fresh green cabbage, excellent source of vitamins. Perfect for slaws and stir-fries.', price: 35, category: 'Vegetables', stock: 80, rating: 4.3, sku: 'VEG005', image: 'https://images.unsplash.com/photo-1594282528588-4fc7b08f39e0?w=400' },
  { name: 'Spinach', description: 'Fresh organic spinach leaves, iron-rich superfood. Perfect for smoothies and salads.', price: 50, category: 'Vegetables', stock: 60, rating: 4.7, sku: 'VEG006', image: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=400' },
  { name: 'Broccoli', description: 'Premium green broccoli florets, high in fiber and vitamins. Great for steaming and stir-fries.', price: 55, category: 'Vegetables', stock: 70, rating: 4.5, sku: 'VEG007', image: 'https://images.unsplash.com/photo-1459411621453-7b03977f4bfc?w=400' },
  { name: 'Cauliflower', description: 'Fresh white cauliflower, low-carb versatile vegetable. Perfect for rice alternatives.', price: 50, category: 'Vegetables', stock: 75, rating: 4.4, sku: 'VEG008', image: 'https://images.unsplash.com/photo-1568584711271-29cc2f2e8f0c?w=400' },
  { name: 'Bell Peppers', description: 'Colorful mix of bell peppers, sweet and crunchy. Rich in vitamin C and antioxidants.', price: 60, category: 'Vegetables', stock: 90, rating: 4.6, sku: 'VEG009', image: 'https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?w=400' },
  { name: 'Cucumber', description: 'Fresh crisp cucumbers, hydrating and refreshing. Perfect for salads and pickles.', price: 35, category: 'Vegetables', stock: 110, rating: 4.3, sku: 'VEG010', image: 'https://images.unsplash.com/photo-1604977042946-1eecc30f269e?w=400' },

  // Fruits (10)
  { name: 'Apples', description: 'Crisp red apples, naturally sweet and juicy. Perfect for snacking or baking delicious pies.', price: 80, category: 'Fruits', stock: 100, rating: 4.7, sku: 'FRT001', image: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=400' },
  { name: 'Bananas', description: 'Premium yellow bananas, rich in potassium. Great energy booster for any time of day.', price: 40, category: 'Fruits', stock: 150, rating: 4.8, sku: 'FRT002', image: 'https://images.unsplash.com/photo-1603833665858-e61d17a86224?w=400' },
  { name: 'Oranges', description: 'Juicy fresh oranges bursting with vitamin C. Perfect for fresh juice or healthy snacking.', price: 60, category: 'Fruits', stock: 120, rating: 4.6, sku: 'FRT003', image: 'https://images.unsplash.com/photo-1611080626919-7cf5a9dbab5b?w=400' },
  { name: 'Grapes', description: 'Sweet seedless grapes, perfect bite-sized treat. Rich in antioxidants and natural sugars.', price: 120, category: 'Fruits', stock: 80, rating: 4.7, sku: 'FRT004', image: 'https://images.unsplash.com/photo-1599819177442-2b9f39b3a00a?w=400' },
  { name: 'Strawberries', description: 'Premium fresh strawberries, sweet and aromatic. Perfect for desserts and smoothies.', price: 150, category: 'Fruits', stock: 50, rating: 4.8, sku: 'FRT005', image: 'https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=400' },
  { name: 'Mango', description: 'Tropical sweet mangoes, king of fruits. Rich in vitamins and perfect for juices and desserts.', price: 100, category: 'Fruits', stock: 70, rating: 4.7, sku: 'FRT006', image: 'https://images.unsplash.com/photo-1553279768-865429fa0078?w=400' },
  { name: 'Papaya', description: 'Fresh ripe papaya, excellent for digestion. Sweet tropical flavor loaded with nutrients.', price: 70, category: 'Fruits', stock: 60, rating: 4.5, sku: 'FRT007', image: 'https://images.unsplash.com/photo-1617112848923-cc2234396a8d?w=400' },
  { name: 'Pineapple', description: 'Sweet golden pineapple, tropical delight. Perfect for grilling, juicing, or fresh eating.', price: 90, category: 'Fruits', stock: 50, rating: 4.6, sku: 'FRT008', image: 'https://images.unsplash.com/photo-1550258987-190a2d41a8ba?w=400' },
  { name: 'Watermelon', description: 'Refreshing sweet watermelon, perfect for summer. Hydrating and naturally sweet fruit.', price: 150, category: 'Fruits', stock: 40, rating: 4.7, sku: 'FRT009', image: 'https://images.unsplash.com/photo-1587049352846-4a222e784acc?w=400' },
  { name: 'Kiwi', description: 'Fresh tangy kiwi fruits, vitamin C powerhouse. Unique flavor perfect for fruit salads.', price: 110, category: 'Fruits', stock: 55, rating: 4.6, sku: 'FRT010', image: 'https://images.unsplash.com/photo-1585059895524-72359e06133a?w=400' },

  // Dairy (8)
  { name: 'Milk (1L)', description: 'Farm-fresh pasteurized cow milk, rich in calcium. Essential for strong bones and teeth.', price: 55, category: 'Dairy', stock: 100, rating: 4.6, sku: 'DAI001', image: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400' },
  { name: 'Yogurt (500g)', description: 'Creamy probiotic yogurt, great for digestion. Perfect for breakfast or smoothies.', price: 45, category: 'Dairy', stock: 80, rating: 4.5, sku: 'DAI002', image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400' },
  { name: 'Cheese (200g)', description: 'Premium aged cheddar cheese, rich and creamy. Perfect for sandwiches and cooking.', price: 120, category: 'Dairy', stock: 60, rating: 4.7, sku: 'DAI003', image: 'https://images.unsplash.com/photo-1452195100486-9cc805987862?w=400' },
  { name: 'Butter (200g)', description: 'Pure creamy butter made from fresh cream. Essential for baking and cooking.', price: 90, category: 'Dairy', stock: 70, rating: 4.6, sku: 'DAI004', image: 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=400' },
  { name: 'Paneer (250g)', description: 'Fresh cottage cheese paneer, high in protein. Perfect for Indian dishes and grilling.', price: 110, category: 'Dairy', stock: 50, rating: 4.7, sku: 'DAI005', image: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=400' },
  { name: 'Cream (200ml)', description: 'Fresh dairy cream for cooking and desserts. Makes dishes rich and delicious.', price: 75, category: 'Dairy', stock: 40, rating: 4.5, sku: 'DAI006', image: 'https://images.unsplash.com/photo-1628088062854-d1870b4553da?w=400' },
  { name: 'Ghee (250ml)', description: 'Pure clarified butter ghee, traditional and aromatic. Healthy cooking fat with high smoke point.', price: 180, category: 'Dairy', stock: 30, rating: 4.8, sku: 'DAI007', image: 'https://images.unsplash.com/photo-1631274321259-8b0e6288b04e?w=400' },
  { name: 'Condensed Milk', description: 'Sweet condensed milk for desserts and beverages. Perfect for sweets and coffee.', price: 60, category: 'Dairy', stock: 50, rating: 4.4, sku: 'DAI008', image: 'https://images.unsplash.com/photo-1620706857370-e1b9770e8bb1?w=400' },

  // Grains (6)
  { name: 'Rice (1kg)', description: 'Premium basmati rice with long grains. Aromatic and fluffy when cooked, perfect for biryanis.', price: 120, category: 'Grains', stock: 100, rating: 4.7, sku: 'GRN001', image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400' },
  { name: 'Wheat Flour (1kg)', description: 'Stone-ground whole wheat flour, high in fiber. Perfect for rotis, bread, and baking.', price: 45, category: 'Grains', stock: 80, rating: 4.5, sku: 'GRN002', image: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400' },
  { name: 'Lentils (1kg)', description: 'Premium red lentils, protein-rich superfood. Quick cooking and perfect for dal and soups.', price: 85, category: 'Grains', stock: 60, rating: 4.6, sku: 'GRN003', image: 'https://images.unsplash.com/photo-160484392737-8eb0e2ac5a38?w=400' },
  { name: 'Chickpeas (1kg)', description: 'Premium dried chickpeas, versatile protein source. Great for hummus, curries, and salads.', price: 90, category: 'Grains', stock: 50, rating: 4.5, sku: 'GRN004', image: 'https://images.unsplash.com/photo-1610632380934-83b72f657d4b?w=400' },
  { name: 'Oats (500g)', description: 'Whole rolled oats, heart-healthy breakfast choice. Perfect for porridge, cookies, and smoothies.', price: 80, category: 'Grains', stock: 70, rating: 4.7, sku: 'GRN005', image: 'https://images.unsplash.com/photo-1497888329096-51c27beff665?w=400' },
  { name: 'Corn Flour (500g)', description: 'Fine corn flour for baking and thickening. Gluten-free alternative for various recipes.', price: 45, category: 'Grains', stock: 60, rating: 4.4, sku: 'GRN006', image: 'https://images.unsplash.com/photo-1605792657660-596af9009e82?w=400' },

  // Bakery (4)
  { name: 'Bread (White)', description: 'Soft fresh white bread, perfect for sandwiches and toast. Baked daily with quality ingredients.', price: 35, category: 'Bakery', stock: 50, rating: 4.5, sku: 'BAK001', image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400' },
  { name: 'Bread (Brown)', description: 'Wholesome brown bread with whole grains. Healthier option rich in fiber and nutrients.', price: 40, category: 'Bakery', stock: 45, rating: 4.6, sku: 'BAK002', image: 'https://images.unsplash.com/photo-1598373182133-52452f7691ef?w=400' },
  { name: 'Croissants (6pc)', description: 'Buttery flaky croissants, French bakery classic. Perfect for breakfast or afternoon tea.', price: 120, category: 'Bakery', stock: 30, rating: 4.7, sku: 'BAK003', image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400' },
  { name: 'Cookies (200g)', description: 'Delicious chocolate chip cookies, perfect treat. Crispy outside, chewy inside, made with love.', price: 60, category: 'Bakery', stock: 40, rating: 4.4, sku: 'BAK004', image: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=400' },

  // Meat (3)
  { name: 'Chicken Breast (1kg)', description: 'Fresh boneless chicken breast, lean protein source. Perfect for grilling, baking, or curries.', price: 280, category: 'Meat', stock: 50, rating: 4.7, sku: 'MET001', image: 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=400' },
  { name: 'Ground Meat (500g)', description: 'Fresh lean ground meat, versatile for multiple dishes. Perfect for burgers, meatballs, and pasta.', price: 160, category: 'Meat', stock: 40, rating: 4.5, sku: 'MET002', image: 'https://images.unsplash.com/photo-1603048588665-791ca8aea617?w=400' },
  { name: 'Fish (500g)', description: 'Fresh ocean fish, rich in omega-3 fatty acids. Perfect for grilling, frying, or steaming.', price: 250, category: 'Meat', stock: 35, rating: 4.6, sku: 'MET003', image: 'https://images.unsplash.com/photo-1615141982883-c7ad0e69fd62?w=400' },

  // Beverages (4)
  { name: 'Orange Juice (1L)', description: 'Freshly squeezed orange juice, 100% natural. No added sugar, packed with vitamin C.', price: 80, category: 'Beverages', stock: 60, rating: 4.5, sku: 'BEV001', image: 'https://images.unsplash.com/photo-1600271886742-f049cd451bba?w=400' },
  { name: 'Tea (250g)', description: 'Premium black tea leaves, aromatic and refreshing. Perfect morning energizer with rich flavor.', price: 150, category: 'Beverages', stock: 40, rating: 4.6, sku: 'BEV002', image: 'https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?w=400' },
  { name: 'Coffee (250g)', description: 'Premium ground coffee beans, rich and aromatic. Perfect for espresso, cappuccino, or drip coffee.', price: 200, category: 'Beverages', stock: 35, rating: 4.7, sku: 'BEV003', image: 'https://images.unsplash.com/photo-1447933601403-0c6688de566e?w=400' },
  { name: 'Mineral Water (2L)', description: 'Pure natural mineral water, essential hydration. Sourced from pristine springs, naturally filtered.', price: 30, category: 'Beverages', stock: 100, rating: 4.4, sku: 'BEV004', image: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400' },

  // Snacks (3)
  { name: 'Chips (150g)', description: 'Crispy salted potato chips, perfect snack. Made from premium potatoes, lightly salted.', price: 40, category: 'Snacks', stock: 80, rating: 4.3, sku: 'SNK001', image: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400' },
  { name: 'Nuts Mix (200g)', description: 'Premium mixed nuts blend, healthy snacking. Cashews, almonds, and pistachios roasted to perfection.', price: 180, category: 'Snacks', stock: 50, rating: 4.7, sku: 'SNK002', image: 'https://images.unsplash.com/photo-1599599810769-bcde5a160d32?w=400' },
  { name: 'Popcorn (150g)', description: 'Buttered popcorn kernels, movie night essential. Light, fluffy, and deliciously buttery.', price: 60, category: 'Snacks', stock: 60, rating: 4.4, sku: 'SNK003', image: 'https://images.unsplash.com/photo-1578849278619-e73505e9610f?w=400' },

  // Spices (2)
  { name: 'Turmeric Powder (100g)', description: 'Pure organic turmeric powder, anti-inflammatory superfood. Essential spice for Indian cooking.', price: 80, category: 'Spices', stock: 40, rating: 4.6, sku: 'SPC001', image: 'https://images.unsplash.com/photo-1615485500704-8e990f9900f7?w=400' },
  { name: 'Chili Powder (100g)', description: 'Premium red chili powder, adds perfect heat. Essential for spicy curries and marinades.', price: 90, category: 'Spices', stock: 35, rating: 4.5, sku: 'SPC002', image: 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccc?w=400' },
];

async function seedDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');

    // Clear existing products
    await Product.deleteMany({});
    console.log('Cleared existing products');

    // Insert products
    const result = await Product.insertMany(products);
    console.log(`✅ Successfully seeded ${result.length} products!`);

    // Create default admin user
    const adminEmail = 'rajaramnivas26@gmail.com';
    let adminUser = await User.findOne({ email: adminEmail });
    
    if (!adminUser) {
      adminUser = new User({
        name: 'RJARAM S',
        email: adminEmail,
        password: 'raja@123',
        phone: '7530020883',
        role: 'admin'
      });
      await adminUser.save();
      console.log('\n✅ Default admin user created:');
      console.log('   Email: rajaramnivas26@gmail.com');
      console.log('   Password: raja@123');
    } else {
      console.log('\n✅ Admin user already exists');
    }

    // Display summary
    const categories = {};
    result.forEach(p => {
      categories[p.category] = (categories[p.category] || 0) + 1;
    });

    console.log('\n📊 Products by Category:');
    Object.entries(categories).forEach(([cat, count]) => {
      console.log(`  ${cat}: ${count} products`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();
