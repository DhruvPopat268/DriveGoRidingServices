const express = require('express');
const router = express.Router();
const ParcelVehicleType = require('../models/parcelVehicleType');
const driverAuthMiddleware = require('../middleware/driverAuthMiddleware');
const adminAuthMiddleware = require('../middleware/adminAuthMiddleware');

// Get all parcel vehicle types
router.get('/', adminAuthMiddleware, async (req, res) => {
  try {
    const parcelVehicleTypes = await ParcelVehicleType.find().sort({ createdAt: -1 });
    res.json(parcelVehicleTypes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create parcel vehicle type
router.post('/', adminAuthMiddleware, async (req, res) => {
  try {
    const { name, description } = req.body;
    const parcelVehicleType = new ParcelVehicleType({ name, description });
    await parcelVehicleType.save();
    res.status(201).json(parcelVehicleType);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update parcel vehicle type
router.put('/:id', adminAuthMiddleware, async (req, res) => {
  try {
    const { name, description } = req.body;
    const parcelVehicleType = await ParcelVehicleType.findByIdAndUpdate(
      req.params.id,
      { name, description },
      { new: true }
    );
    if (!parcelVehicleType) {
      return res.status(404).json({ message: 'Parcel vehicle type not found' });
    }
    res.json(parcelVehicleType);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update parcel vehicle type status
router.patch('/:id/status', adminAuthMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    const parcelVehicleType = await ParcelVehicleType.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    if (!parcelVehicleType) {
      return res.status(404).json({ message: 'Parcel vehicle type not found' });
    }
    res.json(parcelVehicleType);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete parcel vehicle type
router.delete('/:id', adminAuthMiddleware, async (req, res) => {
  try {
    const parcelVehicleType = await ParcelVehicleType.findByIdAndDelete(req.params.id);
    if (!parcelVehicleType) {
      return res.status(404).json({ message: 'Parcel vehicle type not found' });
    }
    res.json({ message: 'Parcel vehicle type deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> Driver <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<< 

// Driver routes
router.get('/all', driverAuthMiddleware, async (req, res) => {
  try {
    const parcelVehicleTypes = await ParcelVehicleType.find().sort({ createdAt: -1 });
    res.json({ status: true, data: parcelVehicleTypes });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;