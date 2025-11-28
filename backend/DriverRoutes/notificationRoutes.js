const express = require('express');
const router = express.Router();
const Driver = require('../DriverModel/DriverModel');
const DriverAuthMiddleware = require('../middleware/driverAuthMiddleware');
const NotificationService = require('../services/notificationService');

// Update OneSignal Player ID
router.post('/update-player-id', DriverAuthMiddleware, async (req, res) => {
  try {
    const { playerId } = req.body;
    const driverId = req.driver.driverId;

    if (!playerId) {
      return res.status(400).json({ success: false, message: 'Player ID is required' });
    }

    await Driver.findByIdAndUpdate(driverId, { oneSignalPlayerId: playerId });

    res.json({ success: true, message: 'Player ID updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Send test notification
router.post('/send-test-notification', DriverAuthMiddleware, async (req, res) => {
  try {
    const driverId = req.driver.driverId;
    const driver = await Driver.findById(driverId);

    if (!driver.oneSignalPlayerId) {
      return res.status(400).json({ success: false, message: 'OneSignal Player ID not found' });
    }

    const result = await NotificationService.sendToUser(
      driver.oneSignalPlayerId,
      'Test Notification',
      'This is a test notification from DriveGo',
      { type: 'test' }
    );

    res.json({ success: result.success, message: 'Test notification sent', data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;