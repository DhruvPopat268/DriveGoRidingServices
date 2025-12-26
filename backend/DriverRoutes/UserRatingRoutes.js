const express = require("express");
const UserRating = require("../DriverModel/UserRating");
const Ride = require("../models/Ride");
const Driver = require("../DriverModel/DriverModel");
const NotificationService = require('../Services/notificationService');
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const adminAuthMiddleware = require("../middleware/adminAuthMiddleware");

router.post("/", authMiddleware, async (req, res) => {
  try {
    const { rideId, rating, comment, driverFeedback, cabFeedback, parcelFeedback, wouldChooseAgain } = req.body;

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

    // Category-based feedback validation
    const categoryName = ride.rideInfo?.categoryName?.toLowerCase();
    
    if (categoryName === 'driver' && (cabFeedback?.length > 0 || parcelFeedback?.parcelCondition?.length > 0 || parcelFeedback?.deliveryExperience?.length > 0)) {
      return res.status(400).json({ message: "Only driver feedback is allowed for driver category rides" });
    }
    
    if (categoryName === 'cab' && (driverFeedback?.length > 0 || parcelFeedback?.parcelCondition?.length > 0 || parcelFeedback?.deliveryExperience?.length > 0)) {
      return res.status(400).json({ message: "Only cab feedback is allowed for cab category rides" });
    }
    
    if (categoryName === 'parcel' && (driverFeedback?.length > 0 || cabFeedback?.length > 0)) {
      return res.status(400).json({ message: "Only parcel feedback is allowed for parcel category rides" });
    }

    const userRatingg = await UserRating.findOne({ rideId });
    if (userRatingg) {
      return res.status(400).json({ message: "Rating for this ride already exists" });
    }

    const userRating = new UserRating({
      userId: ride.riderId,
      driverId: ride.driverId,
      rideId,
      rating,
      comment,
      driverFeedback,
      cabFeedback,
      parcelFeedback,
      wouldChooseAgain
    });

    await userRating.save();

    // Update driver's rating history and average
    const driver = await Driver.findById(ride.driverId);
    if (driver) {
      driver.ratings.ratingHistory.push(rating);
      const totalRatings = driver.ratings.ratingHistory.length;
      const sumRatings = driver.ratings.ratingHistory.reduce((sum, r) => sum + r, 0);
      driver.ratings.avgRating = totalRatings > 0 ? sumRatings / totalRatings : 0;
      await driver.save();
      
      // Send rating notification to driver
      try {
        await NotificationService.sendAndStoreDriverNotification(
          ride.driverId,
          driver.oneSignalPlayerId,
          'New Rating Received',
          'The customer rated your ride. Tap to view details',
          'rating_received',
          { rideId, rating },
          ride.rideInfo?.categoryId || null
        );
      } catch (notifError) {
        console.error('Rating notification error:', notifError);
      }
    }

    res.json({
      success: true,
      message: "User rating submitted successfully",
      data: userRating
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/given-by-user",adminAuthMiddleware, async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }



    const ratings = await UserRating.find({ userId })
      .populate('userId', 'name')
      .populate('driverId', 'personalInformation.fullName')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: ratings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/all",adminAuthMiddleware, async (req, res) => {
  try {
    const ratings = await UserRating.find()
      .populate('userId', 'name')
      .populate('driverId', 'personalInformation.fullName')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: ratings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/:driverId",adminAuthMiddleware, async (req, res) => {
  try {
    const { driverId } = req.params;
    const ratings = await UserRating.find({ driverId })
      .populate('userId', 'name')
      .populate('driverId', 'personalInformation.fullName')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: ratings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;