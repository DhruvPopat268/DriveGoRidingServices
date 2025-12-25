const express = require('express');
const router = express.Router();
const RideRescheduleService = require('../Services/rideRescheduleService');
const rideCostService = require('../Services/rideCostService');
const authMiddleware = require('../middleware/authMiddleware');
const driverAuthMiddleware = require('../middleware/driverAuthMiddleware');

// Reschedule ride
router.put('/reschedule',authMiddleware, async (req, res) => {
  try {
    const { rideId, selectedDate, selectedTime } = req.body;

    const ride = await require('../models/Ride').findById(rideId);
    if (!ride) {
      return res.status(404).json({ message: 'Ride not found' });
    }

    // Check if weekly or monthly ride
    const subcategoryName = ride.rideInfo?.subcategoryName?.toLowerCase() || '';
    if (subcategoryName.includes('weekly') || subcategoryName.includes('monthly')) {
      return res.status(400).json({ 
        message: 'Weekly or monthly rides cannot be rescheduled' 
      });
    }

    // Get cancellation buffer time based on category type
    const Category = require('../models/Category');
    const category = await Category.findById(ride.rideInfo.categoryId);
    const categoryName = category?.name?.toLowerCase() || '';
    
    let cancellationBufferTime = 0;
    
    if (categoryName === 'cab') {
      const data = await rideCostService.getCabRideIncludedData(
        ride.rideInfo.categoryId,
        ride.rideInfo.subcategoryId,
        ride.rideInfo.subSubcategoryId,
        ride.rideInfo.selectedUsage,
        ride.rideInfo.selectedCategoryId
      );
      cancellationBufferTime = data.cancellationBufferTime;
    } else if (categoryName === 'parcel') {
      const data = await rideCostService.getParcelRideIncludedData(
        ride.rideInfo.categoryId,
        ride.rideInfo.subcategoryId,
        ride.rideInfo.selectedUsage,
        ride.rideInfo.selectedCategoryId
      );
      cancellationBufferTime = data.cancellationBufferTime;
    } else {
      const data = await rideCostService.getDriverRideIncludedData(
        ride.rideInfo.categoryId,
        ride.rideInfo.subcategoryId,
        ride.rideInfo.subSubcategoryId,
        ride.rideInfo.selectedUsage,
        ride.rideInfo.selectedCategoryId
      );
      cancellationBufferTime = data.cancellationBufferTime;
    }

    // Check if reschedule is allowed based on buffer time
    const rideDateTime = new Date(`${ride.rideInfo.selectedDate.toISOString().split('T')[0]}T${ride.rideInfo.selectedTime}`);
    const currentDateTime = new Date();
    const timeDiffMinutes = (rideDateTime - currentDateTime) / (1000 * 60);

    if (timeDiffMinutes <= cancellationBufferTime) {
      return res.status(400).json({
        success: false,
        message: `Cannot reschedule ride. Reschedule is not allowed within ${cancellationBufferTime} minutes of ride start time`
      });
    }

    // Check if can reschedule directly or need driver approval
    if (RideRescheduleService.canRescheduleDirectly(ride)) {
      const result = await RideRescheduleService.rescheduleDirectly(rideId, {
        selectedDate,
        selectedTime
      });
      return res.json(result);
    } else {
      const result = await RideRescheduleService.sendRescheduleRequest(rideId, {
        selectedDate,
        selectedTime
      });
      return res.json(result);
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Driver response to reschedule request
router.put('/reschedule-response',driverAuthMiddleware, async (req, res) => {
  try {
    const { rideId, action } = req.body;

    const result = await RideRescheduleService.handleDriverResponse(rideId, action);

    return res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;