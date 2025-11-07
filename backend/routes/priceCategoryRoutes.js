const express = require('express');
const router = express.Router();
const PriceCategory = require('../models/PriceCategory');

// Create new price category
router.post('/', async (req, res) => {
  try {
    const { priceCategoryName, description, category, subcategory, chargePerKm, chargePerMinute } = req.body;
    const newCategory = new PriceCategory({
      priceCategoryName,
      description,
      category,
      subcategory,
      chargePerKm,
      chargePerMinute
    });
    const saved = await newCategory.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get all price categories
router.get('/', async (req, res) => {
  try {
    const categories = await PriceCategory.find().sort({ createdAt: -1 });
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get price category by ID
router.get('/:id', async (req, res) => {
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
router.put('/:id', async (req, res) => {
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
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await PriceCategory.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Price category not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get price categories by category
router.post('/by-category', async (req, res) => {
  try {
    const { categoryId } = req.body;

    if (!categoryId) {
      return res.status(400).json({ error: 'categoryId is required' });
    }

    const priceCategories = await PriceCategory.find({ category: categoryId })
      .populate('category', 'name description image')
      .populate('subcategory', 'name description')
      .sort({ createdAt: -1 });

    res.json(priceCategories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get price categories by subcategory
router.post('/by-subcategory', async (req, res) => {
  try {
    const { subcategoryId } = req.body;

    if (!subcategoryId) {
      return res.status(400).json({ error: 'subcategoryId is required' });
    }

    const priceCategories = await PriceCategory.find({ subcategory: subcategoryId })
      .populate('category', 'name description image')
      .populate('subcategory', 'name description')
      .sort({ createdAt: -1 });

    res.json(priceCategories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get price categories by both category and subcategory
router.post('/by-category-subcategory', async (req, res) => {
  try {
    const { categoryId, subcategoryId } = req.body;

    if (!categoryId || !subcategoryId) {
      return res.status(400).json({ error: 'Both categoryId and subcategoryId are required' });
    }

    const priceCategories = await PriceCategory.find({
      category: categoryId,
      subcategory: subcategoryId
    })
      .populate('category', 'name description image')
      .populate('subcategory', 'name description')
      .sort({ createdAt: -1 });

    res.json(priceCategories);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;