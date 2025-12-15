const express = require('express');
const router = express.Router();
const ReferralRule = require('../models/ReferralRule');
const Category = require('../models/Category');
const { 
  calculateDriverRideCostWithReferral,
  calculateCabRideCostWithReferral,
  calculateParcelRideCostWithReferral
} = require('../utils/rideCalculation');
const authMiddleware = require('../middleware/authMiddleware');
const Rider = require('../models/Rider');
const { wallet } = require('../models/Payment&Wallet');

// GET all referral rules
router.get('/', async (req, res) => {
  try {
    const rules = await ReferralRule.find().sort({ createdAt: -1 });
    res.json(rules); // This will return an array
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET a specific referral rule
router.get('/:id', async (req, res) => {
  try {
    const rule = await ReferralRule.findById(req.params.id);
    if (!rule) {
      return res.status(404).json({ message: 'Rule not found' });
    }
    res.json(rule);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// CREATE a new referral rule
router.post('/', async (req, res) => {
  try {
    const { commission, MaxReferrals, allowCommissionToUsed, status } = req.body;
    
    const newRule = new ReferralRule({
      commission: parseFloat(commission),
      MaxReferrals: parseInt(MaxReferrals),
      allowCommissionToUsed: parseFloat(allowCommissionToUsed) || 0,
      status: status !== undefined ? status : true
    });
    
    const savedRule = await newRule.save();
    res.status(201).json(savedRule);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// UPDATE a referral rule
router.put('/:id', async (req, res) => {
  try {
    const { commission, MaxReferrals, allowCommissionToUsed, status } = req.body;
    
    const updatedRule = await ReferralRule.findByIdAndUpdate(
      req.params.id,
      { 
        commission: parseFloat(commission),
        MaxReferrals: parseInt(MaxReferrals),
        allowCommissionToUsed: parseFloat(allowCommissionToUsed) || 0,
        status: status !== undefined ? status : true
      },
      { new: true, runValidators: true }
    );
    
    if (!updatedRule) {
      return res.status(404).json({ message: 'Rule not found' });
    }
    
    res.json(updatedRule);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// DELETE a referral rule
router.delete('/:id', async (req, res) => {
  try {
    const deletedRule = await ReferralRule.findByIdAndDelete(req.params.id);
    
    if (!deletedRule) {
      return res.status(404).json({ message: 'Rule not found' });
    }
    
    res.json({ message: 'Rule deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST calculate ride cost with referral
router.post('/calculate-ride', authMiddleware, async (req, res) => {
  try {
    const { categoryId } = req.body;

    const riderId = req.rider?.riderId;
    const rider = await Rider.findById(riderId);

    // ⬅️ ADD rider inside req.body (so calculation functions get it)
    req.body.rider = rider;

    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    const walletDoc = await wallet.findOne({ riderId });
    const walletBalance = walletDoc ? walletDoc.balance : 0;

    const categoryName = category.name.toLowerCase();
    let result;

    if (categoryName === 'driver') {
      result = await calculateDriverRideCostWithReferral(req.body);
    } else if (categoryName === 'cab') {
      result = await calculateCabRideCostWithReferral(req.body);
    } else if (categoryName === 'parcel') {
      result = await calculateParcelRideCostWithReferral(req.body);
    } else {
      return res.status(400).json({ message: 'Invalid category type' });
    }

    const totalPayable =
      result.driverCharges +
      result.pickCharges +
      result.peakCharges +
      result.nightCharges +
      result.insuranceCharges +
      result.adminCharges +
      result.gstCharges +
      result.cancellationCharges;

    res.json({ ...result, totalPayable , walletBalance });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;