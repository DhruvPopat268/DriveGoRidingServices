const express = require('express');
const router = express.Router();
const Driver = require('../DriverModel/DriverModel');
const adminAuthMiddleware = require('../middleware/adminAuthMiddleware');

// GET /api/admin/all-drivers
// Returns all drivers with pagination, search, and status filter
router.get('/', adminAuthMiddleware, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      status = '',
      category = ''
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
      filter['selectedCategory.name'] = category;
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
          'mobile uniqueId selectedCategory ownership personalInformation.fullName personalInformation.email personalInformation.passportPhoto status isOnline rideStatus ratings currentPlan approvedDate createdAt'
        )
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Driver.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: drivers,
      totalDrivers,
      totalPages: Math.ceil(totalDrivers / limitNum),
      currentPage: pageNum
    });
  } catch (error) {
    console.error('Get all drivers error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
