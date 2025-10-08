const express = require('express');
const router = express.Router();
const SubscriptionPlan = require('../DriverModel/SubscriptionPlan');
const driverAuthMiddleware = require('../middleware/driverAuthMiddleware')


// Get all subscription plans
router.get('/', async (req, res) => {
  try {
    const plans = await SubscriptionPlan.find().sort({ createdAt: -1 });
    res.json(plans);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create subscription plan
router.post('/', async (req, res) => {
  try {
    const { name, duration, days, description, amount } = req.body;
    
    if (!name || !duration || !days || amount === undefined) {
      return res.status(400).json({ success: false, message: 'Name, duration, days, and amount are required' });
    }

    const plan = new SubscriptionPlan({ name, duration, days, description, amount });
    await plan.save();
    
    res.status(201).json({ success: true, data: plan });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Update subscription plan
router.put('/:id', async (req, res) => {
  try {
    const { name, duration, days, description, amount } = req.body;
    
    const plan = await SubscriptionPlan.findByIdAndUpdate(
      req.params.id,
      { name, duration, days, description, amount },
      { new: true, runValidators: true }
    );
    
    if (!plan) {
      return res.status(404).json({ success: false, message: 'Subscription plan not found' });
    }
    
    res.json({ success: true, data: plan });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Update subscription plan status
router.put('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const plan = await SubscriptionPlan.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    
    if (!plan) {
      return res.status(404).json({ success: false, message: 'Subscription plan not found' });
    }
    
    res.json({ success: true, data: plan });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Delete subscription plan
router.delete('/:id', async (req, res) => {
  try {
    const plan = await SubscriptionPlan.findByIdAndDelete(req.params.id);
    
    if (!plan) {
      return res.status(404).json({ success: false, message: 'Subscription plan not found' });
    }
    
    res.json({ success: true, message: 'Subscription plan deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>           Driver                >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

// Get all subscription plans
router.get('/all',driverAuthMiddleware, async (req, res) => {
  try {
    const plans = await SubscriptionPlan.find().sort({ createdAt: -1 });

    res.json({
      success: true,
      data: plans, // directly return array instead of wrapping in { plans }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});


module.exports = router;