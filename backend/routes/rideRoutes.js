const express = require("express");
const Ride = require('../models/Ride'); // Ensure this path is correct
const authMiddleware = require('../middleware/authMiddleware'); // Ensure this path is correct
const router = express.Router();
const Rider = require("../models/Rider");
const Driver = require("../DriverModel/DriverModel");
const axios = require("axios");
const referralRules = require("../models/ReferralRule");
const driverAuthMiddleware = require("../middleware/driverAuthMiddleware");

// Save new ride booking
router.get('/', async (req, res) => {
  try {
    const rides = (await Ride.find().sort({ createdAt: -1 }));
    res.json(rides);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.post("/book", authMiddleware, async (req, res) => {
  try {
    const {
      categoryId,
      subcategoryId,
      categoryName,
      subcategoryName,
      carType,
      fromLocationData,
      toLocationData,
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
      referralEarning,
      referralBalance,
      selectedDates,
      senderDetails,     // ✅ new
      receiverDetails,   // ✅ new
    } = req.body;

    if (!categoryId || !totalAmount || !paymentType || !selectedDate || !selectedTime) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    const selectedCategoryData = totalAmount.find(
      (item) => item.category === selectedCategory
    );

    if (!selectedCategoryData) {
      return res.status(400).json({ message: "Invalid selectedCategory" });
    }

    const { riderId, mobile } = req.rider;

    const riderData = await Rider.findOne({mobile})
    const riderName = riderData.name

    const newRide = new Ride({
      riderId,
      riderInfo: {
        riderName,
        riderMobile: mobile
      },
      rideInfo: {
        categoryId,
        subcategoryId,
        categoryName,
        subcategoryName,
        carType,
        fromLocation: fromLocationData,
        toLocation: toLocationData && toLocationData !== "" ? toLocationData : undefined,

        // ✅ store sender & receiver details
        senderDetails,
        receiverDetails,

        includeInsurance,
        notes,
        selectedCategory,
        selectedDate,
        selectedTime,
        selectedUsage,
        transmissionType,
        selectedDates: selectedDates || [],
        driverCharges: selectedCategoryData.driverCharges || 0,
        insuranceCharges: selectedCategoryData.insuranceCharges || 0,
        cancellationCharges: selectedCategoryData.cancellationCharges || 0,
        discount: selectedCategoryData.discountApplied || 0,
        gstCharges: selectedCategoryData.gstCharges || 0,
        subtotal: selectedCategoryData.subtotal || 0,
        adminCharges: selectedCategoryData.adminCommissionAdjusted || 0,
      },
      referralEarning: referralEarning || false,
      referralBalance: referralEarning ? referralBalance : 0,
      totalPayable,
      paymentType,
      status: "BOOKED",
    });

    await newRide.save();

    console.log('📱 New ride booked:', newRide._id);

    // Emit socket event to eligible drivers only
    const io = req.app.get('io');
    const onlineDrivers = req.app.get('onlineDrivers');
    
    if (io && onlineDrivers) {
      const rideData = {
        rideId: newRide._id,
        categoryName: categoryName,
        fromLocation: fromLocationData,
        toLocation: toLocationData,
        selectedDate: selectedDate,
        selectedTime: selectedTime,
        totalPayable: totalPayable,
        status: 'BOOKED'
      };

      // Filter drivers who are NOT in EXTENDED status
      const eligibleDrivers = Object.entries(onlineDrivers)
        .filter(([driverId, driverData]) => driverData.status !== 'EXTENDED')
        .map(([driverId, driverData]) => ({ driverId, ...driverData }));

      console.log(`🎯 Found ${eligibleDrivers.length} eligible drivers (not EXTENDED)`);

      // Send to each eligible driver
      let sentCount = 0;
      eligibleDrivers.forEach(({ driverId, socketId }) => {
        io.to(socketId).emit('new-ride', rideData);
        sentCount++;
      });

      console.log(`🚗 New ride ${newRide._id} sent to ${sentCount} drivers`);
    } else {
      console.log('❌ Socket.io or onlineDrivers not available');
    }

    // ✅ Referral earnings logic unchanged
    const rider = await Rider.findById(riderId);

    if (rider) {
      if (referralEarning && referralBalance > 0) {
        rider.referralEarning.currentBalance -= referralBalance;
        if (rider.referralEarning.currentBalance < 0)
          rider.referralEarning.currentBalance = 0;
        await rider.save();
      }

      if (rider.referredBy) {
        const rule = await referralRules.findOne({});
        if (rule) {
          const { commission, MaxReferrals } = rule;
          const referrer = await Rider.findById(rider.referredBy);
          if (referrer) {
            let eligible = false;
            if (MaxReferrals === -1) eligible = true;
            else {
              const referralIndex = referrer.referrals.findIndex(
                (refId) => refId.toString() === riderId.toString()
              );
              eligible = referralIndex >= 0 && referralIndex < MaxReferrals;
            }

            if (eligible) {
              const adminCharges = selectedCategoryData.adminCommissionAdjusted || 0;
              const referralBonus = (adminCharges * commission) / 100;

              referrer.referralEarning.totalEarnings =
                (referrer.referralEarning.totalEarnings || 0) + referralBonus;
              referrer.referralEarning.currentBalance =
                (referrer.referralEarning.currentBalance || 0) + referralBonus;

              await referrer.save();
            }
          }
        }
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

// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>           Driver                >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

// Get driver info
router.get("/driver/info", driverAuthMiddleware, async (req, res) => {
  try {
    const { driverId } = req.driver;

    const driver = await Driver.findById(driverId);

    if (!driver) {
      return res.status(404).json({ message: "Driver not found" });
    }

    res.json({ success:true , data: driver });
  } catch (error) {
    console.error("Get driver info error:", error);
    res.status(500).json({ success:false,message: "Server error", error });
  }
});

// Confirm ride by driver
router.post("/driver/confirm", driverAuthMiddleware, async (req, res) => {
  try {
    const { rideId } = req.body;
    const driverId = req.driver?.driverId;
    const driverMobile = req.driver?.mobile;

    console.log('🚗 Driver confirming ride:', driverId, 'for ride:', rideId);

    const driverInfo = await Driver.findById(driverId);

    console.log(driverInfo)
    const driverName = driverInfo.personalInformation?.fullName

    if (!rideId) {
      return res.status(400).json({ message: "Ride ID is required" });
    }

    // Find and update the ride only if status is not CONFIRMED
    const updatedRide = await Ride.findOneAndUpdate(
      { _id: rideId, status: { $ne: "CONFIRMED" } }, // condition: status != CONFIRMED
      {
        status: "CONFIRMED",
        driverId: driverId,
        driverInfo: {
          driverName,
          driverMobile
        }
      },
      { new: true }
    );

    if (!updatedRide) {
      return res.status(400).json({ message: "Ride is already confirmed or not found" });
    }

    console.log('✅ Ride confirmed by driver:', driverId, 'for ride:', rideId);

    // Emit socket event to remove ride from all drivers
    const io = req.app.get('io');
    if (io) {
      io.to('drivers').emit('ride-assigned', {
        rideId: rideId,
        driverId: driverId
      });
      console.log('🚗 Ride assigned event emitted:', rideId);
    }

    res.json({
      message: "Ride confirmed successfully",
      ride: updatedRide,
    });
  } catch (error) {
    console.error("Error confirming ride:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.post("/driver/ride/id", driverAuthMiddleware, async (req, res) => {
  try {
    const { rideId } = req.body;

    if (!rideId) {
      return res.status(400).json({ message: "ride ID is required" });
    }

    const ride = await Ride.findById(rideId);

    if (!ride) {
      return res.status(404).json({ message: "ride not found" });
    }

    res.json({ success:true, data:ride });
  } catch (error) {
    console.error("Error fetching booking:", error);
    res.status(500).json({ success:false,message: "Server error", error: error.message });
  }
});

router.get("/rides/confirmed", driverAuthMiddleware, async (req, res) => {
  try {
    const driverId = req.driver?.driverId;

    if (!driverId) {
      return res.status(400).json({ message: "Driver ID is missing" });
    }

    // Find all rides for this driver that are CONFIRMED
    const confirmedRides = await Ride.find({
      driverId,
      status: "CONFIRMED"
    }).sort({ createdAt: -1 }); // latest first (optional)

    const count = confirmedRides.length;

    if (count === 0) {
      return res.status(200).json({ message: "No confirmed rides found" });
    }

    res.json({
      success: true,
      count,
      data: confirmedRides
    });
  } catch (error) {
    console.error("Error fetching confirmed rides:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
});

router.get("/rides/ongoing", driverAuthMiddleware, async (req, res) => {
  try {
    const driverId = req.driver?.driverId;

    if (!driverId) {
      return res.status(400).json({ message: "Driver ID is missing" });
    }

    // Find all rides for this driver that are CONFIRMED
    const confirmedRides = await Ride.find({
      driverId,
      status: "ONGOING"
    }).sort({ createdAt: -1 }); // latest first (optional)

    const count = confirmedRides.length;

    if (count === 0) {
      return res.status(200).json({ message: "No ongoing rides found" });
    }

    res.json({
      success: true,
      count,
      data: confirmedRides
    });
  } catch (error) {
    console.error("Error fetching confirmed rides:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
});

router.get("/rides/completed", driverAuthMiddleware, async (req, res) => {
  try {
    const driverId = req.driver?.driverId;

    if (!driverId) {
      return res.status(400).json({ message: "Driver ID is missing" });
    }

    // Find all rides for this driver that are CONFIRMED
    const confirmedRides = await Ride.find({
      driverId,
      status: "COMPLETED"
    }).sort({ createdAt: -1 }); // latest first (optional)

    const count = confirmedRides.length;

    if (count === 0) {
      return res.status(200).json({ message: "No completed rides found" });
    }

    res.json({
      success: true,
      count,
      data: confirmedRides
    });
  } catch (error) {
    console.error("Error fetching confirmed rides:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
});

router.get("/rides/cancelled", driverAuthMiddleware, async (req, res) => {
  try {
    const driverId = req.driver?.driverId;

    if (!driverId) {
      return res.status(400).json({ message: "Driver ID is missing" });
    }

    // Find all rides for this driver that are CONFIRMED
    const confirmedRides = await Ride.find({
      driverId,
      status: "CANCELLED"
    }).sort({ createdAt: -1 }); // latest first (optional)

    const count = confirmedRides.length;

    if (count === 0) {
      return res.status(200).json({ message: "No cancelled rides found" });
    }

    res.json({
      success: true,
      count,
      data: confirmedRides
    });
  } catch (error) {
    console.error("Error fetching confirmed rides:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
});
module.exports = router;