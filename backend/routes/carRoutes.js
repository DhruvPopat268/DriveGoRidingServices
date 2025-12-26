const express = require('express');
const router = express.Router();
const Car = require('../models/Car');
const driverAuthMiddleware = require('../middleware/driverAuthMiddleware');
const adminAuthMiddleware = require('../middleware/adminAuthMiddleware');

// Get all cars
router.get('/', adminAuthMiddleware, async (req, res) => {
  try {
    const cars = await Car.find().populate('category', 'name').populate('vehicleType', 'name').sort({ createdAt: -1 });
    res.json(cars);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get car by ID
router.get('/:id',adminAuthMiddleware, async (req, res) => {
  try {
    const car = await Car.findById(req.params.id).populate('category', 'name').populate('vehicleType', 'name');
    if (!car) {
      return res.status(404).json({ message: 'Car not found' });
    }
    res.json(car);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create car
router.post('/', adminAuthMiddleware, async (req, res) => {
  try {
    const { name, description, category, vehicleType, image, seater } = req.body;
    const car = new Car({ name, description, category, vehicleType, image, seater });
    await car.save();
    const populatedCar = await Car.findById(car._id).populate('category', 'name').populate('vehicleType', 'name');
    res.status(201).json(populatedCar);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update car
router.put('/:id', adminAuthMiddleware, async (req, res) => {
  try {
    const { name, description, category, vehicleType, image, seater } = req.body;
    const updateData = { name, description, category, vehicleType, seater };
    if (image) {
      updateData.image = image;
    }
    
    const car = await Car.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).populate('category', 'name').populate('vehicleType', 'name');
    
    if (!car) {
      return res.status(404).json({ message: 'Car not found' });
    }
    res.json(car);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update car status
router.patch('/:id/status', adminAuthMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    const car = await Car.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate('category', 'name').populate('vehicleType', 'name');
    
    if (!car) {
      return res.status(404).json({ message: 'Car not found' });
    }
    res.json(car);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});



// Delete car
router.delete('/:id', adminAuthMiddleware, async (req, res) => {
  try {
    const car = await Car.findByIdAndDelete(req.params.id);
    if (!car) {
      return res.status(404).json({ message: 'Car not found' });
    }
    res.json({ message: 'Car deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> Driver <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<< 

// Get cars by vehicle type
router.post('/by-vehicle-type',driverAuthMiddleware, async (req, res) => {
  try {
    const { vehicleTypeId } = req.body;
    
    if (!vehicleTypeId) {
      return res.status(400).json({ message: 'vehicleTypeId is required' });
    }
    
    const cars = await Car.find({ vehicleType: vehicleTypeId, status: true })
      .populate('category', 'name')
      .populate('vehicleType', 'name')
      .sort({ createdAt: -1 });
    
    res.json({ status: true, data: cars });
  } catch (error) {
    res.status(500).json({ status: false, message: error.message });
  }
});

module.exports = router;