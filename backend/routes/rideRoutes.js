const express = require("express");
const Ride = require('../models/Ride'); // Ensure this path is correct
const authMiddleware = require('../middleware/authMiddleware'); // Ensure this path is correct
const router = express.Router();
const Rider = require("../models/Rider");
const Driver = require("../DriverModel/DriverModel");
const axios = require("axios");
const referralRules = require("../models/ReferralRule");
const driverAuthMiddleware = require("../middleware/driverAuthMiddleware");
const driverRideCost = require("../models/DriverRideCost");
const cabRideCost = require("../models/CabRideCost");
const parcelRideCost = require("../models/ParcelRideCost");
const { getDriverRideIncludedData, getCabRideIncludedData, getParcelRideIncludedData } = require("../Services/rideCostService")

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
      subSubcategoryId,
      categoryName,
      subcategoryName,
      subSubcategoryName,
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

    const riderData = await Rider.findOne({ mobile })
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
        subSubcategoryId,
        categoryName,
        subcategoryName,
        subSubcategoryName,
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

    // Emit socket event to drivers with EXTENDED rides only
    const io = req.app.get('io');
    const onlineDrivers = req.app.get('onlineDrivers');

    if (io && onlineDrivers) {
      const rideData = {
        rideId: newRide._id,
        categoryName: categoryName,
        subcategoryName: subcategoryName,
        subSubcategoryName: subSubcategoryName,
        carType: carType,
        transmissionType: transmissionType,
        selectedUsage: selectedUsage,
        fromLocation: fromLocationData,
        toLocation: toLocationData,
        selectedDate: selectedDate,
        selectedTime: selectedTime,
        totalPayable: totalPayable,
        status: 'BOOKED'
      };

      // Get drivers with rideStatus 'WAITING' (available drivers)
      const waitingDrivers = await Driver.find({ rideStatus: 'WAITING' }).select('_id');
      const waitingDriverIds = waitingDrivers.map(driver => driver._id.toString());
      console.log(`✅ Found ${waitingDriverIds.length} drivers with WAITING status`);

      // Send to online drivers who have WAITING rideStatus
      let sentCount = 0;
      Object.entries(onlineDrivers).forEach(([driverId, driverSocketData]) => {
        // Only send to drivers with WAITING status
        if (waitingDriverIds.includes(driverId)) {
          io.to(driverSocketData.socketId).emit('new-ride', rideData);
          sentCount++;
        }
      });

      console.log(`🚗 New ride ${newRide._id} sent to ${sentCount} available drivers (WAITING status)`);
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

    console.log(updatedBooking)

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

// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>             Driver                >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

//fetch detail ride data 
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

    res.json({ success: true, data: ride });
  } catch (error) {
    console.error("Error fetching booking:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});

// Get driver info
router.get("/driver/info", driverAuthMiddleware, async (req, res) => {
  try {
    const { driverId } = req.driver;

    const driver = await Driver.findById(driverId);

    if (!driver) {
      return res.status(404).json({ message: "Driver not found" });
    }

    res.json({ success: true, data: driver });
  } catch (error) {
    console.error("Get driver info error:", error);
    res.status(500).json({ success: false, message: "Server error", error });
  }
});

// fetch confirm rides by driver
router.get("/driver/rides/confirmed", driverAuthMiddleware, async (req, res) => {
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

// fetch ongoing rides by driver
router.get("/driver/rides/ongoing", driverAuthMiddleware, async (req, res) => {
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

// fetch completed rides by driver
router.get("/driver/rides/completed", driverAuthMiddleware, async (req, res) => {
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

// fetch cancelled rides by driver
router.get("/driver/rides/cancelled", driverAuthMiddleware, async (req, res) => {
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

// update status to confirm and assign driver ride by driver
router.post("/driver/confirm", driverAuthMiddleware, async (req, res) => {
  try {
    const { rideId } = req.body;
    const driverId = req.driver?.driverId;
    const driverMobile = req.driver?.mobile;

    console.log('🚗 Driver confirming ride:', driverId, 'for ride:', rideId);

    if (!rideId) {
      return res.status(400).json({ message: "Ride ID is required" });
    }

    const driverInfo = await Driver.findById(driverId);
    if (!driverInfo) {
      return res.status(404).json({ message: "Driver not found" });
    }

    const driverName = driverInfo.personalInformation?.fullName

    console.log('🚗 Driver name:', driverName)

    // Find and update the ride only if status is BOOKED
    const updatedRide = await Ride.findOneAndUpdate(
      { _id: rideId, status: "BOOKED" }, // only if ride is BOOKED
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

    // Update driver rideStatus to CONFIRMED
    await Driver.findByIdAndUpdate(driverId, { rideStatus: "CONFIRMED" });

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

// update status to ongoing 
router.post("/driver/ongoing", driverAuthMiddleware, async (req, res) => {
  try {
    const { rideId } = req.body;
    const driverId = req.driver?.driverId;
    const driverMobile = req.driver?.mobile;

    console.log('🚗 Driver confirming ride:', driverId, 'for ride:', rideId);

    if (!rideId) {
      return res.status(400).json({ message: "Ride ID is required" });
    }

    const driverInfo = await Driver.findById(driverId);
    if (!driverInfo) {
      return res.status(404).json({ message: "Driver not found" });
    }

    const driverName = driverInfo.personalInformation?.fullName

    // Find and update the ride only if status is CONFIRMED
    const updatedRide = await Ride.findOneAndUpdate(
      { _id: rideId, status: "CONFIRMED" }, // only if ride is CONFIRMED
      {
        status: "ONGOING",
        driverId: driverId,
        driverInfo: {
          driverName,
          driverMobile
        }
      },
      { new: true }
    );

    if (!updatedRide) {
      return res.status(400).json({ message: "Ride is already ongoing or not found" });
    }

    // Update driver rideStatus to ONGOING
    await Driver.findByIdAndUpdate(driverId, { rideStatus: "ONGOING" });

    console.log('✅ Ride ongoing by driver:', driverId, 'for ride:', rideId);

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
      message: "Ride ongoing successfully",
      success: true,
      data: updatedRide
    });
  } catch (error) {
    console.error("Error confirming ride:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// update status to cancel
router.post("/driver/cancel", driverAuthMiddleware, async (req, res) => {
  try {
    const { rideId } = req.body;
    const driverId = req.driver?.driverId;
    const driverMobile = req.driver?.mobile;

    console.log('🚗 Driver cancelling ride:', driverId, 'for ride:', rideId);

    if (!rideId) {
      return res.status(400).json({ message: "Ride ID is required" });
    }

    const driverInfo = await Driver.findById(driverId);
    if (!driverInfo) {
      return res.status(404).json({ message: "Driver not found" });
    }

    const driverName = driverInfo.personalInformation?.fullName

    // Find and update the ride only if status is BOOKED or CONFIRMED
    const updatedRide = await Ride.findOneAndUpdate(
      { _id: rideId, status: { $in: ["BOOKED", "CONFIRMED"] } }, // ✅ only if ride is BOOKED or CONFIRMED
      {
        status: "CANCELLED",
        driverId: driverId,
        driverInfo: {
          driverName,
          driverMobile
        }
      },
      { new: true }
    );


    if (!updatedRide) {
      return res.status(400).json({ message: "Ride is already cancelled or not found" });
    }

    // Update driver rideStatus to WAITING
    await Driver.findByIdAndUpdate(driverId, { rideStatus: "WAITING" });

    console.log('✅ Ride cancelled by driver:', driverId, 'for ride:', rideId);

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
      message: "Ride cancelled successfully",
      ride: updatedRide,
    });
  } catch (error) {
    console.error("Error cancelling ride:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// update status to extend 
router.post("/driver/extend", driverAuthMiddleware, async (req, res) => {
  try {
    const { rideId } = req.body;
    const driverId = req.driver?.driverId;
    const driverMobile = req.driver?.mobile;

    console.log('🚗 Driver extending ride:', driverId, 'for ride:', rideId);

    if (!rideId) {
      return res.status(400).json({ message: "Ride ID is required" });
    }

    const driverInfo = await Driver.findById(driverId);
    if (!driverInfo) {
      return res.status(404).json({ message: "Driver not found" });
    }

    const driverName = driverInfo.personalInformation?.fullName

    // Find and update the ride only if status is ONGOING
    const updatedRide = await Ride.findOneAndUpdate(
      { _id: rideId, status: "ONGOING" }, // only if ride is ONGOING
      {
        status: "EXTENDED",
        driverId: driverId,
        driverInfo: {
          driverName,
          driverMobile
        }
      },
      { new: true }
    );

    if (!updatedRide) {
      return res.status(400).json({ message: "Ride is already extended or not found" });
    }

    // Update driver rideStatus to EXTENDED
    await Driver.findByIdAndUpdate(driverId, { rideStatus: "EXTENDED" });

    console.log('✅ Ride extended by driver:', driverId, 'for ride:', rideId);

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
      message: "Ride extended successfully",
      ride: updatedRide,
    });
  } catch (error) {
    console.error("Error extending ride:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// update status to complete 
router.post("/driver/complete", driverAuthMiddleware, async (req, res) => {
  try {
    const { rideId } = req.body;
    const driverId = req.driver?.driverId;
    const driverMobile = req.driver?.mobile;

    console.log('🚗 Driver completing ride:', driverId, 'for ride:', rideId);

    if (!rideId) {
      return res.status(400).json({ message: "Ride ID is required" });
    }

    const driverInfo = await Driver.findById(driverId);
    if (!driverInfo) {
      return res.status(404).json({ message: "Driver not found" });
    }

    const driverName = driverInfo.personalInformation?.fullName

    // Find and update the ride only if status is ONGOING or EXTENDED
    const updatedRide = await Ride.findOneAndUpdate(
      { _id: rideId, status: { $in: ["ONGOING", "EXTENDED"] } }, // only if ride is ONGOING or EXTENDED
      {
        status: "COMPLETED",
        driverId: driverId,
        driverInfo: {
          driverName,
          driverMobile
        }
      },
      { new: true }
    );

    if (!updatedRide) {
      return res.status(400).json({ message: "Ride is already completed or not found" });
    }

    // Update driver rideStatus to WAITING
    await Driver.findByIdAndUpdate(driverId, { rideStatus: "WAITING" });

    console.log('✅ Ride completed by driver:', driverId, 'for ride:', rideId);

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
      message: "Ride completed successfully",
      ride: updatedRide,
    });
  } catch (error) {
    console.error("Error completing ride:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// count extra charges
router.post("/count-extra-charges",driverAuthMiddleware, async (req, res) => {
  try {
    const { rideId, extraMinutes, extraKm } = req.body;
    const driverId = req.driver?.driverId;

    if (!rideId || extraMinutes === undefined || extraKm === undefined) {
      return res.status(400).json({
        success: false,
        message: "rideId, extraMinutes, and extraKm are required"
      });
    }

    const ride = await Ride.findById(rideId);
    if (!ride) {
      return res.status(404).json({
        success: false,
        message: "Ride not found"
      });
    }

    const { categoryId, categoryName, subcategoryId, subcategoryName } = ride.rideInfo;
    // let totalPayable = ride.totalPayable;

    // Determine extra charges based on category
    let extraChargePerKm = 0;
    let extraChargePerMinute = 0;

    const catNameLower = categoryName.toLowerCase();

    if (catNameLower === "driver") {
      const driverData = await getDriverRideIncludedData(categoryId, subcategoryId, ride.rideInfo.subSubcategoryId);
      extraChargePerKm = driverData.extraChargePerKm;
      extraChargePerMinute = driverData.extraChargePerMinute;
      adminChargesInPercentage = driverData.extraChargesFromAdmin
      gstChargesInPercentage = driverData.gst
    } else if (catNameLower === "cab") {
      const cabData = await getCabRideIncludedData(categoryId, subcategoryId, ride.rideInfo.subSubcategoryId);
      extraChargePerKm = cabData.extraChargePerKm;
      extraChargePerMinute = cabData.extraChargePerMinute;
      adminChargesInPercentage = driverData.extraChargesFromAdmin
      gstChargesInPercentage = driverData.gst
    } else if (catNameLower === "parcel") {
      const parcelData = await getParcelRideIncludedData(categoryId, subcategoryId);
      extraChargePerKm = parcelData.extraChargePerKm;
      extraChargePerMinute = parcelData.extraChargePerMinute;
      adminChargesInPercentage = driverData.extraChargesFromAdmin
      gstChargesInPercentage = driverData.gst
    }

    //included calculation

    let driverCharges = ride.rideInfo?.driverCharges;
    let adminCharges = ride.rideInfo?.adminCharges;
    let insuranceCharges = ride.rideInfo?.insuranceCharges;
    let cancellationCharges = ride.rideInfo?.cancellationCharges;
    let discount = ride.rideInfo?.discount;
    let subtotal = ride.rideInfo?.subtotal;
    let gstCharges = ride.rideInfo?.gstCharges;
    let totalPayable = ride.totalPayable;

    // extra charges 

    // Calculate extra charges
    const extraKmCharges = extraKm * extraChargePerKm;
    const extraMinutesCharges = extraMinutes * extraChargePerMinute;

    const extraCharges = extraKmCharges + extraMinutesCharges;

    driverCharges += extraCharges;

    let adminChargesOnExtraCharges = Math.ceil(extraCharges * adminChargesInPercentage / 100)
    adminCharges += adminChargesOnExtraCharges;

    let subTotalOfExtra = extraCharges + adminChargesOnExtraCharges
    subtotal += subTotalOfExtra;

    let gstOnExtraCharges = Math.ceil(subTotalOfExtra * gstChargesInPercentage / 100)
    gstCharges += gstOnExtraCharges;

    let totalPayableOfExtra = subTotalOfExtra + gstOnExtraCharges
    totalPayable += totalPayableOfExtra;



    res.json({
      success: true,
      data: {
        rideId,
        categoryId,
        categoryName,
        subcategoryId,
        subcategoryName,

        extraChargePerKm,
        extraChargePerMinute,

        extraKmCharges,
        extraMinutesCharges,

        includeInsurance: ride.rideInfo.includeInsurance,

        driverCharges,
        // extraCharges,

        adminCharges,
        // adminChargesOnExtraCharges,

        subtotal,
        // subTotalOfExtra,

        insuranceCharges,
        cancellationCharges,

        gstCharges,
        // gstOnExtraCharges,

        discount,

        totalPayable,
        // totalPayableOfExtra,

      }
    });

  } catch (error) {
    console.error("Error counting extra charges:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
});

module.exports = router;