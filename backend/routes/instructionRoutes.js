const express = require('express');
const router = express.Router();
const Instruction = require('../models/Instruction');
const SubCategory = require('../models/SubCategory');
const Category = require('../models/Category');
const axios = require('axios'); // Add this if not already imported

// Create instruction
router.post('/', async (req, res) => {
  try {
    const { categoryId, subCategoryId, driverCategoryId, instructions } = req.body;

    // Validate required fields
    if (!categoryId || !subCategoryId || !driverCategoryId || !instructions) {
      return res.status(400).json({
        success: false,
        message: 'categoryId, subCategoryId, driverCategoryId, and instructions are required'
      });
    }

    // Find category and subcategory names by their IDs
    const category = await Category.findById(categoryId);
    const subCategory = await SubCategory.findById(subCategoryId);

    if (!category || !subCategory) {
      return res.status(404).json({
        success: false,
        message: 'Category or SubCategory not found'
      });
    }

    // Fetch driver category name from price-categories API
    let driverCategoryName = '';
    try {
      const response = await axios.get('https://drivegoridingservices-backend.onrender.com/api/price-categories');
      const priceCategories = response.data;
      const driverCategory = priceCategories.find(cat => cat._id === driverCategoryId);

      if (!driverCategory) {
        return res.status(404).json({
          success: false,
          message: 'Driver category not found'
        });
      }

      driverCategoryName = driverCategory.priceCategoryName;
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch driver category details'
      });
    }

    // Create instruction using the names from DB and API
    const instruction = new Instruction({
      categoryId,
      categoryName: category.name,
      subCategoryId,
      subCategoryName: subCategory.name,
      driverCategoryId,
      driverCategoryName,
      instructions,
    });

    await instruction.save();
    res.status(201).json({ success: true, data: instruction });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get all instructions
router.get('/', async (req, res) => {
  try {
    const instructions = await Instruction.find().sort({ createdAt: -1 });
    res.json({ success: true, data: instructions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/getInstructions', async (req, res) => {
  const { categoryId, subCategoryId, selectedCategoryName } = req.body;

  if (!categoryId || !subCategoryId) {
    return res.status(400).json({
      success: false,
      message: 'categoryId and subCategoryId are required'
    });
  }

  try {
    // Build query object
    const query = { categoryId, subCategoryId };

    // Add driverCategoryName to query if provided
    if (selectedCategoryName) {
      query.driverCategoryName = selectedCategoryName;
    }

    const instructions = await Instruction.find(query);
    const instructionTexts = instructions.map((item) => item.instructions);

    res.json({
      success: true,
      categoryId,
      subCategoryId,
      selectedCategoryName,
      instructions: instructionTexts
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});


// Update instruction
router.put('/:id', async (req, res) => {
  try {
    const { categoryId, subCategoryId, driverCategoryId, instructions } = req.body;

    // If driverCategoryId is being updated, fetch the new driver category name
    if (driverCategoryId) {
      try {
        const response = await axios.get(`${process.env.API_URL}/api/price-categories`);
        const priceCategories = response.data;
        const driverCategory = priceCategories.find(cat => cat._id === driverCategoryId);

        if (driverCategory) {
          req.body.driverCategoryName = driverCategory.priceCategoryName;
        }
      } catch (error) {
        console.error('Failed to fetch driver category details during update:', error);
      }
    }

    // If categoryId is being updated, fetch the new category name
    if (categoryId) {
      const category = await Category.findById(categoryId);
      if (category) {
        req.body.categoryName = category.name;
      }
    }

    // If subCategoryId is being updated, fetch the new subcategory name
    if (subCategoryId) {
      const subCategory = await SubCategory.findById(subCategoryId);
      if (subCategory) {
        req.body.subCategoryName = subCategory.name;
      }
    }

    const instruction = await Instruction.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!instruction) {
      return res.status(404).json({ success: false, message: 'Instruction not found' });
    }

    res.json({ success: true, data: instruction });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Delete instruction
router.delete('/:id', async (req, res) => {
  try {
    const instruction = await Instruction.findByIdAndDelete(req.params.id);
    if (!instruction) {
      return res.status(404).json({ success: false, message: 'Instruction not found' });
    }
    res.json({ success: true, message: 'Instruction deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;