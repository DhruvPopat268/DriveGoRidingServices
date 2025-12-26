const express = require('express');
const router = express.Router();
const ParcelCategory = require('../models/ParcelCategory');
const adminAuthMiddleware = require('../middleware/adminAuthMiddleware');

// Create new parcel category
router.post('/', adminAuthMiddleware, async (req, res) => {
  try {
    const { categoryName, description } = req.body;
    const newCategory = new ParcelCategory({
      categoryName,
      description
    });
    const saved = await newCategory.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get all parcel categories
router.get('/', adminAuthMiddleware, async (req, res) => {
  try {
    const categories = await ParcelCategory.find().sort({ createdAt: -1 });
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get parcel category by ID
router.get('/:id', adminAuthMiddleware, async (req, res) => {
  try {
    const category = await ParcelCategory.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ error: 'Parcel category not found' });
    }
    res.json(category);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update parcel category by ID
router.put('/:id', adminAuthMiddleware, async (req, res) => {
  try {
    const updated = await ParcelCategory.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!updated) return res.status(404).json({ error: 'Parcel category not found' });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete parcel category by ID
router.delete('/:id', adminAuthMiddleware, async (req, res) => {
  try {
    const deleted = await ParcelCategory.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Parcel category not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;