
const express = require('express');
const router = express.Router();
const Instruction = require('../models/Instruction');
const SubCategory = require('../models/SubCategory');
const Category = require('../models/Category');

// Create instruction
router.post('/', async (req, res) => {
  try {
    const { categoryId, subCategoryId, instructions } = req.body;

    // Validate required fields
    if (!categoryId || !subCategoryId || !instructions) {
      return res.status(400).json({ success: false, message: 'categoryId, subCategoryId, and instructions are required' });
    }

    // Find category and subcategory names by their IDs
    const category = await Category.findById(categoryId);
    const subCategory = await SubCategory.findById(subCategoryId);

    if (!category || !subCategory) {
      return res.status(404).json({ success: false, message: 'Category or SubCategory not found' });
    }

    // Create instruction using the names from DB
    const instruction = new Instruction({
      categoryId,
      categoryName: category.name,
      subCategoryId,
      subCategoryName: subCategory.name,
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
  const { categoryId, subCategoryId } = req.body;

  if (!categoryId || !subCategoryId) {
    return res.status(400).json({
      success: false,
      message: 'categoryId and subCategoryId are required'
    });
  }

  try {
    const instructions = await Instruction.find({ categoryId, subCategoryId });

    const instructionTexts = instructions.map((item) => item.instructions);

    res.json({
      success: true,
      categoryId,
      subCategoryId,
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
    const instruction = await Instruction.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!instruction) return res.status(404).json({ success: false, message: 'Instruction not found' });
    res.json({ success: true, data: instruction });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Delete instruction
router.delete('/:id', async (req, res) => {
  try {
    const instruction = await Instruction.findByIdAndDelete(req.params.id);
    if (!instruction) return res.status(404).json({ success: false, message: 'Instruction not found' });
    res.json({ success: true, message: 'Instruction deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
