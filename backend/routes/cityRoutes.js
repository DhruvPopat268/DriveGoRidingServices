const express = require('express');
const router = express.Router();
const City = require('../models/City');
const State = require('../models/State');

// GET ALL CITIES
router.get("/", async (req, res) => {
  try {
    const cities = await City.find().populate('state', 'name').sort({ createdAt: -1 });
    res.status(200).json(cities);
  } catch (error) {
    res.status(500).json({ message: "Error fetching cities", error: error.message });
  }
});

// GET ACTIVE STATES FOR DROPDOWN
router.get("/active-states", async (req, res) => {
  try {
    const states = await State.find({ status: true }).sort({ name: 1 });
    res.status(200).json(states);
  } catch (error) {
    res.status(500).json({ message: "Error fetching active states", error: error.message });
  }
});

// CREATE CITY
router.post('/', async (req, res) => {
  try {
    const { name, state } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'City name is required' });
    }

    if (!state) {
      return res.status(400).json({ success: false, message: 'State is required' });
    }

    const existingCity = await City.findOne({ name: name.trim(), state });
    if (existingCity) {
      return res.status(400).json({ success: false, message: 'City already exists in this state' });
    }

    const city = await City.create({
      name: name.trim(),
      state,
    });

    const populatedCity = await City.findById(city._id).populate('state', 'name');

    res.status(201).json({
      success: true,
      message: 'City created successfully',
      data: populatedCity,
    });
  } catch (error) {
    console.error('Error creating city:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
});

// UPDATE CITY
router.put('/:id', async (req, res) => {
  try {
    const { name, state, status } = req.body;
    const updateData = {};
    
    if (name !== undefined) updateData.name = name.trim();
    if (state !== undefined) updateData.state = state;
    if (status !== undefined) updateData.status = status;

    const city = await City.findByIdAndUpdate(req.params.id, updateData, { new: true }).populate('state', 'name');
    if (!city) return res.status(404).json({ success: false, message: 'City not found' });

    res.json({ success: true, message: 'City updated successfully', data: city });
  } catch (error) {
    console.error('Error updating city:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
});

// DELETE CITY
router.delete('/:id', async (req, res) => {
  try {
    const city = await City.findById(req.params.id);
    if (!city) return res.status(404).json({ success: false, message: 'City not found' });

    await city.deleteOne();
    res.json({ success: true, message: 'City deleted successfully' });
  } catch (error) {
    console.error('Error deleting city:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
});

module.exports = router;