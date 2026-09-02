const express = require('express');
const router = express.Router();
const CabRideCost = require('../models/CabRideCost');
const Category = require('../models/Category');
const peakHours = require('../models/Peak')
const NightCharge = require('../models/NightCharge')
const pricecategories = require('../models/PriceCategory')
const moment = require('moment');
const SubCategory = require('../models/SubCategory');
const SubSubCategory = require('../models/SubSubCategory');
const Car = require('../models/Car');
const CarCategory = require('../models/CarCategory')
const mongoose = require('mongoose');
const { combinedAuthMiddleware } = require('../Services/authService');
const Rider = require('../models/Rider');
const { Wallet } = require('../models/Payment&Wallet')
const adminAuthMiddleware = require('../middleware/adminAuthMiddleware');
const multer = require('multer');
const XLSX = require('xlsx');

// Multer — memory storage for Excel upload (no disk writes)
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.mimetype === 'application/vnd.ms-excel'
    ) {
      cb(null, true);
    } else {
      cb(new Error('Only .xlsx and .xls files are allowed'), false);
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 } // 5 MB max
});

// ─────────────────────────────────────────────
// GET /sample-excel — Download sample Excel file
// ─────────────────────────────────────────────
router.get('/sample-excel', adminAuthMiddleware, async (req, res) => {
  try {
    const headers = [
      'Category',
      'Subcategory',
      'Sub-Sub Category',
      'Cab Category',
      'Car',
      'Base Fare',
      'Included KM',
      'Included Minutes',
      'Extra Charge per KM',
      'Extra Charge per Minute',
      'Pick Charges',
      'Night Charges',
      'Cancellation Fee',
      'Cancellation Buffer Time (minutes)',
      'Insurance',
      'Admin Commission %',
      'GST %',
      'Discount',
      'Driver Cancellation Charges'
    ];

    // One example row so admin understands the expected format
    const exampleRow = [
      'Cab',          // Category — must match exact name in system (case-insensitive)
      'Hourly',       // Subcategory — must match exact name in system (case-insensitive)
      '',             // Sub-Sub Category — only for Outstation subcategory, else leave blank
      'Economy',      // Cab Category — must match exact CarCategory name in system (case-insensitive)
      'Swift Dzire',  // Car — must match exact Car name belonging to the selected Cab Category (case-insensitive)
      500,            // Base Fare ₹
      '50',           // Included KM
      '480',          // Included Minutes
      10,             // Extra Charge per KM ₹
      2,              // Extra Charge per Minute ₹
      50,             // Pick Charges ₹
      30,             // Night Charges ₹
      50,             // Cancellation Fee ₹
      5,              // Cancellation Buffer Time (minutes)
      20,             // Insurance ₹
      10,             // Admin Commission %
      5,              // GST %
      0,              // Discount ₹
      100             // Driver Cancellation Charges ₹
    ];

    const worksheetData = [headers, exampleRow];
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

    // Set column widths for readability
    worksheet['!cols'] = headers.map((h) => ({ wch: Math.max(h.length + 4, 18) }));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Cab Packages');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', 'attachment; filename="cab_packages_sample.xlsx"');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  } catch (err) {
    console.error('Error generating sample Excel:', err);
    res.status(500).json({ success: false, error: 'Failed to generate sample file' });
  }
});

