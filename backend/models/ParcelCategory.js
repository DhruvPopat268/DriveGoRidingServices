const mongoose = require('mongoose');

const parcelCategorySchema = new mongoose.Schema({
  categoryName: { type: String, required: true, unique: true },
  description: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('ParcelCategory', parcelCategorySchema);