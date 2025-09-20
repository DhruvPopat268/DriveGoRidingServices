const express = require('express');
const router = express.Router();
const PriceCategory = require('../models/PriceCategory');

// Create new price category
router.post('/', async (req, res) => {
  try {
    const { priceCategoryName, description, category, chargePerKm, chargePerMinute } = req.body;
    const newCategory = new PriceCategory({ 
      priceCategoryName, 
      description,
      category, 
      chargePerKm, 
      chargePerMinute 
    });
    const saved = await newCategory.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get all price categories with populated category details
router.get('/', async (req, res) => {
  try {
    const categories = await PriceCategory.find()
      .populate('category', 'name description image')
      .sort({ createdAt: -1 });
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update price category by ID
router.put('/:id', async (req, res) => {
  try {
    const updated = await PriceCategory.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { new: true }
    ).populate('category', 'name description image');
    
    if (!updated) return res.status(404).json({ error: 'Price category not found' });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete price category by ID
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await PriceCategory.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Price category not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/by-category', async (req, res) => {
  try {
    const { categoryId } = req.body;
    
    // Validate categoryId is provided
    if (!categoryId) {
      return res.status(400).json({ error: 'categoryId is required' });
    }

    // Find price categories with the specified categoryId
    const priceCategories = await PriceCategory.find({ category: categoryId })
      .populate('category', 'name description image')
      .sort({ createdAt: -1 });

    res.json(priceCategories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;