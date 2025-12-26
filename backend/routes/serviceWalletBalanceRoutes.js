const express = require('express');
const router = express.Router();
const ServiceWalletBalance = require('../models/ServiceWalletBalance');
const adminAuthMiddleware = require('../middleware/adminAuthMiddleware');

// Get all service wallet balances
router.get('/', adminAuthMiddleware, async (req, res) => {
  try {
    const walletBalances = await ServiceWalletBalance.find()
      .populate('category', 'name')
      .populate('subcategory', 'name')
      .populate('subSubCategory', 'name')
      .sort({ createdAt: -1 });
    
    res.json({ success: true, data: walletBalances });
  } catch (error) {
    console.error('Error fetching service wallet balances:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get service wallet balance by ID
router.get('/:id', adminAuthMiddleware, async (req, res) => {
  try {
    const walletBalance = await ServiceWalletBalance.findById(req.params.id)
      .populate('category', 'name')
      .populate('subcategory', 'name')
      .populate('subSubCategory', 'name');
    
    if (!walletBalance) {
      return res.status(404).json({ success: false, message: 'Service wallet balance not found' });
    }
    
    res.json({ success: true, data: walletBalance });
  } catch (error) {
    console.error('Error fetching service wallet balance:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Create new service wallet balance
router.post('/', adminAuthMiddleware, async (req, res) => {
  try {
    const { category, subcategory, subSubCategory, minWalletBalance } = req.body;

    // Check if combination already exists
    const existingBalance = await ServiceWalletBalance.findOne({
      category,
      subcategory,
      ...(subSubCategory && { subSubCategory })
    });

    if (existingBalance) {
      return res.status(400).json({ 
        success: false, 
        message: 'Wallet balance rule already exists for this service combination' 
      });
    }

    const walletBalance = new ServiceWalletBalance({
      category,
      subcategory,
      ...(subSubCategory && { subSubCategory }),
      minWalletBalance
    });

    await walletBalance.save();
    
    const populatedBalance = await ServiceWalletBalance.findById(walletBalance._id)
      .populate('category', 'name')
      .populate('subcategory', 'name')
      .populate('subSubCategory', 'name');

    res.status(201).json({ success: true, data: populatedBalance });
  } catch (error) {
    console.error('Error creating service wallet balance:', error);
    if (error.code === 11000) {
      res.status(400).json({ 
        success: false, 
        message: 'Wallet balance rule already exists for this service combination' 
      });
    } else {
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
});

// Update service wallet balance
router.put('/:id', adminAuthMiddleware, async (req, res) => {
  try {
    const { category, subcategory, subSubCategory, minWalletBalance } = req.body;

    // Check if combination already exists (excluding current record)
    const existingBalance = await ServiceWalletBalance.findOne({
      _id: { $ne: req.params.id },
      category,
      subcategory,
      ...(subSubCategory && { subSubCategory })
    });

    if (existingBalance) {
      return res.status(400).json({ 
        success: false, 
        message: 'Wallet balance rule already exists for this service combination' 
      });
    }

    const walletBalance = await ServiceWalletBalance.findByIdAndUpdate(
      req.params.id,
      {
        category,
        subcategory,
        ...(subSubCategory && { subSubCategory }),
        minWalletBalance
      },
      { new: true, runValidators: true }
    ).populate('category', 'name')
     .populate('subcategory', 'name')
     .populate('subSubCategory', 'name');

    if (!walletBalance) {
      return res.status(404).json({ success: false, message: 'Service wallet balance not found' });
    }

    res.json({ success: true, data: walletBalance });
  } catch (error) {
    console.error('Error updating service wallet balance:', error);
    if (error.code === 11000) {
      res.status(400).json({ 
        success: false, 
        message: 'Wallet balance rule already exists for this service combination' 
      });
    } else {
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
});

// Delete service wallet balance
router.delete('/:id', adminAuthMiddleware, async (req, res) => {
  try {
    const walletBalance = await ServiceWalletBalance.findByIdAndDelete(req.params.id);
    
    if (!walletBalance) {
      return res.status(404).json({ success: false, message: 'Service wallet balance not found' });
    }

    res.json({ success: true, message: 'Service wallet balance deleted successfully' });
  } catch (error) {
    console.error('Error deleting service wallet balance:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get minimum wallet balance for specific service with subSubCategory
router.get('/service/:category/:subcategory/:subSubCategory', adminAuthMiddleware, async (req, res) => {
  try {
    const { category, subcategory, subSubCategory } = req.params;
    
    const walletBalance = await ServiceWalletBalance.findOne({
      category,
      subcategory,
      subSubCategory
    });
    
    if (!walletBalance) {
      return res.status(404).json({ 
        success: false, 
        message: 'No wallet balance rule found for this service' 
      });
    }

    res.json({ success: true, data: { minWalletBalance: walletBalance.minWalletBalance } });
  } catch (error) {
    console.error('Error fetching service wallet balance:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get minimum wallet balance for specific service without subSubCategory
router.get('/service/:category/:subcategory', adminAuthMiddleware, async (req, res) => {
  try {
    const { category, subcategory } = req.params;
    
    const walletBalance = await ServiceWalletBalance.findOne({
      category,
      subcategory,
      $or: [
        { subSubCategory: { $exists: false } },
        { subSubCategory: null }
      ]
    });
    
    if (!walletBalance) {
      return res.status(404).json({ 
        success: false, 
        message: 'No wallet balance rule found for this service' 
      });
    }

    res.json({ success: true, data: { minWalletBalance: walletBalance.minWalletBalance } });
  } catch (error) {
    console.error('Error fetching service wallet balance:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;