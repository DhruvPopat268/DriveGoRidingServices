// routes/vehicleCategories.js
const express = require('express');
const router = express.Router();
const VehicleCategory = require('../models/VehicleCategory');
const DriverAuthMiddleware = require('../middleware/driverAuthMiddleware');

// GET all
router.get('/', async (req, res) => {
  const categories = await VehicleCategory.find().populate('DriveVehicleType');
  res.json({ success: true, data: categories });
});

// GET active only
router.get('/active', async (req, res) => {
  const categories = await VehicleCategory.find({ status: true }).populate('DriveVehicleType');
  res.json({ success: true, data: categories });
});

// POST get by DriverVehicleType ID
router.post('/by-type', async (req, res) => {
  try {
    const { driverVehicleTypeId } = req.body;
    const categories = await VehicleCategory.find({ DriveVehicleType: driverVehicleTypeId , status: true }).populate('DriveVehicleType');
    res.json({ success: true, data: categories });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.post('/userApp/by-type',DriverAuthMiddleware, async (req, res) => {
  try {
    const { driverVehicleTypeId } = req.body;
    const categories = await VehicleCategory.find({ DriveVehicleType: driverVehicleTypeId , status: true }).populate('DriveVehicleType');
    res.json({ success: true, data: categories });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// POST create
router.post('/', async (req, res) => {
  try {
    const category = await VehicleCategory.create(req.body);
    res.status(201).json({ success: true, data: category });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// PUT update
router.put('/:id', async (req, res) => {
  try {
    const updated = await VehicleCategory.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate('DriveVehicleType');
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// DELETE
router.delete('/:id', async (req, res) => {
  try {
    await VehicleCategory.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Deleted successfully' });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

module.exports = router;