// ─────────────────────────────────────────────
// POST /bulk-import — Validate & import all rows (all-or-nothing)
// ─────────────────────────────────────────────
router.post('/bulk-import', adminAuthMiddleware, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    // Parse Excel from buffer
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

    if (!rows || rows.length === 0) {
      return res.status(400).json({ success: false, error: 'Excel file is empty or has no data rows' });
    }

    // Fetch all reference data from DB once
    const [allCategories, allSubcategories, allSubSubCategories, allCarCategories, allCars] = await Promise.all([
      Category.find({}).lean(),
      SubCategory.find({}).lean(),
      SubSubCategory.find({}).lean(),
      CarCategory.find({}).lean(),
      Car.find({}).lean()
    ]);

    const errors = [];
    const validatedRows = [];

    // Track unique combos within the file to catch intra-file duplicates
    const seenCombos = new Set();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // +2 because row 1 is header
      const rowErrors = [];

      // ── Helper: trim safely ──
      const trim = (val) => (val !== null && val !== undefined ? String(val).trim() : '');

      const categoryName       = trim(row['Category']);
      const subcategoryName    = trim(row['Subcategory']);
      const subSubCategoryName = trim(row['Sub-Sub Category']);
      const cabCategoryName    = trim(row['Cab Category']);
      const carName            = trim(row['Car']);
      const baseFare           = row['Base Fare'];
      const includedKm         = trim(row['Included KM']);
      const includedMinutes    = trim(row['Included Minutes']);
      const extraPerKm         = row['Extra Charge per KM'];
      const extraPerMin        = row['Extra Charge per Minute'];
      const pickCharges        = row['Pick Charges'];
      const nightCharges       = row['Night Charges'];
      const cancellationFee    = row['Cancellation Fee'];
      const cancellationBuffer = row['Cancellation Buffer Time (minutes)'];
      const insurance          = row['Insurance'];
      const adminCommission    = row['Admin Commission %'];
      const gst                = row['GST %'];
      const discount           = row['Discount'];
      const driverCancelCharge = row['Driver Cancellation Charges'];

      // ── 1. Required text fields ──
      if (!categoryName)    rowErrors.push({ field: 'Category',     value: categoryName,    message: 'Category is required' });
      if (!subcategoryName) rowErrors.push({ field: 'Subcategory',  value: subcategoryName, message: 'Subcategory is required' });
      if (!cabCategoryName) rowErrors.push({ field: 'Cab Category', value: cabCategoryName, message: 'Cab Category is required' });
      if (!carName)         rowErrors.push({ field: 'Car',          value: carName,         message: 'Car is required' });
      if (!includedKm)      rowErrors.push({ field: 'Included KM',  value: includedKm,      message: 'Included KM is required' });
      if (!includedMinutes) rowErrors.push({ field: 'Included Minutes', value: includedMinutes, message: 'Included Minutes is required' });

      // ── 2. Numeric fields (must be >= 0) ──
      const numericFields = [
        { key: 'Base Fare',                          val: baseFare },
        { key: 'Extra Charge per KM',                val: extraPerKm },
        { key: 'Extra Charge per Minute',            val: extraPerMin },
        { key: 'Pick Charges',                       val: pickCharges },
        { key: 'Night Charges',                      val: nightCharges },
        { key: 'Cancellation Fee',                   val: cancellationFee },
        { key: 'Cancellation Buffer Time (minutes)', val: cancellationBuffer },
        { key: 'Insurance',                          val: insurance },
        { key: 'Admin Commission %',                 val: adminCommission },
        { key: 'GST %',                              val: gst },
        { key: 'Discount',                           val: discount },
        { key: 'Driver Cancellation Charges',        val: driverCancelCharge },
      ];

      for (const field of numericFields) {
        const num = parseFloat(field.val);
        if (field.val === '' || isNaN(num) || num < 0) {
          rowErrors.push({
            field: field.key,
            value: field.val,
            message: `${field.key} must be a valid number >= 0`
          });
        }
      }

      // ── 3. DB lookups ──
      let categoryDoc      = null;
      let subcategoryDoc   = null;
      let subSubCategoryDoc = null;
      let cabCategoryDoc   = null;
      let carDoc           = null;

      if (categoryName) {
        categoryDoc = allCategories.find(c => c.name.toLowerCase() === categoryName.toLowerCase());
        if (!categoryDoc) {
          rowErrors.push({ field: 'Category', value: categoryName, message: `Category '${categoryName}' not found in system` });
        } else if (categoryDoc.name.toLowerCase() !== 'cab') {
          rowErrors.push({ field: 'Category', value: categoryName, message: `Only 'Cab' category is allowed. '${categoryName}' is not permitted` });
        }
      }

      if (subcategoryName && categoryDoc) {
        subcategoryDoc = allSubcategories.find(
          s => s.name.toLowerCase() === subcategoryName.toLowerCase() &&
               String(s.categoryId) === String(categoryDoc._id)
        );
        if (!subcategoryDoc) {
          rowErrors.push({ field: 'Subcategory', value: subcategoryName, message: `Subcategory '${subcategoryName}' not found under category '${categoryName}'` });
        }
      }

      // Sub-Sub Category: required only when subcategory is "outstation"
      const isOutstation = subcategoryDoc && subcategoryDoc.name.toLowerCase() === 'outstation';

      if (isOutstation) {
        if (!subSubCategoryName) {
          rowErrors.push({ field: 'Sub-Sub Category', value: '', message: 'Sub-Sub Category is required for Outstation subcategory' });
        } else if (subcategoryDoc) {
          subSubCategoryDoc = allSubSubCategories.find(
            ss => ss.name.toLowerCase() === subSubCategoryName.toLowerCase() &&
                  String(ss.subCategoryId) === String(subcategoryDoc._id || subcategoryDoc.id)
          );
          if (!subSubCategoryDoc) {
            rowErrors.push({ field: 'Sub-Sub Category', value: subSubCategoryName, message: `Sub-Sub Category '${subSubCategoryName}' not found under subcategory '${subcategoryName}'` });
          }
        }
      }

      // Cab Category lookup
      if (cabCategoryName) {
        cabCategoryDoc = allCarCategories.find(
          cc => cc.name.toLowerCase() === cabCategoryName.toLowerCase()
        );
        if (!cabCategoryDoc) {
          rowErrors.push({ field: 'Cab Category', value: cabCategoryName, message: `Cab Category '${cabCategoryName}' not found in system` });
        }
      }

      // Car lookup — must belong to the selected Cab Category
      if (carName && cabCategoryDoc) {
        carDoc = allCars.find(
          c => c.name.toLowerCase() === carName.toLowerCase() &&
               String(c.category) === String(cabCategoryDoc._id)
        );
        if (!carDoc) {
          rowErrors.push({ field: 'Car', value: carName, message: `Car '${carName}' not found under Cab Category '${cabCategoryName}'` });
        }
      } else if (carName && !cabCategoryDoc) {
        // Cab Category failed — can't validate car without it, skip car lookup
      }

      // ── 4. Intra-file duplicate check ──
      if (categoryDoc && subcategoryDoc && cabCategoryDoc && carDoc && includedKm && includedMinutes) {
        const comboKey = [
          String(categoryDoc._id),
          String(subcategoryDoc._id || subcategoryDoc.id),
          subSubCategoryDoc ? String(subSubCategoryDoc._id || subSubCategoryDoc.id) : 'none',
          String(cabCategoryDoc._id),
          String(carDoc._id),
          includedKm,
          includedMinutes
        ].join('|');

        if (seenCombos.has(comboKey)) {
          rowErrors.push({
            field: 'Duplicate',
            value: '',
            message: `Duplicate row within the file: same Category, Subcategory, Cab Category, Car, Included KM and Minutes already exists in a row above`
          });
        } else {
          seenCombos.add(comboKey);
        }
      }

      if (rowErrors.length > 0) {
        errors.push({ row: rowNum, errors: rowErrors });
      } else {
        validatedRows.push({
          category:              categoryDoc._id,
          subcategory:           subcategoryDoc._id || subcategoryDoc.id,
          subSubCategory:        subSubCategoryDoc ? (subSubCategoryDoc._id || subSubCategoryDoc.id) : null,
          priceCategory:         cabCategoryDoc._id,
          car:                   carDoc._id,
          baseFare:              parseFloat(baseFare),
          includedKm:            String(includedKm),
          includedMinutes:       String(includedMinutes),
          extraChargePerKm:      parseFloat(extraPerKm),
          extraChargePerMinute:  parseFloat(extraPerMin),
          pickCharges:           parseFloat(pickCharges) || 0,
          nightCharges:          parseFloat(nightCharges) || 0,
          cancellationFee:       parseFloat(cancellationFee) || 0,
          cancellationBufferTime: parseInt(cancellationBuffer) || 0,
          insurance:             parseFloat(insurance) || 0,
          extraChargesFromAdmin: parseFloat(adminCommission) || 0,
          gst:                   parseFloat(gst) || 0,
          discount:              parseFloat(discount) || 0,
          driverCancellationCharges: parseFloat(driverCancelCharge) || 0,
          status: true
        });
      }
    }

    // ── 5. If any errors → reject entire file (all-or-nothing) ──
    if (errors.length > 0) {
      return res.status(422).json({
        success: false,
        message: `Import failed. ${errors.length} row(s) have errors. Fix them and re-upload.`,
        totalRows: rows.length,
        validRows: rows.length - errors.length,
        invalidRows: errors.length,
        errors
      });
    }

    // ── 6. DB-level duplicate check against existing records ──
    const dbDuplicateErrors = [];
    for (let i = 0; i < validatedRows.length; i++) {
      const r = validatedRows[i];
      const existing = await CabRideCost.findOne({
        category:       r.category,
        subcategory:    r.subcategory,
        subSubCategory: r.subSubCategory || null,
        priceCategory:  r.priceCategory,
        car:            r.car,
        includedKm:     r.includedKm,
        includedMinutes: r.includedMinutes
      });
      if (existing) {
        dbDuplicateErrors.push({
          row: i + 2,
          errors: [{
            field: 'Duplicate',
            value: '',
            message: `A package with the same Category, Subcategory, Cab Category, Car, Included KM '${r.includedKm}' and Minutes '${r.includedMinutes}' already exists in the database`
          }]
        });
      }
    }

    if (dbDuplicateErrors.length > 0) {
      return res.status(422).json({
        success: false,
        message: `Import failed. ${dbDuplicateErrors.length} row(s) already exist in the database.`,
        totalRows: rows.length,
        validRows: rows.length - dbDuplicateErrors.length,
        invalidRows: dbDuplicateErrors.length,
        errors: dbDuplicateErrors
      });
    }

    // ── 7. All valid → insert all ──
    await CabRideCost.insertMany(validatedRows);

    return res.status(201).json({
      success: true,
      message: `${validatedRows.length} package(s) imported successfully`,
      totalInserted: validatedRows.length
    });

  } catch (err) {
    console.error('Error in cab bulk-import:', err);
    res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
});

