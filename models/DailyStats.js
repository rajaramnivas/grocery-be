const mongoose = require('mongoose');

const dailyStatsSchema = new mongoose.Schema(
    {
        date: {
            type: Date,
            required: true,
            index: true,
        },
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true,
            index: true,
        },
        totalRevenue: {
            type: Number,
            default: 0,
            min: 0,
        },
        totalCost: {
            type: Number,
            default: 0,
            min: 0,
        },
        totalProfit: {
            type: Number,
            default: 0,
        },
        quantitySold: {
            type: Number,
            default: 0,
            min: 0,
        },
    },
    { timestamps: true }
);

// Compound index for date and product
dailyStatsSchema.index({ date: 1, productId: 1 }, { unique: true });

module.exports = mongoose.model('DailyStats', dailyStatsSchema);
