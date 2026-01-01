const express = require('express');
const router = express.Router();
const Driver = require('../DriverModel/DriverModel'); // Adjust path as needed
const Rider = require('../models/Rider'); // Adjust path as needed
const Ride = require('../models/Ride'); // Adjust path as needed
const AdminWalletLedger = require('../models/AdminWalletLedger'); // Adjust path as needed

// Helper function to get start and end of day
const getDateRange = (date) => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  
  return { start, end };
};

// Helper function to calculate percentage change
const calculatePercentageChange = (today, yesterday) => {
  if (yesterday === 0) return today > 0 ? 100 : 0;
  return ((today - yesterday) / yesterday * 100).toFixed(1);
};

// GET /api/dashboard/stats - Get dashboard statistics
router.get('/stats', async (req, res) => {
  try {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const todayRange = getDateRange(today);
    const yesterdayRange = getDateRange(yesterday);

    // Total Rides Today vs Yesterday
    const totalRidesToday = await Ride.countDocuments({
      createdAt: { $gte: todayRange.start, $lte: todayRange.end }
    });
    
    const totalRidesYesterday = await Ride.countDocuments({
      createdAt: { $gte: yesterdayRange.start, $lte: yesterdayRange.end }
    });

    // Scheduled Rides Today (rides with selectedDate as today)
    const scheduledRidesToday = await Ride.countDocuments({
      'rideInfo.selectedDate': {
        $gte: todayRange.start,
        $lte: todayRange.end
      }
    });

    // Active Drivers (status: Approved, isOnline: true)
    const activeDrivers = await Driver.countDocuments({
      status: 'Approved',
      isOnline: true
    });

    // Active Riders (complete profile: name, mobile, gender, status: active)
    const activeRiders = await Rider.countDocuments({
      name: { $exists: true, $ne: '' },
      mobile: { $exists: true, $ne: '' },
      gender: { $exists: true, $ne: '' },
      status: 'active'
    });

    // Revenue Today vs Yesterday (net revenue: credits - debits)
    const revenueToday = await AdminWalletLedger.aggregate([
      { $unwind: '$transactions' },
      {
        $match: {
          'transactions.createdAt': { $gte: todayRange.start, $lte: todayRange.end }
        }
      },
      {
        $group: {
          _id: '$transactions.transactionType',
          total: { $sum: '$transactions.amount' }
        }
      }
    ]);

    const revenueYesterday = await AdminWalletLedger.aggregate([
      { $unwind: '$transactions' },
      {
        $match: {
          'transactions.createdAt': { $gte: yesterdayRange.start, $lte: yesterdayRange.end }
        }
      },
      {
        $group: {
          _id: '$transactions.transactionType',
          total: { $sum: '$transactions.amount' }
        }
      }
    ]);

    // Calculate net revenue (credits - debits)
    const todayCredits = revenueToday.find(r => r._id === 'CREDIT')?.total || 0;
    const todayDebits = revenueToday.find(r => r._id === 'DEBIT')?.total || 0;
    const todayNetRevenue = todayCredits - todayDebits;

    const yesterdayCredits = revenueYesterday.find(r => r._id === 'CREDIT')?.total || 0;
    const yesterdayDebits = revenueYesterday.find(r => r._id === 'DEBIT')?.total || 0;
    const yesterdayNetRevenue = yesterdayCredits - yesterdayDebits;

    // Ride Status Counts for Today
    const bookedRidesToday = await Ride.countDocuments({
      status: 'BOOKED',
      createdAt: { $gte: todayRange.start, $lte: todayRange.end }
    });

    const confirmedRidesToday = await Ride.countDocuments({
      status: 'CONFIRMED',
      createdAt: { $gte: todayRange.start, $lte: todayRange.end }
    });

    const ongoingRidesToday = await Ride.countDocuments({
      status: 'ONGOING',
      createdAt: { $gte: todayRange.start, $lte: todayRange.end }
    });

    const extendedRidesToday = await Ride.countDocuments({
      status: 'EXTENDED',
      createdAt: { $gte: todayRange.start, $lte: todayRange.end }
    });

    const cancelledRidesToday = await Ride.countDocuments({
      status: 'CANCELLED',
      createdAt: { $gte: todayRange.start, $lte: todayRange.end }
    });

    // Calculate percentage changes
    const ridesPercentageChange = calculatePercentageChange(totalRidesToday, totalRidesYesterday);
    const revenuePercentageChange = calculatePercentageChange(todayNetRevenue, yesterdayNetRevenue);

    // Response data
    const stats = {
      totalRidesToday: {
        count: totalRidesToday,
        percentage: `${ridesPercentageChange >= 0 ? '+' : ''}${ridesPercentageChange}%`,
        trend: ridesPercentageChange >= 0 ? 'up' : 'down'
      },
      scheduledRidesToday,
      activeDrivers,
      activeRiders,
      revenueToday: {
        amount: todayNetRevenue,
        percentage: `${revenuePercentageChange >= 0 ? '+' : ''}${revenuePercentageChange}%`,
        trend: revenuePercentageChange >= 0 ? 'up' : 'down'
      },
      bookedToday: bookedRidesToday,
      confirmedToday: confirmedRidesToday,
      ongoingToday: ongoingRidesToday,
      extendedToday: extendedRidesToday,
      cancelledToday: cancelledRidesToday
    };

    res.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard statistics',
      error: error.message
    });
  }
});

