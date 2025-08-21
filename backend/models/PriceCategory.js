// models/PriceCategory.js
const mongoose = require('mongoose');

const priceCategorySchema = new mongoose.Schema({
  priceCategoryName: { type: String, required: true },
  chargePerKm: { type: Number, required: true },
  chargePerMinute: { type: Number, required: true }
}, { timestamps: true });

module.exports = mongoose.model('PriceCategory', priceCategorySchema);
