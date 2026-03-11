const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add a product name'],
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Please add a description'],
    },
    price: {
      type: Number,
      required: [true, 'Please add a price'],
      min: 0,
    },
    costPrice: {
      type: Number,
      description: 'Cost price for calculating profit',
      min: 0,
    },
    buyingDate: {
      type: Date,
      description: 'Date when the product was purchased/stocked'
    },
    originalPrice: {
      type: Number,
    },
    category: {
      type: String,
      required: [true, 'Please add a category'],
      trim: true,
      // Category names are managed at the application level (admin UI and
      // filters). We intentionally do not enforce a fixed enum here so we can
      // evolve categories like "Rice & Grains", "Flours", etc. without
      // breaking existing data.
    },
    image: {
      type: String,
      description: 'Image URL for the product'
    },
    imageUrl: {
      type: String,
      description: 'Alias for image field - use this for consistency'
    },
    stock: {
      type: Number,
      default: 0,
    },
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    reviews: [
      {
        userId: mongoose.Schema.Types.ObjectId,
        userName: String,
        rating: Number,
        comment: String,
        date: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    sku: {
      type: String,
      // SKU is optional and not enforced as unique at the database level.
      // If you want uniqueness, manage it at the application layer instead
      // of blocking edits/creates when users don't care about SKU.
    },
    supplier: String,
    expiryDate: {
      type: Date,
      default: () => {
        const d = new Date();
        d.setMonth(d.getMonth() + 6);
        return d;
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // Simple boolean flag to mark a product as part of
    // today's Daily Deals (typically 3–5 products per day)
    isDailyDeal: {
      type: Boolean,
      default: false,
    },
    // Remaining quantity available under today's daily-deal offer
    dailyDealRemaining: {
      type: Number,
      default: 0,
      min: 0,
    },
    isOrganic: {
      type: Boolean,
      default: false,
    },
    isLocal: {
      type: Boolean,
      default: false,
    },
    isFreshToday: {
      type: Boolean,
      default: false,
    },
    freshnessDate: {
      type: Date,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Product', productSchema);
