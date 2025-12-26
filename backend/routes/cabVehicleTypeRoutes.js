const express = require('express');
const router = express.Router();
const VehicleType = require('../models/cabVehicleType');
const driverAuthMiddleware = require('../middleware/driverAuthMiddleware');
const adminAuthMiddleware = require('../middleware/adminAuthMiddleware');

// Get all vehicle types
router.get('/',adminAuthMiddleware, async (req, res) => {
  try {
    const vehicleTypes = await VehicleType.find().sort({ createdAt: -1 });
    res.json(vehicleTypes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create vehicle type
router.post('/', adminAuthMiddleware, async (req, res) => {
  try {
    const { name, description } = req.body;
    const vehicleType = new VehicleType({ name, description });
    await vehicleType.save();
    res.status(201).json(vehicleType);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update vehicle type
router.put('/:id', adminAuthMiddleware, async (req, res) => {
  try {
    const { name, description } = req.body;
    const vehicleType = await VehicleType.findByIdAndUpdate(
      req.params.id,
      { name, description },
      { new: true }
    );
    if (!vehicleType) {
      return res.status(404).json({ message: 'Vehicle type not found' });
    }
    res.json(vehicleType);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update vehicle type status
router.patch('/:id/status', adminAuthMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    const vehicleType = await VehicleType.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    if (!vehicleType) {
      return res.status(404).json({ message: 'Vehicle type not found' });
    }
    res.json(vehicleType);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete vehicle type
router.delete('/:id', adminAuthMiddleware, async (req, res) => {
  try {
    const vehicleType = await VehicleType.findByIdAndDelete(req.params.id);
    if (!vehicleType) {
      return res.status(404).json({ message: 'Vehicle type not found' });
    }
    res.json({ message: 'Vehicle type deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> Driver <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<< 

router.get('/all',driverAuthMiddleware, async (req, res) => {
  try {
    const vehicleTypes = await VehicleType.find().sort({ createdAt: -1 });
    res.json({ status: true, data: vehicleTypes });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;