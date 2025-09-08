const express = require('express');
const router = express.Router();
const ReferralRule = require('../models/ReferralRule');

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
    const { commission, MaxReferrals  } = req.body;
    
    const newRule = new ReferralRule({
      commission: parseFloat(commission),
      MaxReferrals : parseInt(MaxReferrals )
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
    const { commission, MaxReferrals  } = req.body;
    
    const updatedRule = await ReferralRule.findByIdAndUpdate(
      req.params.id,
      { 
        commission: parseFloat(commission),
        MaxReferrals : parseInt(MaxReferrals )
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

module.exports = router;