const express = require('express');
const router = express.Router();
const DriverRideCost = require('../models/DriverRideCost');
const Category = require('../models/Category');
const peakHours = require('../models/Peak')
const pricecategories = require('../models/PriceCategory')
const moment = require('moment');
const SubCategory = require('../models/SubCategory');
const SubSubCategory = require('../models/SubSubCategory');
const authMiddleware = require('../middleware/authMiddleware'); // Ensure this path is correct
const Rider = require('../models/Rider');
const mongoose = require('mongoose');


router.post('/', async (req, res) => {
  try {
    const rideCost = new DriverRideCost(req.body);
    const saved = await rideCost.save();
    const populated = await DriverRideCost.findById(saved._id)
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
    const rideCosts = await DriverRideCost.find()
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
    const rideCost = await DriverRideCost.findById(req.params.id);
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

router.post('/calculation', authMiddleware, async (req, res) => {
  try {
    const {
      categoryId,
      selectedDate,
      selectedTime,
      includeInsurance,
      selectedUsage,
      subcategoryId,
      numberOfWeeks,
      numberOfMonths,
      subSubcategoryId,
      durationType,
      durationValue
    } = req.body;

    const riderId = req.rider?.riderId

    // Get rider document
    const rider = await Rider.findById(riderId);
    if (!rider) return res.status(404).json({ error: 'Rider not found' });

    // 1. Get category
    const category = await Category.findById(categoryId);
    if (!category) return res.status(404).json({ error: 'Category not found' });

    // 2. Get subcategory
    const subcategory = await SubCategory.findById(subcategoryId);
    if (!subcategory) return res.status(404).json({ error: 'Subcategory not found' });

    const subSubCategory = subSubcategoryId ? await SubSubCategory.findById(subSubcategoryId) : null;
    if (subSubcategoryId && !subSubCategory) return res.status(404).json({ error: 'Sub-Subcategory not found' });

    const formattedSubcategory = subcategory.name.toLowerCase();
    const formattedSubSubCategory = subSubCategory ? subSubCategory.name.toLowerCase() : null;

    // Parse combined usage string (e.g., "50km & 3Hrs", "3Hrs & 50Km")
    const parseUsage = (usageStr) => {
      const usage = { km: 0, minutes: 0 };
      if (!usageStr) return usage;
      
      const parts = usageStr.split('&').map(part => part.trim());
      
      parts.forEach(part => {
        const kmMatch = part.match(/(\d+)\s*km/i);
        const hrMatch = part.match(/(\d+)\s*hrs?/i);
        const minMatch = part.match(/(\d+)\s*min/i);
        
        if (kmMatch) usage.km = parseInt(kmMatch[1]);
        if (hrMatch) usage.minutes += parseInt(hrMatch[1]) * 60;
        if (minMatch) usage.minutes += parseInt(minMatch[1]);
      });
      
      return usage;
    };

    const parsedUsage = parseUsage(selectedUsage);

    // 3. Fetch all ride cost models
    let rideCostQuery = { category: categoryId, subcategory: subcategoryId };
    if (subSubcategoryId) {
      rideCostQuery.subSubCategory = subSubcategoryId;
    }
    // Add both km and minutes to query if they exist
    if (parsedUsage.km > 0) {
      rideCostQuery.includedKm = parsedUsage.km.toString();
    }
    if (parsedUsage.minutes > 0) {
      rideCostQuery.includedMinutes = parsedUsage.minutes.toString();
    }
    console.log('Ride Cost Query:', rideCostQuery);
    const rideCostModels = await DriverRideCost.find(rideCostQuery);
    if (rideCostModels.length === 0) {
      return res.status(404).json({ error: 'No ride cost models found' });
    }

    // 4. Peak hours data
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

    // --- Night charges & insurance ---
    const hour = bookingDateTime.hour();
    const isNight = hour >= 22 || hour < 6;

    // Final results for each price category
    const result = [];

    for (const model of rideCostModels) {
      const priceCategory = await pricecategories.findById(model.priceCategory);
      // console.log(priceCategory)

      let driverCharges = model.baseFare || 0;

      // --- New Duration Logic ---
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
            driverCharges = model.baseFare; // fallback
        }
      }

      let extraCharges = 0;
      driverCharges += extraCharges;

      const modelPickCharges = model.pickCharges || 0;
      const modelNightCharges = isNight ? model.nightCharges || 0 : 0;
      const modelInsurance = includeInsurance ? model.insurance || 0 : 0;

      const baseTotal = driverCharges + modelPickCharges + peakCharges + modelNightCharges;

      const adminCommission = Math.round((baseTotal * (model.extraChargesFromAdmin || 0)) / 100);
      const adjustedAdminCommission = Math.max(0, adminCommission - (model.discount || 0));

      const subtotal = baseTotal + adminCommission;
      const gstCharges = Math.round((subtotal * (model.gst || 0)) / 100);
      const cancellationCharges = rider.cancellationCharges || 0;
      const totalPayable = Math.round(
        baseTotal + adjustedAdminCommission + gstCharges + modelInsurance + cancellationCharges
      );

      result.push({
        categoryId: priceCategory?._id || null,
        category: priceCategory?.priceCategoryName || "Unknown",
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

    const rideCosts = await DriverRideCost.find({ modelType }).sort({ createdAt: -1 });
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
    const rideCost = await DriverRideCost.findByIdAndUpdate(
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
    const rideCost = await DriverRideCost.findByIdAndDelete(req.params.id);

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

router.post("/get-included-data", async (req, res) => {
  try {
    const { categoryId, subcategoryId, subSubcategoryId } = req.body;

    if (!categoryId || !subcategoryId) {
      return res.status(400).json({
        success: false,
        message: "categoryId and subcategoryId are required",
      });
    }

    const subcategory = await SubCategory.findById(subcategoryId);
    if (!subcategory) {
      return res.status(404).json({
        success: false,
        message: "Subcategory not found",
      });
    }

    const formattedSubcategory = subcategory.name.toLowerCase();

    const records = await DriverRideCost.aggregate([
      {
        $match: {
          category: new mongoose.Types.ObjectId(categoryId),
          subcategory: new mongoose.Types.ObjectId(subcategoryId),
          ...(subSubcategoryId && {
            subSubCategory: new mongoose.Types.ObjectId(subSubcategoryId),
          }),
        },
      },
      {
        $group: {
          _id: {
            includedKm: "$includedKm",
            includedMinutes: "$includedMinutes",
          },
        },
      },
      {
        $project: {
          _id: 0,
          includedKm: "$_id.includedKm",
          includedMinutes: "$_id.includedMinutes",
        },
      },
      // --- Sorting logic using pre-calculated field ---
      {
        $addFields: {
          sortField:
            formattedSubcategory === "oneway"
              ? { $toInt: "$includedKm" }
              : { $toInt: "$includedMinutes" },
        },
      },
      {
        $sort: { sortField: 1 },
      },
      {
        $project: {
          sortField: 0,
        },
      },
    ]);

    if (!records.length) {
      return res.status(404).json({
        success: false,
        message: "No record found for given category and subcategory",
      });
    }

    return res.status(200).json(records);

  } catch (error) {
    console.error("Error fetching included data:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

module.exports = router;