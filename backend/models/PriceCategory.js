// models/PriceCategory.js
const mongoose = require('mongoose');

const priceCategorySchema = new mongoose.Schema({
  priceCategoryName: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Category",   // references your /api/categories collection
    required: true
  },
  chargePerKm: {
    type: Number,
    required: true
  },
  chargePerMinute: {
    type: Number,
    required: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('PriceCategory', priceCategorySchema);
