const mongoose = require('mongoose');

const shoppingListSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  description: {
    type: String,
    required: true
  },
  icon: {
    type: String,
    default: '🛍️',
    description: 'Emoji icon for the list'
  },
  iconUrl: {
    type: String,
    description: 'Image URL icon (optional, can be used instead of emoji)'
  },
  products: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  category: {
    type: String,
    enum: ['breakfast', 'meals', 'snacks', 'healthy', 'budget', 'party', 'cooking', 'weekly', 'other'],
    default: 'other'
  },
  displayOrder: {
    type: Number,
    default: 0
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('ShoppingList', shoppingListSchema);
