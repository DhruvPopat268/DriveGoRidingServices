const express = require('express');
const router = express.Router();
const DriverVehicleType = require('../models/DriverVehicleType');
const VehicleCategory = require('../models/VehicleCategory');
const DriverAuthMiddleware = require('../middleware/driverAuthMiddleware');

router.get('/', async (req, res) => {
  const types = await DriverVehicleType.find();
  res.json({ success: true, data: types });
});

router.get('/active', async (req, res) => {
  const types = await DriverVehicleType.find({ status: true });
  res.json({ success: true, data: types });
});

router.get('/userApp/active', DriverAuthMiddleware, async (req, res) => {
  const types = await DriverVehicleType.find({ status: true });
  res.json({ success: true, data: types });
});

router.post('/', async (req, res) => {
  try {
    const type = await DriverVehicleType.create(req.body);
    res.status(201).json({ success: true, data: type });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const updated = await DriverVehicleType.findByIdAndUpdate(req.params.id, req.body, { new: true });
    
    if (req.body.status !== undefined) {
      await VehicleCategory.updateMany(
        { DriveVehicleType: req.params.id },
        { status: req.body.status }
      );
    }
    
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await DriverVehicleType.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Deleted successfully' });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

module.exports = router;
