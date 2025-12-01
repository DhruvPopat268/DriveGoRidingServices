const express = require('express');
const DriverNotification = require('../DriverModel/DriverNotification');
const DriverAuthMiddleware = require('../middleware/driverAuthMiddleware');
const router = express.Router();

// Get driver notifications
router.get('/', DriverAuthMiddleware, async (req, res) => {
  try {
    const driverId = req.driver.driverId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const notifications = await DriverNotification.find({ driverId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalNotifications = await DriverNotification.countDocuments({ driverId });
    const unreadCount = await DriverNotification.countDocuments({ driverId, isRead: false });

    res.json({
      success: true,
      data: notifications,
      pagination: {
        page,
        limit,
        total: totalNotifications,
        pages: Math.ceil(totalNotifications / limit)
      },
      unreadCount
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Mark notification as read
router.patch('/read', DriverAuthMiddleware, async (req, res) => {
  try {
    const { notificationId } = req.body;
    const driverId = req.driver.driverId;

    const notification = await DriverNotification.findOneAndUpdate(
      { _id: notificationId, driverId },
      { isRead: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    res.json({ success: true, data: notification });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Mark all notifications as read
router.patch('/read-all', DriverAuthMiddleware, async (req, res) => {
  try {
    const driverId = req.driver.driverId;

    await DriverNotification.updateMany(
      { driverId, isRead: false },
      { isRead: true }
    );

    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;