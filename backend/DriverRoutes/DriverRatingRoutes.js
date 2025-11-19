const express = require("express");
const DriverRating = require("../DriverModel/DriverRating");
const Ride = require("../models/Ride");
const router = express.Router();
const DriverAuthMiddleware = require("../middleware/driverAuthMiddleware");

router.post("/",DriverAuthMiddleware, async (req, res) => {
  try {
    const { rideId, rating, comment } = req.body;

    if (!rideId || !rating) {
      return res.status(400).json({ message: "rideId and rating are required" });
    }

    const ride = await Ride.findById(rideId);
    if (!ride) {
      return res.status(404).json({ message: "Ride not found" });
    }

    const driverRating = new DriverRating({
      driverId: ride.driverId,
      userId: ride.riderId,
      rideId,
      rating,
      comment
    });

    await driverRating.save();

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
    
    const ratings = await DriverRating.find({ driverId }).sort({ createdAt: -1 });
    res.json({ success: true, data: ratings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/all", async (req, res) => {
  try {
    const ratings = await DriverRating.find().sort({ createdAt: -1 });
    res.json({ success: true, data: ratings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;