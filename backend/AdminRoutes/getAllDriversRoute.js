const express = require('express');
const router = express.Router();
const Driver = require('../DriverModel/DriverModel');
const Ride = require('../models/Ride');
const DriverSuspend = require('../models/DriverSuspend');
const DriverWallet = require('../DriverModel/driverWallet');
const adminAuthMiddleware = require('../middleware/adminAuthMiddleware');

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

module.exports = router;
