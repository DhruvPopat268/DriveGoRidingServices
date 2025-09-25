const mongoose = require('mongoose');

const subSubCategorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  image: { type: String },
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  subCategoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'SubCategory', required: true }
}, { timestamps: true });

module.exports = mongoose.model('SubSubCategory', subSubCategorySchema);