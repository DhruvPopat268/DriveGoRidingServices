const express = require('express');
const router = express.Router();
const RideCost = require('../models/RideCost');
const Category = require('../models/Category');
const peakHours = require('../models/Peak')
const pricecategories = require('../models/PriceCategory')
const moment = require('moment');
const SubCategory = require('../models/SubCategory');
const SubSubCategory = require('../models/SubSubCategory');

router.post('/', async (req, res) => {
  try {
    const rideCost = new RideCost(req.body);
    const saved = await rideCost.save();
    const populated = await RideCost.findById(saved._id)
      .populate('category', 'name')
      .populate('subcategory', 'name')
      .populate('subSubCategory', 'name')
      .populate('priceCategory', 'priceCategoryName');
    res.status(201).json({
      success: true,
      message: 'Ride cost model created successfully',
      data: populated
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
    const rideCosts = await RideCost.find()
      .populate('category', 'name')
      .populate('subcategory', 'name')
      .populate('subSubCategory', 'name')
      .populate('priceCategory', 'priceCategoryName')
      .sort({ createdAt: -1 });
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
      categoryId,
      selectedDate,
      selectedTime,
      includeInsurance,
      selectedUsage,
      subcategoryId,
      numberOfWeeks,
      numberOfMonths
    } = fullData;

    // 1. Get category from DB
    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }

    // 2. Usage value calculation
    let usageValue = parseFloat(selectedUsage);

    // If subcategory is hourly, convert hours → minutes
    const subcategory = await SubCategory.findById(subcategoryId);
    if (!subcategory) {
      return res.status(404).json({ error: 'Subcategory not found' });
    }

    const formattedSubcategory = subcategory.name.toLowerCase().replace(/\s+/g, '-');
    if (formattedSubcategory === 'hourly') {
      usageValue = usageValue * 60;
    }

    // 3. Fetch charges using categoryId + subcategoryId
    const charges = await RideCost.findOne({
      category: categoryId,
      subcategory: subcategoryId
    });

    if (!charges) {
      return res.status(404).json({ error: 'Charges not found for category + subcategory' });
    }

    const peakChargesList = await peakHours.find({});

    // Fetch all ride cost models for the same category & subcategory
    const rideCostModels = await RideCost.find({
      category: categoryId,
      subcategory: subcategoryId
    });

    if (!charges || rideCostModels.length === 0) {
      return res.status(404).json({ error: 'Required data not found' });
    }

    const bookingDateTime = moment(`${selectedDate} ${selectedTime}`, 'YYYY-MM-DD HH:mm');
    const pickCharges = charges.pickCharges || 0;

    // --- Peak Charges ---
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

    // --- Insurance & Night Charges ---
    const insuranceCharges = includeInsurance ? charges.insurance : 0;
    const hour = bookingDateTime.hour();
    const nightCharges = (hour >= 22 || hour < 6) ? charges.nightCharges : 0;

    // --- Result calculation ---
    const result = [];

    for (const model of rideCostModels) {
      const priceCategoryId = model.priceCategory;
      const priceCategory = await pricecategories.findById(priceCategoryId);

      let driverCharges = 0;

      // Calculate base fare and extra charges
      let baseFare = model.baseFare || 0;
      let extraCharges = 0;
      
      if (formattedSubcategory === 'hourly') {
        // Hourly → usage already converted to minutes above
        const extraMinutes = Math.max(0, usageValue - (model.includedMinutes || 0));
        extraCharges = extraMinutes * (model.extraChargePerMinute || 0);
      } else if (formattedSubcategory === 'weekly') {
        // Weekly → usageValue * perMinute * 60 * 7 * numberOfWeeks
        const weeks = parseInt(numberOfWeeks) || 1;
        const totalMinutes = usageValue * 60 * 7 * weeks;
        const extraMinutes = Math.max(0, totalMinutes - (model.includedMinutes || 0));
        extraCharges = extraMinutes * (model.extraChargePerMinute || 0);
      } else if (formattedSubcategory === 'monthly') {
        // Monthly → usageValue * perMinute * 60 * 30 * numberOfMonths
        const months = parseInt(numberOfMonths) || 1;
        const totalMinutes = usageValue * 60 * 30 * months;
        const extraMinutes = Math.max(0, totalMinutes - (model.includedMinutes || 0));
        extraCharges = extraMinutes * (model.extraChargePerMinute || 0);
      } else {
        // Default → per Km
        const extraKm = Math.max(0, usageValue - (model.includedKm || 0));
        extraCharges = extraKm * (model.extraChargePerKm || 0);
      }
      
      driverCharges = baseFare + extraCharges;

      const modelPickCharges = model.pickCharges || pickCharges;
      const modelNightCharges = (hour >= 22 || hour < 6) ? model.nightCharges || 0 : 0;
      const modelInsurance = includeInsurance ? model.insurance || 0 : 0;
      const cancellationCharges = model.cancellationFee || 0;

      const baseTotal = driverCharges + modelPickCharges + peakCharges + modelNightCharges 

      const adminCommission = Math.round((baseTotal * model.extraChargesFromAdmin) / 100);
      const adjustedAdminCommission = Math.max(0, adminCommission - (model.discount || 0));
      const subtotal = baseTotal + adjustedAdminCommission;

      const gstCharges = Math.ceil((subtotal * model.gst) / 100);
      const totalPayable = Math.round(subtotal + gstCharges + modelInsurance + cancellationCharges);

      result.push({
        category: priceCategory.priceCategoryName,
        driverCharges: Math.round(driverCharges), // amounts in rupees
        pickCharges: Math.round(modelPickCharges),
        peakCharges: Math.round(peakCharges),
        insuranceCharges: Math.round(modelInsurance),
        nightCharges: Math.round(modelNightCharges),
        adminCommissionOriginal: adminCommission,
        adminCommissionAdjusted: adjustedAdminCommission,
        discountApplied: model.discount,
        cancellationCharges: Math.round(cancellationCharges),
        gstCharges,
        subtotal: Math.round(subtotal),
        totalPayable // total amount in rupees
      });
    }

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