// Get all cab ride costs
router.get('/', adminAuthMiddleware, async (req, res) => {
  try {
    const { category, subcategory, priceCategory, car, page = 1, limit = 10 } = req.query;

    const filter = {};
    if (category) filter.category = category;
    if (subcategory) filter.subcategory = subcategory;
    if (priceCategory) filter.priceCategory = priceCategory;
    if (car) filter.car = car;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const [cabRideCosts, totalRecords] = await Promise.all([
      CabRideCost.find(filter)
        .populate('category', 'name')
        .populate('subcategory', 'name')
        .populate('subSubCategory', 'name')
        .populate('priceCategory', 'name')
        .populate('car', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      CabRideCost.countDocuments(filter)
    ]);

    res.json({
      success: true,
      count: cabRideCosts.length,
      totalRecords,
      totalPages: Math.ceil(totalRecords / limitNum),
      currentPage: pageNum,
      data: cabRideCosts
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post('/', adminAuthMiddleware, async (req, res) => {
  try {
    // Duplicate check before creating
    const existing = await CabRideCost.findOne({
      category:       req.body.category,
      subcategory:    req.body.subcategory,
      subSubCategory: req.body.subSubCategory || null,
      priceCategory:  req.body.priceCategory,
      car:            req.body.car,
      includedKm:     req.body.includedKm,
      includedMinutes: req.body.includedMinutes
    });
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'A package with the same Category, Subcategory, Cab Category, Car, Included KM and Minutes already exists'
      });
    }

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
router.get('/:id', adminAuthMiddleware, async (req, res) => {
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
router.put('/:id', adminAuthMiddleware, async (req, res) => {
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
router.patch('/:id/status', adminAuthMiddleware, async (req, res) => {
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
router.delete('/:id', adminAuthMiddleware, async (req, res) => {
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

router.post('/calculation', combinedAuthMiddleware, async (req, res) => {
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
      durationValue,
      riderId // Add riderId for staff bookings
    } = req.body;

    // Determine riderId based on authentication type
    let targetRiderId;
    if (req.rider) {
      // User authentication
      targetRiderId = req.rider.riderId;
    } else if (req.staff) {
      // Staff authentication - riderId must be provided in body
      if (!riderId) {
        return res.status(400).json({ error: 'riderId is required for staff bookings' });
      }
      targetRiderId = riderId;
    }

    // Get rider document
    const rider = await Rider.findById(targetRiderId);
    if (!rider) return res.status(404).json({ error: 'Rider not found' });

    const cuurentBalanceDoc = await Wallet.findOne({ riderId: targetRiderId }).select('balance')
    const currentBalance = cuurentBalanceDoc ? cuurentBalanceDoc.balance : null

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
      .populate('car', 'name description seater');

    if (rideCostModels.length === 0) {
      return res.status(404).json({ error: 'No ride cost models found for this car category' });
    }

    // --- peak hour charges ---
    const peakChargesList = await peakHours.find({ status: true });
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
    const nightCharge = await NightCharge.findOne({ status: true }).sort({ createdAt: -1 });
    let isNight = false;
    if (nightCharge) {
      const startTime = moment(`${selectedDate} ${nightCharge.startTime}`, 'YYYY-MM-DD HH:mm');
      let endTime = moment(`${selectedDate} ${nightCharge.endTime}`, 'YYYY-MM-DD HH:mm');
      
      // Handle night time range that spans across midnight
      if (endTime.isBefore(startTime)) {
        endTime.add(1, 'day');
      }
      
      // Check if booking time falls within night hours
      if (bookingDateTime.isBetween(startTime, endTime, null, '[]') || 
          (endTime.date() !== startTime.date() && bookingDateTime.clone().add(1, 'day').isBetween(startTime, endTime, null, '[]'))) {
        isNight = true;
      }
    }

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
      let adjustedAdminCommission = Math.max(0, adminCommission - (model.discount || 0));
      const cancellationCharges = rider.cancellationCharges || 0;

      const subtotal = baseTotal + adminCommission;
      const gstCharges = Math.round((subtotal * (model.gst || 0)) / 100);
      const totalPayable = Math.round(baseTotal + adjustedAdminCommission + gstCharges + modelInsurance + cancellationCharges);

      result.push({
        packageId: model._id,
        categoryId: model.car?._id || null,
        category: model.car?.name, // keep price category also if needed
        seatCapacity: model.car?.seater || null,
        description: model.car?.description,
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

    res.json({ success: true, result, UserCurrentBalance: currentBalance });

  } catch (err) {
    console.error('Error in /calculation route:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post("/get-included-data", combinedAuthMiddleware, async (req, res) => {
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

    const formattedSubcategory = subcategory.name.toLowerCase().replace(/[^a-z0-9]/g, '');

    const records = await CabRideCost.aggregate([
      {
        $match: {
          category: new mongoose.Types.ObjectId(categoryId),
          subcategory: new mongoose.Types.ObjectId(subcategoryId),
          ...(subSubcategoryId && {
            subSubCategory: new mongoose.Types.ObjectId(subSubcategoryId),
          }),
          status: true
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