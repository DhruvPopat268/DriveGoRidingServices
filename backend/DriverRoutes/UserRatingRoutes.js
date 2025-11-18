const express = require("express");
const UserRating = require("../DriverModel/UserRating");
const Ride = require("../models/Ride");
const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { rideId, rating, comment } = req.body;

    if (!rideId || !rating) {
      return res.status(400).json({ message: "rideId and rating are required" });
    }

    const ride = await Ride.findById(rideId);
    if (!ride) {
      return res.status(404).json({ message: "Ride not found" });
    }

    const userRating = new UserRating({
      userId: ride.riderId,
      driverId: ride.driverId,
      rideId,
      rating,
      comment
    });

    await userRating.save();

    res.json({
      success: true,
      message: "User rating submitted successfully",
      data: userRating
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/given-by-user", async (req, res) => {
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

router.get("/all", async (req, res) => {
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

router.get("/:driverId", async (req, res) => {
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