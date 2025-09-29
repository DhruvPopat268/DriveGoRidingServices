const express = require('express');
const router = express.Router();
const State = require('../models/State');

// GET ALL STATES
router.get("/", async (req, res) => {
  try {
    const states = await State.find().sort({ createdAt: -1 });
    res.status(200).json(states);
  } catch (error) {
    res.status(500).json({ message: "Error fetching states", error: error.message });
  }
});

// CREATE STATE
router.post('/', async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'State name is required' });
    }

    const existingState = await State.findOne({ name: name.trim() });
    if (existingState) {
      return res.status(400).json({ success: false, message: 'State already exists' });
    }

    const state = await State.create({
      name: name.trim(),
    });

    res.status(201).json({
      success: true,
      message: 'State created successfully',
      data: state,
    });
  } catch (error) {
    console.error('Error creating state:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
});

// UPDATE STATE
router.put('/:id', async (req, res) => {
  try {
    const { name, status } = req.body;
    const updateData = {};
    
    if (name !== undefined) updateData.name = name.trim();
    if (status !== undefined) updateData.status = status;

    const state = await State.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!state) return res.status(404).json({ success: false, message: 'State not found' });

    // If state status is being updated, update all cities in this state
    if (status !== undefined) {
      const City = require('../models/City');
      await City.updateMany({ state: req.params.id }, { status: status });
    }

    res.json({ success: true, message: 'State updated successfully', data: state });
  } catch (error) {
    console.error('Error updating state:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
});

// TOGGLE STATE STATUS
router.patch('/:id/toggle-status', async (req, res) => {
  try {
    const state = await State.findById(req.params.id);
    if (!state) return res.status(404).json({ success: false, message: 'State not found' });

    const newStatus = !state.status;
    state.status = newStatus;
    await state.save();

    // Update all cities in this state
    const City = require('../models/City');
    await City.updateMany({ state: req.params.id }, { status: newStatus });

    res.json({ success: true, message: `State ${newStatus ? 'enabled' : 'disabled'} successfully`, data: state });
  } catch (error) {
    console.error('Error toggling state status:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
});

// DELETE STATE
router.delete('/:id', async (req, res) => {
  try {
    const state = await State.findById(req.params.id);
    if (!state) return res.status(404).json({ success: false, message: 'State not found' });

    await state.deleteOne();
    res.json({ success: true, message: 'State deleted successfully' });
  } catch (error) {
    console.error('Error deleting state:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
});

module.exports = router;