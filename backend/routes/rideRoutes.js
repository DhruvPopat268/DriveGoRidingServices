const express = require("express");
const Ride = require('../models/Ride'); // Ensure this path is correct
const authMiddleware = require('../middleware/authMiddleware'); // Ensure this path is correct
const router = express.Router();

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
      totalPayable,
      paymentType,
    } = req.body;

    if (!categoryId || !totalPayable || !paymentType) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    const { riderId, mobile } = req.rider;

    const newRide = new Ride({
      riderId,
      riderMobile: mobile,

      // ✅ move everything into rideInfo
      rideInfo: {
        categoryId,
        subcategoryId,
        subcategoryName,
        carType,
        fromLocation,
        toLocation,
        includeInsurance,
        notes,
        selectedCategory: selectedCategory?.category || selectedCategory,
        selectedDate,
        selectedTime,
        selectedUsage,
        transmissionType,

        insuranceCharges: selectedCategory?.insuranceCharges || req.body.insuranceCharges || 0,
        discount: selectedCategory?.discount || req.body.discount || 0,
        gstCharges: selectedCategory?.gstCharges || req.body.gstCharges || 0,
        subtotal: selectedCategory?.subtotal || req.body.subtotal || 0,
      },

      // ✅ keep at root
      totalPayable: selectedCategory?.totalPayable || req.body.totalPayable,
      paymentType,
      status: "BOOKED",
    });

    await newRide.save();
    res.status(201).json({ message: "Ride booked successfully", ride: newRide });
  } catch (error) {
    console.error(error);
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