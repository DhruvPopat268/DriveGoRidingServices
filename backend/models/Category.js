const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Category name is required'],
    trim: true,
    unique: true,
    minlength: [2, 'Category name must be at least 2 characters long'],
    maxlength: [50, 'Category name cannot exceed 50 characters']
  }
}, {
  timestamps: true // Adds createdAt and updatedAt fields automatically
});

const Category = mongoose.model('Category', categorySchema);

module.exports = Category;
