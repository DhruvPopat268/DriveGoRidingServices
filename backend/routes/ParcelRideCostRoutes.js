const express = require('express');
const router = express.Router();
const ParcelRideCost = require('../models/ParcelRideCost');
const Category = require('../models/Category');
const peakHours = require('../models/Peak')
const moment = require('moment');
const SubCategory = require('../models/SubCategory');
const mongoose = require('mongoose');

// Get all parcel ride costs
router.get('/', async (req, res) => {
  try {
    const parcelRideCosts = await ParcelRideCost.find()

      .populate('category', 'name')
      .populate('subcategory', 'name')
      .populate('parcelCategory', 'categoryName')
      .populate('parcelVehicleType', 'name')
      .sort({ createdAt: -1 });

    res.json({ data: parcelRideCosts });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    // Create new ParcelRideCost
    const parcelRideCost = new ParcelRideCost(req.body);
    await parcelRideCost.save();

    // Populate related fields including car image
    const populatedParcelRideCost = await ParcelRideCost.findById(parcelRideCost._id)
      .populate('category', 'name')
      .populate('subcategory', 'name')
      .populate('parcelCategory', 'name')
      .populate({
        path: 'parcelVehicleType',
        select: 'name seater', // include image from parcelVehicleType model
      });

    res.status(201).json(populatedParcelRideCost);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update parcel ride cost
router.put('/:id', async (req, res) => {
  try {
    const parcelRideCost = await ParcelRideCost.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    )
      .populate('category', 'name')
      .populate('subcategory', 'name')
      .populate('parcelCategory', 'name')
      .populate({
        path: 'parcelVehicleType',
        select: 'name seater', // include image from parcelVehicleType model
      });

    if (!parcelRideCost) {
      return res.status(404).json({ message: 'Parcel ride cost not found' });
    }

    res.json(parcelRideCost);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete parcel ride cost
router.delete('/:id', async (req, res) => {
  try {
    const parcelRideCost = await ParcelRideCost.findByIdAndDelete(req.params.id);

    if (!parcelRideCost) {
      return res.status(404).json({ message: 'Parcel ride cost not found' });
    }

    res.json({ message: 'Parcel ride cost deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/calculation', async (req, res) => {
  try {
    const {
      parcelCategoryId,
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

    // --- validations ---
    if (!parcelCategoryId) {
      return res.status(400).json({ error: 'Parcel category is required (Classic / Prime)' });
    }

    const category = await Category.findById(categoryId);
    if (!category) return res.status(404).json({ error: 'Category not found' });

    const subcategory = await SubCategory.findById(subcategoryId);

    if (!subcategory) return res.status(404).json({ error: 'Subcategory not found' });

    if (subSubcategoryId) return res.status(404).json({ error: 'Sub-Subcategory not found' });



    // --- usage conversion ---
    let usageValue = parseFloat(selectedUsage) || 0;
    const formattedSubcategory = subcategory.name.toLowerCase();

    if (
      formattedSubcategory === 'hourly' ||
      formattedSubcategory === 'monthly' ||
      formattedSubcategory === 'weekly'
    ) {
      usageValue = usageValue * 60; // hours → minutes
    }

    // --- ride cost query ---
    let rideCostQuery = {
      parcelCategory: new mongoose.Types.ObjectId(parcelCategoryId),
      category: new mongoose.Types.ObjectId(categoryId),
      subcategory: new mongoose.Types.ObjectId(subcategoryId)
    };

    if (
      formattedSubcategory === 'hourly' ||
      formattedSubcategory === 'monthly' ||
      formattedSubcategory === 'weekly'
    ) {
      rideCostQuery.includedMinutes = usageValue.toString();
    } else {
      rideCostQuery.includedKm = usageValue.toString();
    }

    const rideCostModels = await ParcelRideCost.find(rideCostQuery)
      .populate('category', 'name')
      .populate('parcelVehicleType', 'name');

    if (rideCostModels.length === 0) {
      return res.status(404).json({ error: 'No ride cost models found for this parcel category' });
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

      let driverCharges = model.baseFare || 0;
      console.log(model)

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

      const subtotal = baseTotal + adminCommission;
      const gstCharges = Math.ceil((subtotal * (model.gst || 0)) / 100);
      const totalPayable = Math.round(baseTotal + adjustedAdminCommission + gstCharges + modelInsurance);

      result.push({
        category: model.parcelVehicleType?.name, // keep price category also if needed
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
        totalPayable
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
    const { categoryId, subcategoryId} = req.body;

    if (!categoryId || !subcategoryId) {
      return res.status(400).json({
        success: false,
        message: "categoryId and subcategoryId are required",
      });
    }

    // Get subcategory name
    const category = await Category.findById(categoryId).select("name");
    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    const categoryName = category.name.toLowerCase();

    let includedKm = [];
    let includedMinutes = [];

    if (categoryName === "parcel") {
      // Get distinct includedKm only
      includedKm = await ParcelRideCost.distinct("includedKm", {
        category: categoryId,
        subcategory: subcategoryId,
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