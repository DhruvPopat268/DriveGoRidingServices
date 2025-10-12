const express = require('express');
const router = express.Router();
const CabRideCost = require('../models/CabRideCost');
const Category = require('../models/Category');
const peakHours = require('../models/Peak')
const pricecategories = require('../models/PriceCategory')
const moment = require('moment');
const SubCategory = require('../models/SubCategory');
const SubSubCategory = require('../models/SubSubCategory');
const car = require('../models/Car');
const CarCategory = require('../models/CarCategory')
const mongoose = require('mongoose');
const authMiddleware = require('../middleware/authMiddleware'); // Ensure this path is correct

// Get all cab ride costs
router.get('/', async (req, res) => {
  try {
    const cabRideCosts = await CabRideCost.find()
      .populate('category', 'name')
      .populate('subcategory', 'name')
      .populate('subSubCategory', 'name')
      .populate('priceCategory', 'name')
      .populate('car', 'name')
      .sort({ createdAt: -1 });

    res.json({ data: cabRideCosts });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    // Create new CabRideCost
    const cabRideCost = new CabRideCost(req.body);
    await cabRideCost.save();

    // Populate related fields including car image
    const populatedCabRideCost = await CabRideCost.findById(cabRideCost._id)
      .populate('category', 'name')
      .populate('subcategory', 'name')
      .populate('subSubCategory', 'name')
      .populate('priceCategory', 'name')
      .populate({
        path: 'car',
        select: 'name image seater', // include image from Car model
      });

    res.status(201).json(populatedCabRideCost);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update cab ride cost
router.put('/:id', async (req, res) => {
  try {
    const cabRideCost = await CabRideCost.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    )
      .populate('category', 'name')
      .populate('subcategory', 'name')
      .populate('subSubCategory', 'name')
      .populate('priceCategory', 'name')
      .populate('car', 'name');

    if (!cabRideCost) {
      return res.status(404).json({ message: 'Cab ride cost not found' });
    }

    res.json(cabRideCost);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete cab ride cost
router.delete('/:id', async (req, res) => {
  try {
    const cabRideCost = await CabRideCost.findByIdAndDelete(req.params.id);

    if (!cabRideCost) {
      return res.status(404).json({ message: 'Cab ride cost not found' });
    }

    res.json({ message: 'Cab ride cost deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/calculation', authMiddleware, async (req, res) => {
  try {
    const {
      carCategoryId,
      categoryId,
      selectedDate,
      selectedTime,
      includeInsurance,
      selectedUsage,
      subcategoryId,
      subSubcategoryId,
      durationType,
      durationValue
    } = req.body;

    const riderId = req.rider?.riderId

    // Get rider document
    const rider = await Rider.findById(riderId);
    if (!rider) return res.status(404).json({ error: 'Rider not found' });
    
    // --- validations ---
    if (!carCategoryId) {
      return res.status(400).json({ error: 'carCategory is required (Classic / Prime)' });
    }

    const category = await Category.findById(categoryId);
    if (!category) return res.status(404).json({ error: 'Category not found' });

    const subcategory = await SubCategory.findById(subcategoryId);

    if (!subcategory) return res.status(404).json({ error: 'Subcategory not found' });

    const subSubCategory = subSubcategoryId ? await SubSubCategory.findById(subSubcategoryId) : null;
    if (subSubcategoryId && !subSubCategory) return res.status(404).json({ error: 'Sub-Subcategory not found' });



    // --- usage conversion ---
    let usageValue = parseFloat(selectedUsage) || 0;
    const formattedSubcategory = subcategory.name.toLowerCase();
    const formattedSubSubCategory = subSubCategory ? subSubCategory.name.toLowerCase() : null;

    if (
      formattedSubcategory === 'hourly' ||
      formattedSubSubCategory === 'roundtrip' ||
      formattedSubcategory === 'monthly' ||
      formattedSubcategory === 'weekly'
    ) {
      usageValue = usageValue * 60; // hours → minutes
    }

    // --- ride cost query ---
    let rideCostQuery = {
      priceCategory: new mongoose.Types.ObjectId(carCategoryId),
      category: new mongoose.Types.ObjectId(categoryId),
      subcategory: new mongoose.Types.ObjectId(subcategoryId)

    };
    if (subSubcategoryId) {
      rideCostQuery.subSubCategory = new mongoose.Types.ObjectId(subSubcategoryId);
    }


    if (
      formattedSubcategory === 'hourly' ||
      formattedSubSubCategory === 'roundtrip' ||
      formattedSubcategory === 'monthly' ||
      formattedSubcategory === 'weekly'
    ) {
      rideCostQuery.includedMinutes = usageValue.toString();
    } else {
      rideCostQuery.includedKm = usageValue.toString();
    }

    const rideCostModels = await CabRideCost.find(rideCostQuery)
      .populate('category', 'name')
      .populate('car', 'name');

    if (rideCostModels.length === 0) {
      return res.status(404).json({ error: 'No ride cost models found for this car category' });
    }

    // --- peak hour charges ---
    const peakChargesList = await peakHours.find({});
    const bookingDateTime = moment(`${selectedDate} ${selectedTime}`, 'YYYY-MM-DD HH:mm');

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

    // --- night charges ---
    const hour = bookingDateTime.hour();
    const isNight = hour >= 22 || hour < 6;

    // --- final calculation ---
    const result = [];
    for (const model of rideCostModels) {
      console.log(model)

      let driverCharges = model.baseFare || 0;

      // --- duration multiplier ---
      if (durationType && durationValue) {
        switch (durationType.toLowerCase()) {
          case 'day':
            driverCharges = model.baseFare * durationValue;
            break;
          case 'week':
            driverCharges = model.baseFare * durationValue * 7;
            break;
          case 'month':
            driverCharges = model.baseFare * durationValue * 30;
            break;
          default:
            driverCharges = model.baseFare;
        }
      }

      const modelPickCharges = model.pickCharges || 0;
      const modelNightCharges = isNight ? model.nightCharges || 0 : 0;
      const modelInsurance = includeInsurance ? model.insurance || 0 : 0;

      const baseTotal = driverCharges + modelPickCharges + peakCharges + modelNightCharges;

      const adminCommission = Math.round((baseTotal * (model.extraChargesFromAdmin || 0)) / 100);
      const adjustedAdminCommission = Math.max(0, adminCommission - (model.discount || 0));
      const cancellationCharges = rider.cancellationCharges || 0;

      const subtotal = baseTotal + adminCommission;
      const gstCharges = Math.ceil((subtotal * (model.gst || 0)) / 100);
      const totalPayable = Math.round(baseTotal + adjustedAdminCommission + gstCharges + modelInsurance + cancellationCharges);

      result.push({
        categoryId: model.car?._id || null,
        category: model.car?.name, // keep price category also if needed
        driverCharges: Math.round(driverCharges),
        pickCharges: Math.round(modelPickCharges),
        peakCharges: Math.round(peakCharges),
        insuranceCharges: Math.round(modelInsurance),
        nightCharges: Math.round(modelNightCharges),
        adminCommissionOriginal: adminCommission,
        adminCommissionAdjusted: adjustedAdminCommission,
        discountApplied: model.discount || 0,
        gstCharges,
        subtotal: Math.round(subtotal),
        totalPayable,
        cancellationCharges
      });
    }

    res.json({ success: true, result });

  } catch (err) {
    console.error('Error in /calculation route:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post("/get-included-data", async (req, res) => {
  try {
    const { categoryId, subcategoryId, subSubcategoryId } = req.body;

    if (!categoryId || !subcategoryId) {
      return res.status(400).json({
        success: false,
        message: "categoryId and subcategoryId are required",
      });
    }

    // Get subcategory name
    const subCategory = await SubCategory.findById(subcategoryId).select("name");
    if (!subCategory) {
      return res.status(404).json({
        success: false,
        message: "Subcategory not found",
      });
    }

    const subCategoryName = subCategory.name.toLowerCase();

    let includedKm = [];
    let includedMinutes = [];

    if (subCategoryName === "oneway") {
      // Get distinct includedKm only
      includedKm = await CabRideCost.distinct("includedKm", {
        category: categoryId,
        subcategory: subcategoryId,
        subSubCategory: subSubcategoryId,
      });

      if (!includedKm.length) {
        return res.status(404).json({
          success: false,
          message: "No includedKm found for oneway rides",
        });
      }

      return res.status(200).json({
        success: true,
        data: { includedKm },
      });
    } else {
      // Get distinct includedMinutes only
      includedMinutes = await CabRideCost.distinct("includedMinutes", {
        category: categoryId,
        subcategory: subcategoryId,
        subSubCategory: subSubcategoryId,
      });

      if (!includedMinutes.length) {
        return res.status(404).json({
          success: false,
          message: "No includedMinutes found for this ride type",
        });
      }

      return res.status(200).json({
        success: true,
        data: { includedMinutes },
      });
    }
  } catch (error) {
    console.error("Error fetching included data:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

module.exports = router;