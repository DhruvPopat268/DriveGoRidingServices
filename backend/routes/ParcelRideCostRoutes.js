const express = require('express');
const router = express.Router();
const ParcelRideCost = require('../models/ParcelRideCost');
const Category = require('../models/Category');
const peakHours = require('../models/Peak')
const NightCharge = require('../models/NightCharge')
const moment = require('moment');
const SubCategory = require('../models/SubCategory');
const mongoose = require('mongoose');
const { combinedAuthMiddleware } = require('../Services/authService');
const Rider = require('../models/Rider');
const {Wallet} = require('../models/Payment&Wallet')
const adminAuthMiddleware = require('../middleware/adminAuthMiddleware');
const ParcelCategory = require('../models/ParcelCategory');
const ParcelVehicle = require('../models/ParcelVehicle');
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
      'Parcel Category',
      'Parcel Vehicle',
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
      'Parcel',       // Category — must match exact name in system (case-insensitive)
      'Express',      // Subcategory — must match exact name in system (case-insensitive)
      'Standard',     // Parcel Category — must match exact categoryName in system (case-insensitive)
      'Bike',         // Parcel Vehicle — must match exact name belonging to selected Parcel Category (case-insensitive)
      100,            // Base Fare ₹
      '10',           // Included KM
      '60',           // Included Minutes
      5,              // Extra Charge per KM ₹
      1,              // Extra Charge per Minute ₹
      20,             // Pick Charges ₹
      15,             // Night Charges ₹
      30,             // Cancellation Fee ₹
      5,              // Cancellation Buffer Time (minutes)
      10,             // Insurance ₹
      8,              // Admin Commission %
      5,              // GST %
      0,              // Discount ₹
      50              // Driver Cancellation Charges ₹
    ];

    const worksheetData = [headers, exampleRow];
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

    // Set column widths for readability
    worksheet['!cols'] = headers.map((h) => ({ wch: Math.max(h.length + 4, 18) }));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Parcel Packages');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', 'attachment; filename="parcel_packages_sample.xlsx"');
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
    const [allCategories, allSubcategories, allParcelCategories, allParcelVehicles] = await Promise.all([
      Category.find({}).lean(),
      SubCategory.find({}).lean(),
      ParcelCategory.find({}).lean(),
      ParcelVehicle.find({}).lean()
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

      const categoryName        = trim(row['Category']);
      const subcategoryName     = trim(row['Subcategory']);
      const parcelCategoryName  = trim(row['Parcel Category']);
      const parcelVehicleName   = trim(row['Parcel Vehicle']);
      const baseFare            = row['Base Fare'];
      const includedKm          = trim(row['Included KM']);
      const includedMinutes     = trim(row['Included Minutes']);
      const extraPerKm          = row['Extra Charge per KM'];
      const extraPerMin         = row['Extra Charge per Minute'];
      const pickCharges         = row['Pick Charges'];
      const nightCharges        = row['Night Charges'];
      const cancellationFee     = row['Cancellation Fee'];
      const cancellationBuffer  = row['Cancellation Buffer Time (minutes)'];
      const insurance           = row['Insurance'];
      const adminCommission     = row['Admin Commission %'];
      const gst                 = row['GST %'];
      const discount            = row['Discount'];
      const driverCancelCharge  = row['Driver Cancellation Charges'];

      // ── 1. Required text fields ──
      if (!categoryName)       rowErrors.push({ field: 'Category',        value: categoryName,       message: 'Category is required' });
      if (!subcategoryName)    rowErrors.push({ field: 'Subcategory',     value: subcategoryName,    message: 'Subcategory is required' });
      if (!parcelCategoryName) rowErrors.push({ field: 'Parcel Category', value: parcelCategoryName, message: 'Parcel Category is required' });
      if (!parcelVehicleName)  rowErrors.push({ field: 'Parcel Vehicle',  value: parcelVehicleName,  message: 'Parcel Vehicle is required' });
      if (!includedKm)         rowErrors.push({ field: 'Included KM',     value: includedKm,         message: 'Included KM is required' });
      if (!includedMinutes)    rowErrors.push({ field: 'Included Minutes',value: includedMinutes,    message: 'Included Minutes is required' });

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
      let categoryDoc       = null;
      let subcategoryDoc    = null;
      let parcelCategoryDoc = null;
      let parcelVehicleDoc  = null;

      if (categoryName) {
        categoryDoc = allCategories.find(c => c.name.toLowerCase() === categoryName.toLowerCase());
        if (!categoryDoc) {
          rowErrors.push({ field: 'Category', value: categoryName, message: `Category '${categoryName}' not found in system` });
        } else if (categoryDoc.name.toLowerCase() !== 'parcel') {
          rowErrors.push({ field: 'Category', value: categoryName, message: `Only 'Parcel' category is allowed. '${categoryName}' is not permitted` });
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

      // Parcel Category lookup — field name in DB is `categoryName` not `name`
      if (parcelCategoryName) {
        parcelCategoryDoc = allParcelCategories.find(
          pc => pc.categoryName.toLowerCase() === parcelCategoryName.toLowerCase()
        );
        if (!parcelCategoryDoc) {
          rowErrors.push({ field: 'Parcel Category', value: parcelCategoryName, message: `Parcel Category '${parcelCategoryName}' not found in system` });
        }
      }

      // Parcel Vehicle lookup — must belong to selected Parcel Category
      if (parcelVehicleName && parcelCategoryDoc) {
        parcelVehicleDoc = allParcelVehicles.find(
          pv => pv.name.toLowerCase() === parcelVehicleName.toLowerCase() &&
                String(pv.parcelCategory) === String(parcelCategoryDoc._id)
        );
        if (!parcelVehicleDoc) {
          rowErrors.push({ field: 'Parcel Vehicle', value: parcelVehicleName, message: `Parcel Vehicle '${parcelVehicleName}' not found under Parcel Category '${parcelCategoryName}'` });
        }
      } else if (parcelVehicleName && !parcelCategoryDoc) {
        // Parcel Category failed — can't validate vehicle without it, skip
      }

      // ── 4. Intra-file duplicate check ──
      if (categoryDoc && subcategoryDoc && parcelCategoryDoc && parcelVehicleDoc && includedKm && includedMinutes) {
        const comboKey = [
          String(categoryDoc._id),
          String(subcategoryDoc._id || subcategoryDoc.id),
          String(parcelCategoryDoc._id),
          String(parcelVehicleDoc._id),
          includedKm,
          includedMinutes
        ].join('|');

        if (seenCombos.has(comboKey)) {
          rowErrors.push({
            field: 'Duplicate',
            value: '',
            message: `Duplicate row within the file: same Category, Subcategory, Parcel Category, Parcel Vehicle, Included KM and Minutes already exists in a row above`
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
          parcelCategory:        parcelCategoryDoc._id,
          parcelVehicle:         parcelVehicleDoc._id,
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
      const existing = await ParcelRideCost.findOne({
        category:       r.category,
        subcategory:    r.subcategory,
        parcelCategory: r.parcelCategory,
        parcelVehicle:  r.parcelVehicle,
        includedKm:     r.includedKm,
        includedMinutes: r.includedMinutes
      });
      if (existing) {
        dbDuplicateErrors.push({
          row: i + 2,
          errors: [{
            field: 'Duplicate',
            value: '',
            message: `A package with the same Category, Subcategory, Parcel Category, Parcel Vehicle, Included KM '${r.includedKm}' and Minutes '${r.includedMinutes}' already exists in the database`
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
    await ParcelRideCost.insertMany(validatedRows);

    return res.status(201).json({
      success: true,
      message: `${validatedRows.length} package(s) imported successfully`,
      totalInserted: validatedRows.length
    });

  } catch (err) {
    console.error('Error in parcel bulk-import:', err);
    res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
});

// Get all parcel ride costs
router.get('/', adminAuthMiddleware, async (req, res) => {
  try {
    const { category, subcategory, parcelCategory, parcelVehicle } = req.query;

    const filter = {};
    if (category) filter.category = new mongoose.Types.ObjectId(category);
    if (subcategory) filter.subcategory = new mongoose.Types.ObjectId(subcategory);
    if (parcelCategory) filter.parcelCategory = new mongoose.Types.ObjectId(parcelCategory);
    if (parcelVehicle) filter.parcelVehicle = new mongoose.Types.ObjectId(parcelVehicle);

    const parcelRideCosts = await ParcelRideCost.find(filter)
      .populate('category', 'name')
      .populate('subcategory', 'name')
      .populate('parcelCategory', 'categoryName')
      .populate('parcelVehicle', 'name')
      .sort({ createdAt: -1 })

    res.json({ data: parcelRideCosts });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/:id', adminAuthMiddleware, async (req, res) => {
  try {
    const rideCost = await ParcelRideCost.findById(req.params.id);
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

router.post('/', adminAuthMiddleware, async (req, res) => {
  try {
    // Duplicate check before creating
    const existing = await ParcelRideCost.findOne({
      category:       req.body.category,
      subcategory:    req.body.subcategory,
      parcelCategory: req.body.parcelCategory,
      parcelVehicle:  req.body.parcelVehicle,
      includedKm:     req.body.includedKm,
      includedMinutes: req.body.includedMinutes
    });
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'A package with the same Category, Subcategory, Parcel Category, Parcel Vehicle, Included KM and Minutes already exists'
      });
    }

    // Create new ParcelRideCost
    const parcelRideCost = new ParcelRideCost(req.body);
    await parcelRideCost.save();

    // Populate related fields including car image
    const populatedParcelRideCost = await ParcelRideCost.findById(parcelRideCost._id)
      .populate('category', 'name')
      .populate('subcategory', 'name')
      .populate('parcelCategory', 'name')
      .populate({
        path: 'parcelVehicle',
        select: 'name seater', // include image from parcelVehicle model
      });

    res.status(201).json(populatedParcelRideCost);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update parcel ride cost
router.put('/:id', adminAuthMiddleware, async (req, res) => {
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
        path: 'parcelVehicle',
        select: 'name seater', // include image from parcelVehicle model
      });

    if (!parcelRideCost) {
      return res.status(404).json({ message: 'Parcel ride cost not found' });
    }

    res.json(parcelRideCost);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update status
router.patch('/:id/status', adminAuthMiddleware, async (req, res) => {
  try {
    const { status } = req.body;
    const parcelRideCost = await ParcelRideCost.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );

    if (!parcelRideCost) {
      return res.status(404).json({ message: 'Parcel ride cost not found' });
    }

    res.json({ message: 'Status updated successfully', data: parcelRideCost });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete parcel ride cost
router.delete('/:id', adminAuthMiddleware, async (req, res) => {
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

router.post('/calculation', combinedAuthMiddleware, async (req, res) => {
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
    if (!parcelCategoryId) {
      return res.status(400).json({ error: 'Parcel category is required (Classic / Prime)' });
    }

    const category = await Category.findById(categoryId);
    if (!category) return res.status(404).json({ error: 'Category not found' });

    const subcategory = await SubCategory.findById(subcategoryId);

    if (!subcategory) return res.status(404).json({ error: 'Subcategory not found' });

    if (subSubcategoryId) return res.status(404).json({ error: 'Sub-Subcategory not found' });

    const formattedSubcategory = subcategory.name.toLowerCase();

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
      parcelCategory: new mongoose.Types.ObjectId(parcelCategoryId),
      category: new mongoose.Types.ObjectId(categoryId),
      subcategory: new mongoose.Types.ObjectId(subcategoryId)
    };

    // Add both km and minutes to query if they exist
    if (parsedUsage.km > 0) {
      rideCostQuery.includedKm = parsedUsage.km.toString();
    }
    if (parsedUsage.minutes > 0) {
      rideCostQuery.includedMinutes = parsedUsage.minutes.toString();
    }
    
    const rideCostModels = await ParcelRideCost.find(rideCostQuery)
      .populate('category', 'name')
      .populate('parcelVehicle', 'name description weight');
    
      

    if (rideCostModels.length === 0) {
      return res.status(404).json({ error: 'No ride cost models found for this parcel category' });
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
      //console.log('model',model)

      let driverCharges = model.baseFare || 0;
      // console.log(model)

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
        categoryId : model.parcelVehicle?._id,
        category: model.parcelVehicle?.name, // keep price category also if needed
        description: model.parcelVehicle?.description,
        weightAllowed: model.parcelVehicle?.weight + 'kg',
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

    res.json({ success: true, result , UserCurrentBalance:currentBalance });

  } catch (err) {
    console.error('Error in /calculation route:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post("/get-included-data", combinedAuthMiddleware, async (req, res) => {
  try {
    const { categoryId, subcategoryId } = req.body;

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

    const records = await ParcelRideCost.aggregate([
      {
        $match: {
          category: new mongoose.Types.ObjectId(categoryId),
          subcategory: new mongoose.Types.ObjectId(subcategoryId),
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