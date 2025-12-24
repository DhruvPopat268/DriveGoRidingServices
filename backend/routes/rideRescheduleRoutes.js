const express = require('express');
const router = express.Router();
const RideRescheduleService = require('../Services/rideRescheduleService');
const authMiddleware = require('../middleware/authMiddleware');
const driverAuthMiddleware = require('../middleware/driverAuthMiddleware');

// Reschedule ride
router.put('/reschedule',authMiddleware, async (req, res) => {
  try {
    const { rideId, selectedDate, selectedTime } = req.body;
    console.log(req.body);

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