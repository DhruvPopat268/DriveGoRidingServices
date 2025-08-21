const express = require('express');
const router = express.Router();
const RideCost = require('../models/RideCost');
const peakHours = require('../models/Peak')
const pricecategories = require('../models/PriceCategory')
const moment = require('moment');

router.post('/', async (req, res) => {
  try {
    const rideCost = new RideCost(req.body);
    const saved = await rideCost.save();
    res.status(201).json({
      success: true,
      message: 'Ride cost model created successfully',
      data: saved
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
});

// GET ALL - Retrieve all ride cost models
router.get('/', async (req, res) => {
  try {
    const rideCosts = await RideCost.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: rideCosts.length,
      data: rideCosts
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// GET BY ID - Retrieve single ride cost model
router.get('/:id', async (req, res) => {
  try {
    const rideCost = await RideCost.findById(req.params.id);
    if (!rideCost) {
      return res.status(404).json({
        success: false,
        error: 'Ride cost model not found'
      });
    }
    res.status(200).json({
      success: true,
      data: rideCost
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

router.post('/calculation', async (req, res) => {
  try {
    const fullData = req.body;
    const {
      selectedDate,
      selectedTime,
      includeInsurance,
      selectedUsage,
      subcategoryName,
    } = fullData;

    const modelType = subcategoryName.toLowerCase().replace(/\s+/g, '');
    let usageValue = parseFloat(selectedUsage);

    // Convert to minutes if modelType is hourly
    if (modelType === 'hourly') {
      usageValue = usageValue * 60;
    }

    const charges = await RideCost.findOne({ modelType });
    const peakChargesList = await peakHours.find({});
    const categoryPrices = await pricecategories.find({});

    if (!charges || categoryPrices.length === 0) {
      return res.status(404).json({ error: 'Required data not found' });
    }

    const bookingDateTime = moment(`${selectedDate} ${selectedTime}`, 'YYYY-MM-DD HH:mm');
    const pickCharges = charges.pickCharges || 0;

    // 1. Peak Charges
    let peakCharges = 0;
    for (const peak of peakChargesList) {
      if (peak.type === 'peak_dates') {
        const startDateTime = moment(`${peak.startDate} ${peak.startTime}`, 'YYYY-MM-DD HH:mm');
        const endDateTime = moment(`${peak.endDate} ${peak.endTime}`, 'YYYY-MM-DD HH:mm');
        if (bookingDateTime.isBetween(startDateTime, endDateTime, null, '[]')) {
          peakCharges += peak.price;
        }
      } else if (peak.type === 'peak_hours') {
        const startTime = moment(`${selectedDate} ${peak.startTime}`, 'YYYY-MM-DD HH:mm');
        const endTime = moment(`${selectedDate} ${peak.endTime}`, 'YYYY-MM-DD HH:mm');
        if (bookingDateTime.isBetween(startTime, endTime, null, '[]')) {
          peakCharges += peak.price;
        }
      }
    }

    // 2. Insurance & Night Charges
    const insuranceCharges = includeInsurance ? charges.insurance : 0;
    const hour = bookingDateTime.hour();
    const nightCharges = (hour >= 22 || hour < 6) ? charges.nightCharges : 0;

    // 3. Final result with detailed breakdown for each category
    const result = [];

    categoryPrices.forEach((cat) => {
      let driverCharges = 0;
      if (modelType === 'oneway') {
        driverCharges = usageValue * cat.chargePerKm;
      } else {
        driverCharges = usageValue * cat.chargePerMinute;
      }

      const baseTotal = driverCharges + pickCharges + peakCharges + insuranceCharges + nightCharges;

      // Admin commission is % of baseTotal
      const adminCommission = Math.round((baseTotal * charges.extraChargesFromAdmin) / 100);
      let subtotal = baseTotal + adminCommission;

      // Apply discount on commission
      let adjustedAdminCommission = adminCommission;
      if (charges.discount > 0) {
        adjustedAdminCommission -= charges.discount;
      }

      const gstCharges = Math.round((adjustedAdminCommission * charges.gst) / 100);
      const totalPayable = Math.round(subtotal + gstCharges);

      result.push({
        category: cat.priceCategoryName,
        driverCharges: Math.round(driverCharges),
        pickCharges: Math.round(pickCharges),
        peakCharges: Math.round(peakCharges),
        insuranceCharges: Math.round(insuranceCharges),
        nightCharges: Math.round(nightCharges),
        // adminCommissionPercent: charges.extraChargesFromAdmin,
        adminCommissionAmount: adminCommission,
        discount: charges.discount,
        gstCharges,
        subtotal: Math.round(subtotal),
        totalPayable
      });
    });

    res.json(result);

  } catch (err) {
    console.error('Error in /calculation route:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET BY MODEL TYPE - Retrieve ride cost models by type
router.get('/type/:modelType', async (req, res) => {
  try {
    const { modelType } = req.params;
    const validTypes = ['oneway', 'roundtrip', 'hourly', 'monthly', 'weekly'];

    if (!validTypes.includes(modelType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid model type'
      });
    }

    const rideCosts = await RideCost.find({ modelType }).sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: rideCosts.length,
      data: rideCosts
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

// UPDATE - Update ride cost model
router.put('/:id', async (req, res) => {
  try {
    const rideCost = await RideCost.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!rideCost) {
      return res.status(404).json({
        success: false,
        error: 'Ride cost model not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Ride cost model updated successfully',
      data: rideCost
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
});

// DELETE - Delete ride cost model
router.delete('/:id', async (req, res) => {
  try {
    const rideCost = await RideCost.findByIdAndDelete(req.params.id);

    if (!rideCost) {
      return res.status(404).json({
        success: false,
        error: 'Ride cost model not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Ride cost model deleted successfully'
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

module.exports = router;