// GET /api/dashboard/ride-status-distribution - Get ride status distribution for pie chart
router.get('/ride-status-distribution', async (req, res) => {
  try {
    const rideStatusCounts = await Ride.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Format data for pie chart
    const statusData = {
      BOOKED: 0,
      CONFIRMED: 0,
      ONGOING: 0,
      COMPLETED: 0,
      CANCELLED: 0,
      EXTENDED: 0,
      REACHED: 0
    };

    rideStatusCounts.forEach(item => {
      if (statusData.hasOwnProperty(item._id)) {
        statusData[item._id] = item.count;
      }
    });

    res.json({
      success: true,
      data: statusData
    });

  } catch (error) {
    console.error('Error fetching ride status distribution:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching ride status distribution',
      error: error.message
    });
  }
});

// GET /api/dashboard/revenue-distribution - Get revenue distribution by category
router.get('/revenue-distribution', async (req, res) => {
  try {
    // Get all revenue transactions (not just today)
    const revenueByCategory = await AdminWalletLedger.aggregate([
      { $unwind: '$transactions' },
      {
        $match: {
          'transactions.transactionType': 'CREDIT'
        }
      },
      {
        $group: {
          _id: '$transactions.type',
          total: { $sum: '$transactions.amount' }
        }
      }
    ]);

    // Format data for pie chart
    const categoryData = {
      driver: 0,
      cab: 0,
      parcel: 0
    };

    revenueByCategory.forEach(item => {
      // Map your transaction types to categories
      if (item._id && item._id.toLowerCase().includes('driver')) {
        categoryData.driver += item.total;
      } else if (item._id && item._id.toLowerCase().includes('cab')) {
        categoryData.cab += item.total;
      } else if (item._id && item._id.toLowerCase().includes('parcel')) {
        categoryData.parcel += item.total;
      }
    });

    res.json({
      success: true,
      data: categoryData
    });

  } catch (error) {
    console.error('Error fetching revenue distribution:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching revenue distribution',
      error: error.message
    });
  }
});

// GET /api/dashboard/weekly-revenue - Get weekly revenue data for chart
router.get('/weekly-revenue', async (req, res) => {
  try {
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - 6); // Last 7 days
    
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const chartData = [];
    let totalRevenue = 0;
    let totalRides = 0;

    // Generate data for each day of the week
    for (let i = 0; i < 7; i++) {
      const currentDay = new Date(weekStart);
      currentDay.setDate(weekStart.getDate() + i);
      const dayRange = getDateRange(currentDay);
      
      // Get revenue for this day (net: credits - debits)
      const dayRevenue = await AdminWalletLedger.aggregate([
        { $unwind: '$transactions' },
        {
          $match: {
            'transactions.createdAt': { $gte: dayRange.start, $lte: dayRange.end }
          }
        },
        {
          $group: {
            _id: '$transactions.transactionType',
            total: { $sum: '$transactions.amount' }
          }
        }
      ]);

      const dayCredits = dayRevenue.find(r => r._id === 'CREDIT')?.total || 0;
      const dayDebits = dayRevenue.find(r => r._id === 'DEBIT')?.total || 0;
      const netRevenue = dayCredits - dayDebits;

      // Get ride count for this day
      const dayRides = await Ride.countDocuments({
        createdAt: { $gte: dayRange.start, $lte: dayRange.end }
      });

      chartData.push({
        name: dayNames[currentDay.getDay()],
        revenue: netRevenue,
        rides: dayRides
      });

      totalRevenue += netRevenue;
      totalRides += dayRides;
    }

    res.json({
      success: true,
      data: {
        chartData,
        summary: {
          totalRevenue,
          totalRides
        }
      }
    });

  } catch (error) {
    console.error('Error fetching weekly revenue:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching weekly revenue',
      error: error.message
    });
  }
});

module.exports = router;