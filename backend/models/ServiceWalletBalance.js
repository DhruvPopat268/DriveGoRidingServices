const mongoose = require('mongoose');

const serviceWalletBalanceSchema = new mongoose.Schema({
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: true
  },
  subcategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubCategory',
    required: true
  },
  subSubCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SubSubCategory',
    required: false
  },
  minWalletBalance: {
    type: Number,
    required: true,
    min: 0
  }
}, {
  timestamps: true
});

// Create compound index to ensure unique combinations
serviceWalletBalanceSchema.index({ 
  category: 1, 
  subcategory: 1, 
  subSubCategory: 1 
}, { 
  unique: true,
  partialFilterExpression: { subSubCategory: { $exists: true } }
});

serviceWalletBalanceSchema.index({ 
  category: 1, 
  subcategory: 1 
}, { 
  unique: true,
  partialFilterExpression: { subSubCategory: { $exists: false } }
});

module.exports = mongoose.model('ServiceWalletBalance', serviceWalletBalanceSchema);