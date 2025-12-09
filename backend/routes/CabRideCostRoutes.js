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
const Rider = require('../models/Rider');


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

// GET BY ID - Retrieve single ride cost model
router.get('/:id', async (req, res) => {
  try {
    const rideCost = await CabRideCost.findById(req.params.id);
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

// Update status
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const cabRideCost = await CabRideCost.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!cabRideCost) {
      return res.status(404).json({ message: 'Cab ride cost not found' });
    }

    res.json({ message: 'Status updated successfully', data: cabRideCost });
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

    // --- ride cost query ---
    let rideCostQuery = {
      priceCategory: new mongoose.Types.ObjectId(carCategoryId),
      category: new mongoose.Types.ObjectId(categoryId),
      subcategory: new mongoose.Types.ObjectId(subcategoryId)
    };
    if (subSubcategoryId) {
      rideCostQuery.subSubCategory = new mongoose.Types.ObjectId(subSubcategoryId);
    }

    // Add both km and minutes to query if they exist
    if (parsedUsage.km > 0) {
      rideCostQuery.includedKm = parsedUsage.km.toString();
    }
    if (parsedUsage.minutes > 0) {
      rideCostQuery.includedMinutes = parsedUsage.minutes.toString();
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
      // console.log(model)

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
      const gstCharges = Math.round((subtotal * (model.gst || 0)) / 100);
      const totalPayable = Math.round(baseTotal + adjustedAdminCommission + gstCharges + modelInsurance + cancellationCharges);

      result.push({
        packageId: model._id,
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

    const subcategory = await SubCategory.findById(subcategoryId);
    if (!subcategory) {
      return res.status(404).json({
        success: false,
        message: "Subcategory not found",
      });
    }

    const formattedSubcategory = subcategory.name.toLowerCase();

    const records = await CabRideCost.aggregate([
      {
        $match: {
          category: new mongoose.Types.ObjectId(categoryId),
          subcategory: new mongoose.Types.ObjectId(subcategoryId),
          ...(subSubcategoryId && {
            subSubCategory: new mongoose.Types.ObjectId(subSubcategoryId),
          }),
          status:true
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