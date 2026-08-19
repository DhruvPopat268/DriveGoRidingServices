const express = require('express');
const router = express.Router();
const User = require('../models/User');
const adminAuthMiddleware = require('../middleware/adminAuthMiddleware');

// GET /api/admin/all-users
// Returns all admin/staff users with pagination, search, and status filter
router.get('/', adminAuthMiddleware, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      status = ''
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build filter - only return users that have name and phone
    const filter = {
      name: { $exists: true, $ne: '' },
      phone: { $exists: true, $ne: '' }
    };

    if (status) {
      filter.status = status;
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    const [users, totalUsers] = await Promise.all([
      User.find(filter)
        .select('-password')
        .populate('role', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      User.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: users,
      totalUsers,
      totalPages: Math.ceil(totalUsers / limitNum),
      currentPage: pageNum
    });
  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
