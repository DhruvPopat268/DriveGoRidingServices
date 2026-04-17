const express = require("express");
const router = express.Router();
const DriverStatusLog = require("../DriverModel/DriverStatusLog");
const Driver = require("../DriverModel/DriverModel");

// Get all driver status logs with pagination
router.get("/driver-status-logs", async (req, res) => {
  try {
    const { page = 1, limit = 20, driverId, status, startDate, endDate } = req.query;
    
    const filter = {};
    
    if (driverId) filter.driverId = driverId;
    if (status) filter.status = status;
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) filter.timestamp.$gte = new Date(startDate);
      if (endDate) filter.timestamp.$lte = new Date(endDate);
    }

    const logs = await DriverStatusLog.find(filter)
      .populate("driverId", "personalInformation.fullName mobile uniqueId")
      .sort({ timestamp: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await DriverStatusLog.countDocuments(filter);

    res.json({
      success: true,
      data: logs,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalRecords: total,
        hasNext: page * limit < total,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get specific driver's status history
router.get("/driver-status-logs/:driverId", async (req, res) => {
  try {
    const { driverId } = req.params;
    const { page = 1, limit = 50, days = 30 } = req.query;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const logs = await DriverStatusLog.find({
      driverId,
      timestamp: { $gte: startDate }
    })
      .sort({ timestamp: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const driver = await Driver.findById(driverId)
      .select("personalInformation.fullName mobile uniqueId isOnline");

    res.json({
      success: true,
      driver,
      logs,
      totalLogs: logs.length
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get driver online/offline statistics
router.get("/driver-status-stats", async (req, res) => {
  try {
    const { driverId, days = 7 } = req.query;
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const matchFilter = { timestamp: { $gte: startDate } };
    if (driverId) matchFilter.driverId = driverId;

    const stats = await DriverStatusLog.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: {
            driverId: "$driverId",
            status: "$status"
          },
          count: { $sum: 1 },
          lastActivity: { $max: "$timestamp" }
        }
      },
      {
        $group: {
          _id: "$_id.driverId",
          onlineCount: {
            $sum: { $cond: [{ $eq: ["$_id.status", "online"] }, "$count", 0] }
          },
          offlineCount: {
            $sum: { $cond: [{ $eq: ["$_id.status", "offline"] }, "$count", 0] }
          },
          lastActivity: { $max: "$lastActivity" }
        }
      },
      {
        $lookup: {
          from: "drivers",
          localField: "_id",
          foreignField: "_id",
          as: "driver"
        }
      },
      {
        $project: {
          driverId: "$_id",
          onlineCount: 1,
          offlineCount: 1,
          totalActivities: { $add: ["$onlineCount", "$offlineCount"] },
          lastActivity: 1,
          driverName: { $arrayElemAt: ["$driver.personalInformation.fullName", 0] },
          mobile: { $arrayElemAt: ["$driver.mobile", 0] },
          currentStatus: { $arrayElemAt: ["$driver.isOnline", 0] }
        }
      }
    ]);

    res.json({
      success: true,
      data: stats,
      period: `Last ${days} days`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;