const express = require('express');
const router = express.Router();
const ParcelVehicleType = require('../models/ParcelVehicleType');

// Create new parcel vehicle type
router.post('/', async (req, res) => {
  try {
    const { parcelCategory, name, description, weight } = req.body;  // include weight
    const newVehicleType = new ParcelVehicleType({
      parcelCategory,
      name,
      description,
      weight
    });
    const saved = await newVehicleType.save();
    const populated = await ParcelVehicleType.findById(saved._id).populate('parcelCategory');
    res.status(201).json(populated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});


// Get all parcel vehicle types
router.get('/', async (req, res) => {
  try {
    const vehicleTypes = await ParcelVehicleType.find().populate('parcelCategory').sort({ createdAt: -1 });
    res.json(vehicleTypes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update parcel vehicle type by ID
router.put('/:id', async (req, res) => {
  try {
    const updated = await ParcelVehicleType.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    ).populate('parcelCategory');

    if (!updated) return res.status(404).json({ error: 'Parcel vehicle type not found' });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete parcel vehicle type by ID
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await ParcelVehicleType.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Parcel vehicle type not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;