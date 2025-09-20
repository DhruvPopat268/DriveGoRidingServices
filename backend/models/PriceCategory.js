// models/PriceCategory.js
const mongoose = require('mongoose');

const priceCategorySchema = new mongoose.Schema({
  priceCategoryName: { type: String, required: true, unique: true }
}, { timestamps: true });

module.exports = mongoose.model('PriceCategory', priceCategorySchema);