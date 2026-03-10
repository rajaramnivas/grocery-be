const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');

dotenv.config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/grocery_store')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log('MongoDB connection error:', err));

const updateAdminUser = async () => {
  try {
    // Find and update the admin user
    const adminEmail = 'rajaramnivas26@gmail.com';
    
    const user = await User.findOne({ email: adminEmail });
    
    if (user) {
      console.log(`Found user: ${user.name} (${user.email})`);
      console.log(`Current role: ${user.role}`);
      
      if (user.role !== 'admin') {
        user.role = 'admin';
        await user.save();
        console.log(`✅ Updated user role to: ${user.role}`);
      } else {
        console.log('✅ User already has admin role');
      }
    } else {
      console.log(`❌ User not found with email: ${adminEmail}`);
      console.log('\nTo create an admin user, use the /api/auth/register endpoint with the desired credentials');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
};

updateAdminUser();
