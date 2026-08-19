const express = require('express');
const router = express.Router();
const Rider = require('../models/Rider');
const Driver = require('../DriverModel/DriverModel');
const adminAuthMiddleware = require('../middleware/adminAuthMiddleware');

// GET /api/admin/riders-list
// Returns all riders for dropdown (id, name, mobile)
router.get('/riders-list', adminAuthMiddleware, async (req, res) => {
  try {
    const { search = '' } = req.query;

    const filter = {
      status: { $ne: 'deleted' },
      name: { $exists: true, $ne: '' }
    };

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { mobile: { $regex: search, $options: 'i' } }
      ];
    }

    const riders = await Rider.find(filter)
      .select('_id name mobile')
      .sort({ name: 1 })
      .limit(200)
      .lean();

    res.json({ success: true, data: riders });
  } catch (error) {
    console.error('Riders list error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /api/admin/drivers-list
// Returns all approved drivers for dropdown (id, fullName, mobile)
router.get('/drivers-list', adminAuthMiddleware, async (req, res) => {
  try {
    const { search = '' } = req.query;

    const filter = { status: 'Approved' };

    if (search) {
      filter.$or = [
        { 'personalInformation.fullName': { $regex: search, $options: 'i' } },
        { mobile: { $regex: search, $options: 'i' } }
      ];
    }

    const drivers = await Driver.find(filter)
      .select('_id personalInformation.fullName mobile')
      .sort({ 'personalInformation.fullName': 1 })
      .limit(200)
      .lean();

    const formatted = drivers.map(d => ({
      _id: d._id,
      name: d.personalInformation?.fullName || 'N/A',
      mobile: d.mobile
    }));

    res.json({ success: true, data: formatted });
  } catch (error) {
    console.error('Drivers list error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
