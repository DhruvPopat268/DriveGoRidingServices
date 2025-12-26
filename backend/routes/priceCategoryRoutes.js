const express = require('express');
const router = express.Router();
const PriceCategory = require('../models/PriceCategory');
const adminAuthMiddleware = require('../middleware/adminAuthMiddleware');

// Create new price category
router.post('/', adminAuthMiddleware, async (req, res) => {
  try {
    const { priceCategoryName, description } = req.body;
    const newCategory = new PriceCategory({
      priceCategoryName,
      description
    });
    const saved = await newCategory.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get price categories
router.get('/', adminAuthMiddleware, async (req, res) => {
  try {
    const categories = await PriceCategory.find().sort({ createdAt: -1 });
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get price category by ID
router.get('/:id', adminAuthMiddleware, async (req, res) => {
  try {
    const category = await PriceCategory.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ error: 'Price category not found' });
    }
    res.json(category);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update price category by ID
router.put('/:id', adminAuthMiddleware, async (req, res) => {
  try {
    const updated = await PriceCategory.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!updated) return res.status(404).json({ error: 'Price category not found' });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete price category by ID
router.delete('/:id', adminAuthMiddleware, async (req, res) => {
  try {
    const deleted = await PriceCategory.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Price category not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});


module.exports = router;