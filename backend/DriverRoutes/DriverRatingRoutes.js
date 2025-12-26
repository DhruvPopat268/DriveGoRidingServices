const express = require("express");
const DriverRating = require("../DriverModel/DriverRating");
const Ride = require("../models/Ride");
const Rider = require("../models/Rider");
const router = express.Router();
const DriverAuthMiddleware = require("../middleware/driverAuthMiddleware");
const NotificationService = require("../Services/notificationService");
const RiderNotification = require("../models/RiderNotification");
const Driver = require("../DriverModel/DriverModel");
const adminAuthMiddleware = require("../middleware/adminAuthMiddleware");

router.post("/", DriverAuthMiddleware, async (req, res) => {
  try {
    const { rideId, rating, comment } = req.body;


    if (!rideId || !rating) {
      return res.status(400).json({ message: "rideId and rating are required" });
    }

    const ride = await Ride.findById(rideId);
    if (!ride) {
      return res.status(404).json({ message: "Ride not found" });
    }

    if (ride.status !== "COMPLETED") {
      return res.status(400).json({ message: "Rating can only be given for completed rides" });
    }

    const DriverRatingg = await DriverRating.findOne({ rideId });
    if (DriverRatingg) {
      return res.status(400).json({ message: "Rating for this ride already exists" });
    }

    const driverRating = new DriverRating({
      driverId: ride.driverId,
      userId: ride.riderId,
      rideId,
      rating,
      comment
    });

    await driverRating.save();

    // Update rider's rating history and average
    const rider = await Rider.findById(ride.riderId);
    if (rider) {
      rider.ratings.ratingHistory.push(rating);
      const totalRatings = rider.ratings.ratingHistory.length;
      const sumRatings = rider.ratings.ratingHistory.reduce((sum, r) => sum + r, 0);
      rider.ratings.avgRating = totalRatings > 0 ? sumRatings / totalRatings : 0;
      await rider.save();
    }

    // Send notification to rider
    try {
      const driver = await Driver.findById(ride.driverId);
      if (rider && rider.oneSignalPlayerId && driver) {
        const driverName = driver.personalInformation?.fullName || 'Your driver';
        const stars = '★'.repeat(rating) + '☆'.repeat(5 - rating);
        const message = `${driverName} rated you ${rating}/5 stars (${stars}). ${comment ? `Comment: "${comment}"` : 'Keep up the great work!'}`;
        
        await NotificationService.sendToUser(
          rider.oneSignalPlayerId,
          'Driver Rating Received',
          message
        );
        
        
        await RiderNotification.create({
          riderId: ride.riderId,
          rideId: ride._id,
          title: 'Driver Rating Received',
          message: message,
          categoryId: ride.rideInfo?.categoryId || null,
          type: 'driver_rating_received'
        });
      }
    } catch (notifError) {
      console.error('Error sending rider notification:', notifError);
    }

    res.json({
      success: true,
      message: "Driver rating submitted successfully",
      data: driverRating
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/given-by-driver",adminAuthMiddleware, async (req, res) => {
  try {
    const { driverId } = req.body;

    if (!driverId) {
      return res.status(400).json({ message: "driverId is required" });
    }

    const ratings = await DriverRating.find({ driverId })
      .populate('userId', 'name')
      .populate('driverId', 'personalInformation.fullName').sort({ createdAt: -1 });
    res.json({ success: true, data: ratings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/all",adminAuthMiddleware, async (req, res) => {
  try {
    const ratings = await DriverRating.find()
      .populate('userId', 'name')
      .populate('driverId', 'personalInformation.fullName')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: ratings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;