const express = require('express');
const router = express.Router();
const CarCategory = require('../models/CarCategory');
const adminAuthMiddleware = require('../middleware/adminAuthMiddleware');

// Get all car categories
router.get('/', adminAuthMiddleware, async (req, res) => {
  try {
    const categories = await CarCategory.find().sort({ createdAt: -1 });
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create car category
router.post('/', adminAuthMiddleware, async (req, res) => {
  try {
    const { name, description } = req.body;
    const category = new CarCategory({ name, description });
    await category.save();
    res.status(201).json(category);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update car category
router.put('/:id', adminAuthMiddleware, async (req, res) => {
  try {
    const { name, description } = req.body;
    const category = await CarCategory.findByIdAndUpdate(
      req.params.id,
      { name, description },
      { new: true }
    );
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    res.json(category);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update category status
router.patch('/:id/status', adminAuthMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    const category = await CarCategory.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    
    // Update all cars in this category to match the category status
    const Car = require('../models/Car');
    await Car.updateMany(
      { category: req.params.id },
      { status }
    );
    
    res.json(category);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete car category
router.delete('/:id', adminAuthMiddleware, async (req, res) => {
  try {
    const category = await CarCategory.findByIdAndDelete(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;