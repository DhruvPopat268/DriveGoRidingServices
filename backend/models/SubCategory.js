const mongoose = require('mongoose');

const subCategorySchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String }, // new field
  image: { type: String }, // store image URL or filename
  categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
  status: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true });

module.exports = mongoose.model('SubCategory', subCategorySchema);
