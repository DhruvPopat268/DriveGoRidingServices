const express = require('express');
const router = express.Router();
const parcelVehicle = require('../models/ParcelVehicle');
const driverAuthMiddleware = require('../middleware/driverAuthMiddleware');

// Create new parcel vehicle type
router.post('/', async (req, res) => {
  try {
    const { parcelCategory, name, description, weight , parcelVehicleType } = req.body;  // include weight
    const newVehicleType = new parcelVehicle({
      parcelCategory,
      name,
      description,
      weight,
      parcelVehicleType
    });
    const saved = await newVehicleType.save();
    const populated = await parcelVehicle.findById(saved._id).populate('parcelCategory');
    res.status(201).json(populated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});


// Get all parcel vehicle types
router.get('/', async (req, res) => {
  try {
    const vehicleTypes = await parcelVehicle.find().populate('parcelCategory parcelVehicleType').sort({ createdAt: -1 });
    res.json(vehicleTypes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get parcel vehicle type by ID
router.get('/:id', async (req, res) => {
  try {
    const vehicleType = await parcelVehicle.findById(req.params.id).populate('parcelCategory');
    if (!vehicleType) {
      return res.status(404).json({ error: 'Parcel vehicle type not found' });
    }
    res.json(vehicleType);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update parcel vehicle type by ID
router.put('/:id', async (req, res) => {
  try {
    const updated = await parcelVehicle.findByIdAndUpdate(
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
    const deleted = await parcelVehicle.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Parcel vehicle type not found' });
    res.json({ message: 'Deleted successfully' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> Driver <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<< 

// Find parcel vehicles by parcelVehicleType
router.post('/by-type',driverAuthMiddleware, async (req, res) => {
  try {
    const { parcelVehicleType } = req.body;
    const vehicles = await parcelVehicle.find({ parcelVehicleType }).populate('parcelCategory parcelVehicleType');
    res.json({ status: true, data: vehicles });
  } catch (err) {
    res.status(500).json({ status: false, error: err.message });
  }
});

module.exports = router;