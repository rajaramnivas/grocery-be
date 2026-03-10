require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

async function clearUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/grocery_store');
    console.log('Connected to MongoDB');

    const result = await User.deleteMany({});
    console.log(`✅ Successfully deleted ${result.deletedCount} user accounts`);
    console.log('🎉 Database is now fresh! You can register new accounts.');

    await mongoose.connection.close();
    console.log('Connection closed');
    process.exit(0);
  } catch (error) {
    console.error('Error clearing users:', error);
    process.exit(1);
  }
}

clearUsers();
