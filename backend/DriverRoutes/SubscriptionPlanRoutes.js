const express = require('express');
const router = express.Router();
const SubscriptionPlan = require('../DriverModel/SubscriptionPlan');
const driverAuthMiddleware = require('../middleware/driverAuthMiddleware')
const registration = require('../DriverModel/RegistrationFee')
const DriverAuthMiddleware = require('../middleware/driverAuthMiddleware');
const Driver = require('../DriverModel/DriverModel');
const { totalmem } = require('os');

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
router.get('/all', driverAuthMiddleware, async (req, res) => {
  try {
    const plans = await SubscriptionPlan.find();
    const registrationFee = await registration.find({ status: true });
    const fee = registrationFee[0].fee

    res.json({
      success: true,
      registrationFee: fee,
      data: plans, // directly return array instead of wrapping in { plans }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

router.get('/planPayment', DriverAuthMiddleware, async (req, res) => {

  const mobile = req.driver?.mobile;
  const driver = await Driver.findOne({ mobile });
  const subscriptionPlan = driver.paymentAndSubscription?.subscriptionPlan
  const oneTimeRegistrationFee = await registration.findOne({ status: true });

  const currentPlan = await SubscriptionPlan.findById(subscriptionPlan).select('_id name duration amount')

  res.json({
    success: true,
    message: "TotalPayable fetched successfully",
    plan: currentPlan,
    oneTimeRegistrationFee: oneTimeRegistrationFee?.fee || 0,
    totalPayable: (currentPlan?.amount || 0) + (oneTimeRegistrationFee?.fee || 0)
  });
})

router.post("/add-purchased-plan", DriverAuthMiddleware, async (req, res) => {
  try {
    const { paymentId, status } = req.body;
    const mobile = req.driver?.mobile;

    if (!mobile || !paymentId || !status) {
      return res.status(400).json({ message: "Mobile, paymentId, status, and plan are required" });
    }

    const driver = await Driver.findOneAndUpdate(
      { mobile, status: "PendingForPayment" }, // condition: only if status is PendingForPayment
      { status: "Onreview" },                   // update: set new status
      { new: true }                             // return updated document
    );

    const subscriptionPlan = driver.paymentAndSubscription?.subscriptionPlan

    const planDuration = await SubscriptionPlan.findById(subscriptionPlan).select('days')

    console.log("Plan Duration:", planDuration);

    const currentPlan = await SubscriptionPlan.findById(subscriptionPlan)

    console.log("Current Plan:", currentPlan);

    const amount = currentPlan?.amount

    driver.purchasedPlans.push({ paymentId, status, plan: subscriptionPlan, amount });
    await driver.save();

    res.json({
      success: true,
      message: "Purchased plan added successfully",
      purchasedPlans: driver.purchasedPlans
    });
  } catch (error) {
    console.error("Add purchased plan error:", error);
    res.status(500).json({ success: false, message: "Failed to add purchased plan" });
  }
});

module.exports = router;