const express = require('express');
const router = express.Router();
const Car = require('../models/Car');

// Get all cars
router.get('/', async (req, res) => {
  try {
    const cars = await Car.find().populate('category', 'name').populate('vehicleType', 'name').sort({ createdAt: -1 });
    res.json(cars);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get car by ID
router.get('/:id', async (req, res) => {
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
router.post('/', async (req, res) => {
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
router.put('/:id', async (req, res) => {
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
router.patch('/:id/status', async (req, res) => {
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
router.delete('/:id', async (req, res) => {
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

module.exports = router;