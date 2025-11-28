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

router.get("/drivers/purchased-plans", async (req, res) => {
  try {
    // Fetch all drivers who have purchased plans
    const drivers = await Driver.find(
      { "purchasedPlans.0": { $exists: true } } // only drivers with purchasedPlans
    )
    .select("mobile personalInformation purchasedPlans")
    .populate({
      path: "purchasedPlans.plan", // populate the plan ObjectId
      model: "SubscriptionPlan",
      select: "name" // only fetch the plan name
    }).sort({ 'purchasedPlans.purchasedAt': -1 }); // sort by purchasedAt descending

    // Transform response to include driver info and plan name
    const result = drivers.map(driver => {
      return driver.purchasedPlans.map(plan => ({
        driverId: driver._id,
        driverName: driver.personalInformation.fullName,
        driverMobile: driver.mobile,
        paymentId: plan.paymentId,
        planName: plan.plan?.name || plan.plan, // if plan populated, show name
        amount: plan.amount,
        status: plan.status,
        purchasedAt: plan.purchasedAt
      }));
    }).flat();

    res.json({
      success: true,
      totalPlans: result.length,
      purchasedPlans: result
    });

  } catch (error) {
    console.error("Fetch purchased plans error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch purchased plans"
    });
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
      
      return res.status(400).json({
        message: "Mobile, paymentId, status, and plan are required"
      });
    }

  

    const driver = await Driver.findOneAndUpdate(
      { mobile, status: "PendingForPayment" },
      { status: "Onreview" },
      { new: true }
    );

    if (!driver) {
     
      return res.status(404).json({ message: "Driver not found or not pending payment" });
    }

  

    const subscriptionPlan = driver.paymentAndSubscription?.subscriptionPlan;
   

    if (!subscriptionPlan) {
      
      return res.status(400).json({ message: "Subscription plan not found" });
    }

    const planDuration = await SubscriptionPlan.findById(subscriptionPlan).select("days");
    const currentPlan = await SubscriptionPlan.findById(subscriptionPlan);
    const amount = currentPlan?.amount;

    // Calculate expiry date and set currentPlan
    const now = new Date();
    let expiryDate;
    if (driver.currentPlan?.expiryDate && driver.currentPlan.expiryDate > now) {
      expiryDate = new Date(driver.currentPlan.expiryDate);
      expiryDate.setDate(expiryDate.getDate() + planDuration.days); // extend from current expiry
    } else {
      expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + planDuration.days); // start from today
    }

    // Set currentPlan to activate the purchased plan
    driver.currentPlan = { planId: subscriptionPlan, expiryDate };
    driver.purchasedPlans.push({ paymentId, status, plan: subscriptionPlan, amount });
    await driver.save();

    res.json({
      success: true,
      message: "Purchased plan added successfully",
      purchasedPlans: driver.purchasedPlans
    });
  } catch (error) {
    console.error("❌ Add purchased plan error:", error);
    res.status(500).json({ success: false, message: "Failed to add purchased plan" });
  }
});


router.post("/driver/update-plan", DriverAuthMiddleware, async (req, res) => {
  try {
    const { planId, paymentId, status, amount } = req.body;
    
    if (!planId || !paymentId || !status || !amount) {
      return res.status(400).json({ 
        success: false, 
        message: "planId, paymentId, status, and amount are required" 
      });
    }

    // ✅ Get driverId from middleware
    const driverId = req.driver.driverId;
    // console.log("Driver ID from middleware:", driverId);

    // 1️⃣ Fetch subscription plan
    const plan = await SubscriptionPlan.findById(planId);
    if (!plan) {
      return res.status(404).json({ 
        success: false, 
        message: "Subscription plan not found" 
      });
    }

    // 2️⃣ Validate amount
    if (plan.amount !== amount) {
      return res.status(400).json({
        success: false,
        message: `Amount mismatch. Plan amount is ${plan.amount}`
      });
    }

    // 3️⃣ Calculate expiry date (stacking logic)
    const driver = await Driver.findById(driverId);
    if (!driver) {
      return res.status(404).json({ 
        success: false, 
        message: "Driver not found" 
      });
    }

    const now = new Date();
    let expiryDate;
    if (driver.currentPlan?.expiryDate && driver.currentPlan.expiryDate > now) {
      expiryDate = new Date(driver.currentPlan.expiryDate);
      expiryDate.setDate(expiryDate.getDate() + plan.days); // extend from current expiry
    } else {
      expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + plan.days); // start from today
    }

    // 4️⃣ Update driver document
    driver.paymentAndSubscription.subscriptionPlan = plan._id;
    driver.currentPlan = { planId: plan._id, expiryDate };
    driver.purchasedPlans.push({
      paymentId,
      status,
      plan: plan._id, // store ObjectId instead of name
      amount
    });

    await driver.save();

    res.json({ 
      success: true, 
      message: "Driver plan updated successfully", 
      driver 
    });

  } catch (error) {
    console.error("Update plan error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to update driver plan" 
    });
  }
});

// get current subscription plan and purchased plans array for specific driver
router.get("/driver/subscription-info", DriverAuthMiddleware, async (req, res) => {
  try {
    const driverId = req.driver.driverId;

    // Find driver with all subscription details
    const driver = await Driver.findById(driverId)
      .populate('currentPlan.planId')
      .select('currentPlan purchasedPlans paymentAndSubscription')
      .lean();

    if (!driver) {
      return res.status(404).json({ 
        success: false, 
        message: "Driver not found" 
      });
    }

    // Process current plan
    let currentPlanInfo = null;
    
    if (driver.currentPlan && driver.currentPlan.planId) {
      const now = new Date();
      const isExpired = driver.currentPlan.expiryDate < now;
      console.log('expiry date',driver.currentPlan.expiryDate)
      const daysRemaining = isExpired 
        ? 0 
        : Math.ceil((driver.currentPlan.expiryDate - now) / (1000 * 60 * 60 * 24));

      currentPlanInfo = {
        planId: driver.currentPlan.planId._id,
        planName: driver.currentPlan.planId.name,
        planType: driver.currentPlan.planId.type,
        duration: driver.currentPlan.planId.days,
        price: driver.currentPlan.planId.price,
        features: driver.currentPlan.planId.features,
        expiryDate: driver.currentPlan.expiryDate,
        daysRemaining,
        isExpired,
        status: isExpired ? "Expired" : "Active"
      };
    }

    // Process purchased plans
    const purchasedPlans = (driver.purchasedPlans || []).sort((a, b) => 
      new Date(b.purchasedAt) - new Date(a.purchasedAt)
    );

    // Calculate statistics
    const stats = {
      totalPurchases: purchasedPlans.length,
      successfulPurchases: purchasedPlans.filter(p => p.status === "Success").length,
      failedPurchases: purchasedPlans.filter(p => p.status === "Failed").length,
      pendingPurchases: purchasedPlans.filter(p => p.status === "Pending").length,
      totalAmountSpent: purchasedPlans
        .filter(p => p.status === "Success")
        .reduce((sum, p) => sum + (p.amount || 0), 0)
    };

    res.json({ 
      success: true, 
      message: "Subscription info fetched successfully",
      currentPlan: currentPlanInfo,
      purchasedPlans,
      statistics: stats
    });

  } catch (error) {
    console.error("Get subscription info error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch subscription info" 
    });
  }
});

module.exports = router;