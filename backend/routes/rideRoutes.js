const express = require("express");
const Ride = require('../models/Ride'); // Ensure this path is correct
const authMiddleware = require('../middleware/authMiddleware'); // Ensure this path is correct
const router = express.Router();
const Rider = require("../models/Rider");

// Save new ride booking
router.post("/book", authMiddleware, async (req, res) => {
  try {
    const {
      categoryId,
      subcategoryId,
      subcategoryName,
      carType,
      fromLocation,
      toLocation,
      includeInsurance,
      notes,
      selectedCategory,
      selectedDate,
      selectedTime,
      selectedUsage,
      transmissionType,
      totalAmount,
      paymentType,
      totalPayable,
      referralEarning,   // ✅ from frontend
      referralBalance    // ✅ from frontend
    } = req.body;

    console.log("Request Body:", req.body);

    if (!categoryId || !totalAmount || !paymentType) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    // ✅ find charges for the chosen category
    const selectedCategoryData = totalAmount.find(
      (item) => item.category === selectedCategory
    );

    if (!selectedCategoryData) {
      return res.status(400).json({ message: "Invalid selectedCategory" });
    }

    const { riderId, mobile } = req.rider;

    const newRide = new Ride({
      riderId,
      riderMobile: mobile,
      rideInfo: {
        categoryId,
        subcategoryId,
        subcategoryName,
        carType,
        fromLocation,
        toLocation,
        includeInsurance,
        notes,
        selectedCategory,
        selectedDate,
        selectedTime,
        selectedUsage,
        transmissionType,
        insuranceCharges: selectedCategoryData.insuranceCharges || 0,
        cancellationCharges: selectedCategoryData.cancellationCharges || 0,
        discount: selectedCategoryData.discountApplied || 0,
        gstCharges: selectedCategoryData.gstCharges || 0,
        subtotal: selectedCategoryData.subtotal || 0,
        adminCharges: selectedCategoryData.adminCommissionAdjusted || 0,
      },
      referralEarning: referralEarning || false,   // ✅ store toggle
      referralBalance: referralEarning ? referralBalance : 0, // ✅ store amount used
      totalPayable,
      paymentType,
      status: "BOOKED",
    });

    await newRide.save();

    // ✅ Referral Earnings Update
    const rider = await Rider.findById(riderId);

    if (rider) {
      // Case 1: Rider used referral balance
      if (referralEarning && referralBalance > 0) {
        // If full balance used, reset to 0
        if (rider.referralEarning.currentBalance === referralBalance) {
          rider.referralEarning.currentBalance = 0;
        } else {
          // Otherwise subtract the used amount
          rider.referralEarning.currentBalance =
            rider.referralEarning.currentBalance - referralBalance;
        }
        await rider.save();
      }

      // Case 2: Rider was referred by someone → give bonus to referrer
      if (rider.referredBy) {
        const adminCharges = selectedCategoryData.adminCommissionAdjusted || 0;
        const referralBonus = adminCharges * 0.2; // 20%

        await Rider.findByIdAndUpdate(rider.referredBy, {
          $inc: {
            "referralEarning.totalEarnings": referralBonus,
            "referralEarning.currentBalance": referralBonus,
          },
        });
      }
    }

    res.status(201).json({
      message: "Ride booked successfully",
      ride: newRide,
    });
  } catch (error) {
    console.error("Book ride error:", error);
    res.status(500).json({ message: "Server error", error });
  }
});

// all rides
router.post("/my-rides", authMiddleware, async (req, res) => {
  try {
    // riderId comes from token (authMiddleware)
    const { riderId } = req.rider;

    // Find all rides for this rider sorted by createdAt desc
    const rides = await Ride.find({ riderId }).sort({ createdAt: -1 });

    if (!rides || rides.length === 0) {
      return res.status(200).json({ success: false, message: "No rides found" });
    }

    res.status(200).json({
      success: true,
      count: rides.length,
      rides,
    });
  } catch (error) {
    console.error("Error fetching rides:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// booked rides
router.post("/booked/my-rides", authMiddleware, async (req, res) => {
  try {
    // riderId comes from token (authMiddleware)
    const { riderId } = req.rider;

    // Find only rides with status = "BOOKED" sorted by createdAt desc
    const rides = await Ride.find({ riderId, status: "BOOKED" }).sort({ createdAt: -1 });

    if (!rides || rides.length === 0) {
      return res.status(200).json({ success: false, message: "No booked rides found" });
    }

    res.status(200).json({
      success: true,
      count: rides.length,
      rides,
    });
  } catch (error) {
    console.error("Error fetching booked rides:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

//give ride doc as per ride id for detail view
router.post("/booking/id", authMiddleware, async (req, res) => {
  try {
    const { bookingId } = req.body;

    if (!bookingId) {
      return res.status(400).json({ message: "Booking ID is required" });
    }

    const booking = await Ride.findById(bookingId);

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    res.json({ booking });
  } catch (error) {
    console.error("Error fetching booking:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

//for cancel ride using ride id
router.post("/booking/cancel", authMiddleware, async (req, res) => {
  try {
    const { bookingId } = req.body;

    if (!bookingId) {
      return res.status(400).json({ message: "Booking ID is required" });
    }

    // Find and update the booking
    const updatedBooking = await Ride.findByIdAndUpdate(
      bookingId,
      { status: "CANCELLED" },
      { new: true } // return updated doc
    );

    if (!updatedBooking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    res.json({
      message: "Booking cancelled successfully",
      booking: updatedBooking,
    });
  } catch (error) {
    console.error("Error cancelling booking:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;