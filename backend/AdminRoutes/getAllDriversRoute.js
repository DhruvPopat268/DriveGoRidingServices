const express = require('express');
const router = express.Router();
const Driver = require('../DriverModel/DriverModel');
const Ride = require('../models/Ride');
const DriverSuspend = require('../models/DriverSuspend');
const DriverWallet = require('../DriverModel/driverWallet');
const adminAuthMiddleware = require('../middleware/adminAuthMiddleware');
const mongoose = require('mongoose');

// GET /api/admin/all-drivers
// Returns all drivers with pagination, search, category, subcategory, ownership, status filters
router.get('/', adminAuthMiddleware, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      status = '',
      category = '',
      subcategoryId = '',
      ownership = ''
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build filter
    const filter = {};

    if (status) {
      filter.status = status;
    }

    if (category) {
      filter['personalInformation.category'] = category;
    }

    if (subcategoryId) {
      filter['personalInformation.subCategory'] = subcategoryId;
    }

    if (ownership) {
      filter.ownership = ownership;
    }

    if (search) {
      filter.$or = [
        { mobile: { $regex: search, $options: 'i' } },
        { uniqueId: { $regex: search, $options: 'i' } },
        { 'personalInformation.fullName': { $regex: search, $options: 'i' } },
        { 'personalInformation.email': { $regex: search, $options: 'i' } }
      ];
    }

    const [drivers, totalDrivers] = await Promise.all([
      Driver.find(filter)
        .select(
          'mobile uniqueId selectedCategory ownership personalInformation.fullName personalInformation.email personalInformation.passportPhoto personalInformation.category personalInformation.subCategory personalInformation.permanentAddress status isOnline rideStatus ratings currentPlan approvedDate rejectedDate deletedDate createdAt'
        )
        .populate('personalInformation.category', 'name')
        .populate('personalInformation.subCategory', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Driver.countDocuments(filter)
    ]);

    // Attach completed rides count, status-relevant date, and wallet balance for each driver
    const driversWithStats = await Promise.all(drivers.map(async (driver) => {
      const [completedRides, wallet] = await Promise.all([
        Ride.countDocuments({ driverId: driver._id, status: 'COMPLETED' }),
        DriverWallet.findOne({ driverId: driver._id }).select('balance').lean()
      ]);

      let statusDate = null;
      switch (driver.status) {
        case 'Approved':
          statusDate = driver.approvedDate || null;
          break;
        case 'Rejected':
          statusDate = driver.rejectedDate || null;
          break;
        case 'deleted':
          statusDate = driver.deletedDate || null;
          break;
        case 'Suspended': {
          const suspendRecord = await DriverSuspend.findOne({ drivers: driver._id }).sort({ createdAt: -1 }).lean();
          statusDate = suspendRecord?.suspendedAt || null;
          break;
        }
        default:
          statusDate = null;
      }

      return { ...driver, completedRides, statusDate, walletBalance: wallet?.balance ?? 0 };
    }));

    res.json({
      success: true,
      data: driversWithStats,
      totalDrivers,
      totalRecords: totalDrivers,
      totalPages: Math.ceil(totalDrivers / limitNum),
      currentPage: pageNum
    });
  } catch (error) {
    console.error('Get all drivers error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// PATCH /api/admin/all-drivers/:driverId/update-basic-info
// Updates editable basic info fields for a driver from the admin panel
router.patch('/:driverId/update-basic-info', adminAuthMiddleware, async (req, res) => {
  try {
    const { driverId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(driverId)) {
      return res.status(400).json({ success: false, message: 'Invalid driver ID' });
    }

    const {
      fullName,
      email,
      subCategory,
      permanentAddress,
      vehicleType,
      canDrive,
      knownLanguages
    } = req.body;

    // Build update object with only provided fields
    const updateFields = {};

    if (fullName !== undefined) {
      if (typeof fullName !== 'string' || fullName.trim() === '') {
        return res.status(400).json({ success: false, message: 'fullName must be a non-empty string' });
      }
      updateFields['personalInformation.fullName'] = fullName.trim();
    }

    if (email !== undefined) {
      if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        return res.status(400).json({ success: false, message: 'Invalid email format' });
      }
      updateFields['personalInformation.email'] = email.trim();
    }

    if (permanentAddress !== undefined) {
      if (typeof permanentAddress !== 'string' || permanentAddress.trim() === '') {
        return res.status(400).json({ success: false, message: 'permanentAddress must be a non-empty string' });
      }
      updateFields['personalInformation.permanentAddress'] = permanentAddress.trim();
    }

    if (subCategory !== undefined) {
      if (!Array.isArray(subCategory)) {
        return res.status(400).json({ success: false, message: 'subCategory must be an array' });
      }
      const invalidIds = subCategory.filter(id => !mongoose.Types.ObjectId.isValid(id));
      if (invalidIds.length > 0) {
        return res.status(400).json({ success: false, message: `Invalid subCategory IDs: ${invalidIds.join(', ')}` });
      }
      updateFields['personalInformation.subCategory'] = subCategory.map(id => new mongoose.Types.ObjectId(id));
    }

    if (vehicleType !== undefined) {
      if (!Array.isArray(vehicleType)) {
        return res.status(400).json({ success: false, message: 'vehicleType must be an array' });
      }
      const invalidIds = vehicleType.filter(id => !mongoose.Types.ObjectId.isValid(id));
      if (invalidIds.length > 0) {
        return res.status(400).json({ success: false, message: `Invalid vehicleType IDs: ${invalidIds.join(', ')}` });
      }
      updateFields['drivingDetails.vehicleType'] = vehicleType.map(id => new mongoose.Types.ObjectId(id));
    }

    if (canDrive !== undefined) {
      if (!Array.isArray(canDrive)) {
        return res.status(400).json({ success: false, message: 'canDrive must be an array' });
      }
      const invalidIds = canDrive.filter(id => !mongoose.Types.ObjectId.isValid(id));
      if (invalidIds.length > 0) {
        return res.status(400).json({ success: false, message: `Invalid canDrive IDs: ${invalidIds.join(', ')}` });
      }

      // Validate that every canDrive entry belongs to one of the submitted vehicleTypes
      if (canDrive.length > 0) {
        const VehicleCategory = require('../models/VehicleCategory');
        const resolvedVehicleTypes = vehicleType || updateFields['drivingDetails.vehicleType']?.map(id => id.toString()) || [];

        const canDriveRecords = await VehicleCategory.find({
          _id: { $in: canDrive }
        }).select('DriveVehicleType vehicleName').lean();

        const invalidCanDrive = canDriveRecords.filter(vc => {
          const parentTypeId = vc.DriveVehicleType?.toString();
          return !resolvedVehicleTypes.map(id => id.toString()).includes(parentTypeId);
        });

        if (invalidCanDrive.length > 0) {
          const names = invalidCanDrive.map(vc => vc.vehicleName).join(', ');
          return res.status(400).json({
            success: false,
            message: `These canDrive vehicles belong to a vehicle type that is not selected: ${names}. Please select the parent vehicle type first.`
          });
        }
      }

      updateFields['drivingDetails.canDrive'] = canDrive.map(id => new mongoose.Types.ObjectId(id));
    }

    if (knownLanguages !== undefined) {
      if (!Array.isArray(knownLanguages)) {
        return res.status(400).json({ success: false, message: 'knownLanguages must be an array' });
      }
      const invalidLangs = knownLanguages.filter(l => typeof l !== 'string' || l.trim() === '');
      if (invalidLangs.length > 0) {
        return res.status(400).json({ success: false, message: 'All knownLanguages entries must be non-empty strings' });
      }
      updateFields['languageSkillsAndReferences.knownLanguages'] = knownLanguages.map(l => l.trim());
    }

    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({ success: false, message: 'No valid fields provided for update' });
    }

    const updatedDriver = await Driver.findByIdAndUpdate(
      driverId,
      { $set: updateFields },
      { new: true, runValidators: false }
    )
      .populate('personalInformation.category', 'name')
      .populate('personalInformation.subCategory', 'name')
      .populate('drivingDetails.vehicleType', 'name')
      .populate('drivingDetails.canDrive', 'vehicleName')
      .lean();

    if (!updatedDriver) {
      return res.status(404).json({ success: false, message: 'Driver not found' });
    }

    res.json({ success: true, message: 'Driver info updated successfully', driver: updatedDriver });
  } catch (error) {
    console.error('Update driver basic info error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
