require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const Product = require('./models/Product');

(async () => {
  try {
    await connectDB();

    console.log('Checking existing indexes on products collection...');
    const indexes = await Product.collection.indexes();
    const skuIndex = indexes.find((idx) => idx.key && idx.key.sku === 1);

    if (skuIndex) {
      console.log(`Dropping existing SKU index: ${skuIndex.name}`);
      await Product.collection.dropIndex(skuIndex.name);
      console.log('SKU index dropped. It will no longer be enforced as unique.');
    } else {
      console.log('No existing SKU index found; nothing to drop.');
    }

    // After index is dropped, it is safe (but optional) to clean
    // any documents that stored sku as null/empty string. This
    // step is mainly for data hygiene and can be skipped if desired.
    console.log('Cleaning products with null/empty SKU (optional hygiene step)...');
    try {
      const unsetNullResult = await Product.updateMany(
        { sku: null },
        { $unset: { sku: 1 } }
      );
      const unsetEmptyResult = await Product.updateMany(
        { sku: '' },
        { $unset: { sku: 1 } }
      );

      console.log(`Unset sku:null on ${unsetNullResult.modifiedCount} products.`);
      console.log(`Unset sku:'' on ${unsetEmptyResult.modifiedCount} products.`);
    } catch (innerErr) {
      console.warn('Warning while cleaning SKU values (safe to ignore):', innerErr.message);
    }
  } catch (err) {
    console.error('Error fixing SKU index:', err);
  } finally {
    await mongoose.connection.close();
    console.log('MongoDB connection closed.');
    process.exit(0);
  }
})();
