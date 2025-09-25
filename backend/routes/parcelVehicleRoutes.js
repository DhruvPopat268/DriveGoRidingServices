const express = require('express');
const router = express.Router();
const ParcelVehicle = require('../models/ParcelVehicle');

// Create new parcel vehicle
router.post('/', async (req, res) => {
  try {
    const { vehicleName } = req.body;
    const newVehicle = new ParcelVehicle({
      vehicleName
    });
    const saved = await newVehicle.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Get all parcel vehicles
router.get('/', async (req, res) => {
  try {
    const vehicles = await ParcelVehicle.find().sort({ createdAt: -1 });
    res.json(vehicles);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update parcel vehicle by ID
router.put('/:id', async (req, res) => {
  try {
    const updated = await ParcelVehicle.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!updated) return res.status(404).json({ error: 'Parcel vehicle not found' });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete parcel vehicle by ID
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await ParcelVehicle.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Parcel vehicle not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;