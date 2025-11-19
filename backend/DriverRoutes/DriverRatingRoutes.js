const express = require("express");
const DriverRating = require("../DriverModel/DriverRating");
const Ride = require("../models/Ride");
const Rider = require("../models/Rider");
const router = express.Router();
const DriverAuthMiddleware = require("../middleware/driverAuthMiddleware");

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

    res.json({
      success: true,
      message: "Driver rating submitted successfully",
      data: driverRating
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/given-by-driver", async (req, res) => {
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

router.get("/all", async (req, res) => {
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