const express = require("express");
const Ride = require('../models/Ride'); // Ensure this path is correct
const authMiddleware = require('../middleware/authMiddleware'); // Ensure this path is correct
const router = express.Router();
const Rider = require("../models/Rider");
const Driver = require("../DriverModel/DriverModel");
const { Wallet } = require("../models/Wallet");
const Payment = require("../models/Payment");
const axios = require("axios");
const referralRules = require("../models/ReferralRule");
const driverAuthMiddleware = require("../middleware/driverAuthMiddleware");
const DriverRideCost = require("../models/DriverRideCost");
const CabRideCost = require("../models/CabRideCost");
const ParcelRideCost = require("../models/ParcelRideCost");
const driverRideCost = DriverRideCost;
const cabRideCost = CabRideCost;
const parcelRideCost = ParcelRideCost;
const { getDriverRideIncludedData, getCabRideIncludedData, getParcelRideIncludedData } = require("../Services/rideCostService")
const { calculateDriverRideCharges, calculateCabRideCharges } = require("../Services/reAssignRideCharges");

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
      selectedCategoryId,
      selectedDate,
      selectedTime,
      selectedUsage,
      durationValue,
      selectedDates,
      transmissionType,
      totalAmount,
      paymentType,
      totalPayable,
      referralEarning,
      referralBalance,
      senderDetails,     // ✅ new
      receiverDetails,   // ✅ new
    } = req.body;

    console.log('selected category id', selectedCategoryId)

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

    // Format selectedDate to "dd mm yy"
    let formattedSelectedDate = selectedDate;
    if (selectedDate) {
      const dateObj = new Date(selectedDate);
      const day = String(dateObj.getDate()).padStart(2, '0');
      const month = String(dateObj.getMonth() + 1).padStart(2, '0'); // months are 0-indexed
      const year = String(dateObj.getFullYear()).slice(-2); // last 2 digits of year
      formattedSelectedDate = `${day} ${month} ${year}`;
    }

    // Convert selectedDate to Date object before saving
    let rideDate = selectedDate ? new Date(selectedDate) : null;
    console.log('📅 Ride date:', rideDate);

    // In rideInfo
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
        senderDetails,
        receiverDetails,
        includeInsurance,
        notes,
        selectedCategoryId,
        selectedCategory,
        selectedDate: rideDate, // ✅ store as Date
        selectedTime,
        selectedUsage,
        transmissionType,
        NoOfDays: durationValue,
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
    const riderId = req.rider?.riderId;

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

    // Extract required data from updatedBooking
    const { categoryName, categoryId, subcategoryId, selectedDate, selectedTime } = updatedBooking.rideInfo;
    const bookingDriverId = updatedBooking.driverId;

    // Check category and fetch cancellation details from appropriate model
    const categoryNameLower = categoryName.toLowerCase();
    let cancellationDetails = null;

    try {
      if (categoryNameLower === 'driver') {
        cancellationDetails = await driverRideCost.findOne({
          category: categoryId,
          subcategory: subcategoryId
        }).select('cancellationFee cancellationBufferTime');
      } else if (categoryNameLower === 'cab') {
        cancellationDetails = await cabRideCost.findOne({
          category: categoryId,
          subcategory: subcategoryId
        }).select('cancellationFee cancellationBufferTime');
      } else if (categoryNameLower === 'parcel') {
        cancellationDetails = await parcelRideCost.findOne({
          category: categoryId,
          subcategory: subcategoryId
        }).select('cancellationFee cancellationBufferTime');
      }

      const cancellationFee = cancellationDetails?.cancellationFee || 0;
      const cancellationBufferTime = cancellationDetails?.cancellationBufferTime || 0;

      // Function to handle cancellation charges
      const applyCancellationCharges = async (description) => {
        const wallet = await Wallet.findOne({ riderId: riderId.toString() });

        if (wallet) {
          const currentBalance = wallet.balance;

          if (currentBalance >= cancellationFee) {
            // Create Payment record for full deduction
            const payment = new Payment({
              riderId: riderId.toString(),
              orderId: `cancel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              razorpayOrderId: `cancel_${Date.now()}`,
              amount: cancellationFee,
              status: 'paid',
              type: 'spend',
              description: description,
              paidAt: new Date()
            });
            await payment.save();

            // Deduct full cancellation fee from wallet
            wallet.balance -= cancellationFee;
            wallet.totalSpent += cancellationFee;
            wallet.lastTransactionAt = new Date();
            await wallet.save();

            console.log(`Deducted full cancellation fee: ${cancellationFee} from wallet`);
          } else {
            // Create Payment record for partial deduction
            if (currentBalance > 0) {
              const payment = new Payment({
                riderId: riderId.toString(),
                orderId: `cancel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                razorpayOrderId: `cancel_${Date.now()}`,
                amount: currentBalance,
                status: 'paid',
                type: 'spend',
                description: `${description} (Partial payment)`,
                paidAt: new Date()
              });
              await payment.save();
            }

            // Partial deduction from wallet, store remaining in rider model
            const remainingCharges = cancellationFee - currentBalance;

            // Deduct available balance from wallet
            wallet.totalSpent += currentBalance;
            wallet.balance = 0;
            wallet.lastTransactionAt = new Date();
            await wallet.save();

            // Store remaining charges in rider model
            const rider = await Rider.findById(riderId);
            if (rider) {
              rider.cancellationCharges += remainingCharges;
              await rider.save();
            }

            console.log(`Deducted ${currentBalance} from wallet, stored ${remainingCharges} as pending charges`);
          }
        } else {
          // No wallet found, store full amount in rider model
          const rider = await Rider.findById(riderId);
          if (rider) {
            rider.cancellationCharges += cancellationFee;
            await rider.save();
          }

          console.log(`No wallet found, stored ${cancellationFee} as pending charges`);
        }
      };

      // Check conditions for applying cancellation charges
      let shouldApplyCharges = false;
      let chargeReason = '';

      if (cancellationFee > 0) {
        // Check if driver has reached location
        if (bookingDriverId) {
          const driver = await Driver.findById(bookingDriverId);
          if (driver && driver.rideStatus === 'REACHED') {
            shouldApplyCharges = true;
            chargeReason = 'Cancellation fee - Driver already reached pickup location';
          }
        }

        // Check if cancellation is outside buffer time window
        if (!shouldApplyCharges && cancellationBufferTime > 0) {
          const rideDateTime = new Date(selectedDate);
          const [hours, minutes] = selectedTime.split(':');
          rideDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

          const bufferEndTime = new Date(rideDateTime.getTime() - (cancellationBufferTime * 60 * 1000));
          const currentTime = new Date();

          if (currentTime > bufferEndTime) {
            shouldApplyCharges = true;
            chargeReason = `Cancellation fee - Late cancellation (${cancellationBufferTime} min window exceeded)`;
          }
        }

        // Apply charges if conditions are met
        if (shouldApplyCharges) {
          await applyCancellationCharges(chargeReason);
          console.log(`Cancellation charges applied: ${chargeReason}`);
        }
      }

      console.log('Cancellation Details:', {
        categoryName,
        categoryId,
        subcategoryId,
        driverId: bookingDriverId,
        cancellationFee,
        cancellationBufferTime,
        shouldApplyCharges,
        chargeReason
      });

    } catch (modelError) {
      console.error('Error processing cancellation:', modelError);
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

    // Find all rides for this driver that are CONFIRMED or REACHED
    const confirmedRides = await Ride.find({
      driverId,
      status: { $in: ["CONFIRMED", "REACHED"] }
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

// fetch extended rides by driver
router.get("/driver/rides/extended", driverAuthMiddleware, async (req, res) => {
  try {
    const driverId = req.driver?.driverId;

    if (!driverId) {
      return res.status(400).json({ message: "Driver ID is missing" });
    }

    // Find all rides for this driver that are CONFIRMED
    const confirmedRides = await Ride.find({
      driverId,
      status: "EXTENDED"
    }).sort({ createdAt: -1 }); // latest first (optional)

    console.log('🚗 Extended rides:', confirmedRides)

    const count = confirmedRides.length;

    if (count === 0) {
      return res.status(200).json({ message: "No extended rides found" });
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

// update driver ride status to reached
router.post("/driver/reached", driverAuthMiddleware, async (req, res) => {
  try {
    const driverId = req.driver?.driverId;
    const { rideId } = req.body;

    // ✅ Get current time in HH:MM:SS format
    const driverReachTime = new Date().toLocaleTimeString("en-GB", {
      timeZone: "Asia/Kolkata",
    });

    // ✅ Update the ride only if status is BOOKED
    const updatedRide = await Ride.findOneAndUpdate(
      { _id: rideId, status: "CONFIRMED" },
      {
        "rideInfo.driverReachTime": driverReachTime,
        status: "REACHED",
        driverId: driverId,
      },
      { new: true }
    );

    if (!updatedRide) {
      return res.status(404).json({
        success: false,
        message: "Ride not found or not in BOOKED status",
      });
    }

    // ✅ Update driver status only if it was CONFIRMED
    const driver = await Driver.findOneAndUpdate(
      { _id: driverId, rideStatus: "CONFIRMED" },
      { rideStatus: "REACHED" },
      { new: true }
    );

    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Driver not found or ride status is not CONFIRMED",
      });
    }

    res.json({
      success: true,
      message: "Ride status updated to REACHED successfully",
      rideStatus: driver.rideStatus,
      driverReachTime: updatedRide.rideInfo.driverReachTime,
    });
  } catch (error) {
    console.error("Update ride status error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update ride status",
      error: error.message,
    });
  }
});

// update status to ongoing 
router.post("/driver/ongoing", driverAuthMiddleware, async (req, res) => {
  try {
    const { rideId } = req.body;
    const driverId = req.driver?.driverId;
    const driverMobile = req.driver?.mobile;

    console.log('🚗 Driver confirming ride:', driverId, 'for ride:', rideId);

    // ✅ Get current time in HH:MM:SS format
    const rideStartTime = new Date().toLocaleTimeString("en-GB", {
      timeZone: "Asia/Kolkata",
    });

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
      { _id: rideId, status: "REACHED" }, // only if ride is CONFIRMED
      {
        "rideInfo.ridseStartTime": ridseStartTime,
        status: "ONGOING",
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
      ridseStartTime: updatedRide.rideInfo?.ridseStartTime,
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
    const { rideId, NoOfDays, selectedDates } = req.body;
    const driverId = req.driver?.driverId;
    const driverMobile = req.driver?.mobile;

    console.log('🚗 Driver cancelling ride:', driverId, 'for ride:', rideId);
    console.log('📅 Cancellation details:', { NoOfDays, selectedDates });

    if (!rideId) {
      return res.status(400).json({ message: "Ride ID is required" });
    }

    const driverInfo = await Driver.findById(driverId);
    if (!driverInfo) {
      return res.status(404).json({ message: "Driver not found" });
    }

    const currentRide = await Ride.findById(rideId);
    if (!currentRide) {
      return res.status(404).json({ message: "Ride not found" });
    }

    console.log('📊 Current ride data:', currentRide.rideInfo);

    // Check if this is a partial cancellation (multi-day ride)
    if (NoOfDays && selectedDates && selectedDates.length > 0) {
      console.log('🔄 Processing partial cancellation...');

      // Calculate remaining days
      const originalDates = currentRide.rideInfo.selectedDates || [];
      const originalNoOfDays = parseInt(currentRide.rideInfo.NoOfDays) || 1;
      const cancelDays = parseInt(NoOfDays);

      const remainingDates = originalDates.filter(date => !selectedDates.includes(date));
      const remainingNoOfDays = originalNoOfDays - cancelDays;

      console.log('📈 Calculation:', {
        originalDates, originalNoOfDays, cancelDays, remainingDates, remainingNoOfDays
      });

      if (remainingNoOfDays <= 0 || remainingDates.length === 0) {
        // Full cancellation - use existing logic
        console.log('🚫 Full cancellation detected');
      } else {
        // Partial cancellation - update current ride with remaining days
        console.log('✂️ Partial cancellation - updating current ride');

        try {
          // Calculate new charges for remaining days
          let newCharges;
          const { categoryName, categoryId, subcategoryName, subcategoryId, subSubcategoryId, selectedCategory, selectedCategoryId } = currentRide.rideInfo;

          if (categoryName.toLowerCase() === 'driver') {
            newCharges = await calculateDriverRideCharges({
              riderId: currentRide.riderId,
              categoryId,
              selectedDate: currentRide.rideInfo.selectedDate,
              selectedTime: currentRide.rideInfo.selectedTime,
              includeInsurance: currentRide.rideInfo.includeInsurance,
              selectedUsage: currentRide.rideInfo.selectedUsage,
              subcategoryId,
              subSubcategoryId,
              durationType: 'day',
              NoOfDays: remainingNoOfDays,
              selectedCategoryId
            });
          } else if (categoryName.toLowerCase() === 'cab') {
            newCharges = await calculateCabRideCharges({
              categoryId,
              selectedDate: currentRide.rideInfo.selectedDate,
              selectedTime: currentRide.rideInfo.selectedTime,
              includeInsurance: currentRide.rideInfo.includeInsurance,
              selectedUsage: currentRide.rideInfo.selectedUsage,
              subcategoryId,
              subSubcategoryId,
              durationType: 'day',
              NoOfDays: remainingNoOfDays,
              selectedCategoryId
            });
          }

          console.log('💰 New charges calculated:', newCharges);

          // Update current ride with remaining days and new charges
          const updateFields = {
            'rideInfo.driverCharges': newCharges.driverCharges,
            'rideInfo.adminCharges': newCharges.adminCommissionAdjusted,
            'rideInfo.subtotal': newCharges.subtotal,
            'rideInfo.gstCharges': newCharges.gstCharges,
            'rideInfo.insuranceCharges': newCharges.insuranceCharges,
            'rideInfo.cancellationCharges': newCharges.cancellationCharges || 0,
            totalPayable: newCharges.totalPayable
          };

          // Only include NoOfDays and selectedDates for weekly/monthly
          const subCatLower = subcategoryName.toLowerCase();
          if (subCatLower.includes('weekly') || subCatLower.includes('monthly')) {
            updateFields['rideInfo.NoOfDays'] = remainingNoOfDays.toString();
            updateFields['rideInfo.selectedDates'] = remainingDates;
          }

          const updatedCurrentRide = await Ride.findByIdAndUpdate(
            rideId,
            updateFields,
            { new: true }
          );

          console.log('✅ Current ride updated with remaining days');

          // Calculate charges for cancelled days
          let cancelledChargesForNewRide;
          if (categoryName.toLowerCase() === 'driver') {
            cancelledChargesForNewRide = await calculateDriverRideCharges({
              riderId: currentRide.riderId,
              categoryId,
              selectedDate: currentRide.rideInfo.selectedDate,
              selectedTime: currentRide.rideInfo.selectedTime,
              includeInsurance: currentRide.rideInfo.includeInsurance,
              selectedUsage: currentRide.rideInfo.selectedUsage,
              subcategoryId,
              subSubcategoryId,
              durationType: 'day',
              NoOfDays: cancelDays,
              selectedCategoryId
            });
          } else if (categoryName.toLowerCase() === 'cab') {
            cancelledChargesForNewRide = await calculateCabRideCharges({
              categoryId,
              selectedDate: currentRide.rideInfo.selectedDate,
              selectedTime: currentRide.rideInfo.selectedTime,
              includeInsurance: currentRide.rideInfo.includeInsurance,
              selectedUsage: currentRide.rideInfo.selectedUsage,
              subcategoryId,
              subSubcategoryId,
              durationType: 'day',
              NoOfDays: cancelDays,
              selectedCategoryId
            });
          }

          console.log('💰 Cancelled charges calculated:', cancelledChargesForNewRide);

          // Create new ride for cancelled days using same structure as /book route
          const newCancelledRide = new Ride({
            riderId: currentRide.riderId,
            riderInfo: {
              riderName: currentRide.riderInfo.riderName,
              riderMobile: currentRide.riderInfo.riderMobile
            },
            rideInfo: {
              categoryId: currentRide.rideInfo.categoryId,
              subcategoryId: currentRide.rideInfo.subcategoryId,
              subSubcategoryId: currentRide.rideInfo.subSubcategoryId,
              categoryName: currentRide.rideInfo.categoryName,
              subcategoryName: currentRide.rideInfo.subcategoryName,
              subSubcategoryName: currentRide.rideInfo.subSubcategoryName,
              carType: currentRide.rideInfo.carType,
              fromLocation: currentRide.rideInfo.fromLocation,
              toLocation: currentRide.rideInfo.toLocation,
              senderDetails: currentRide.rideInfo.senderDetails,
              receiverDetails: currentRide.rideInfo.receiverDetails,
              includeInsurance: currentRide.rideInfo.includeInsurance,
              notes: currentRide.rideInfo.notes,
              selectedCategoryId: currentRide.rideInfo.selectedCategoryId,
              selectedCategory: currentRide.rideInfo.selectedCategory,
              selectedDate: currentRide.rideInfo.selectedDate,
              selectedTime: currentRide.rideInfo.selectedTime,
              selectedUsage: currentRide.rideInfo.selectedUsage,
              transmissionType: currentRide.rideInfo.transmissionType,
              NoOfDays: cancelDays.toString(),
              selectedDates: selectedDates,
              driverCharges: cancelledChargesForNewRide.driverCharges,
              insuranceCharges: cancelledChargesForNewRide.insuranceCharges,
              cancellationCharges: cancelledChargesForNewRide.cancellationCharges || 0,
              discount: cancelledChargesForNewRide.discountApplied || 0,
              gstCharges: cancelledChargesForNewRide.gstCharges,
              subtotal: cancelledChargesForNewRide.subtotal,
              adminCharges: cancelledChargesForNewRide.adminCommissionAdjusted
            },
            referralEarning: currentRide.referralEarning || false,
            referralBalance: currentRide.referralBalance || 0,
            totalPayable: cancelledChargesForNewRide.totalPayable,
            paymentType: currentRide.paymentType,
            status: "BOOKED"
          });

          await newCancelledRide.save();

          console.log('✅ New ride created for cancelled days:', newCancelledRide._id);

          // Update driver status to WAITING
          await Driver.findByIdAndUpdate(driverId, { rideStatus: "WAITING" });

          // Emit new-ride event for cancelled days (following /book route pattern)
          const io = req.app.get('io');
          const onlineDrivers = req.app.get('onlineDrivers');

          if (io && onlineDrivers) {
            const rideData = {
              rideId: newCancelledRide._id,
              categoryName: newCancelledRide.rideInfo.categoryName,
              subcategoryName: newCancelledRide.rideInfo.subcategoryName,
              subSubcategoryName: newCancelledRide.rideInfo.subSubcategoryName,
              carType: newCancelledRide.rideInfo.carType,
              transmissionType: newCancelledRide.rideInfo.transmissionType,
              selectedUsage: newCancelledRide.rideInfo.selectedUsage,
              fromLocation: newCancelledRide.rideInfo.fromLocation,
              toLocation: newCancelledRide.rideInfo.toLocation,
              selectedDate: newCancelledRide.rideInfo.selectedDate,
              selectedTime: newCancelledRide.rideInfo.selectedTime,
              totalPayable: newCancelledRide.totalPayable,
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

            console.log(`🚗 New ride ${newCancelledRide._id} sent to ${sentCount} available drivers (WAITING status)`);
          } else {
            console.log('❌ Socket.io or onlineDrivers not available');
          }

          return res.json({
            success: true,
            message: "Partial cancellation processed successfully",
            updatedRide: updatedCurrentRide,
            newRideForCancelledDays: newCancelledRide
          });

        } catch (chargeError) {
          console.error('Error calculating charges:', chargeError);
          return res.status(500).json({ message: "Error calculating charges for partial cancellation" });
        }
      }
    }

    // Full cancellation logic (existing code)
    console.log('🚫 Processing full cancellation...');

    const updatedRide = await Ride.findOneAndUpdate(
      { _id: rideId, status: { $in: ["BOOKED", "CONFIRMED"] } },
      {
        status: "BOOKED",
        $unset: { driverId: 1, driverInfo: 1 }
      },
      { new: true }
    );

    if (!updatedRide) {
      return res.status(400).json({ message: "Ride is already cancelled or not found" });
    }

    await Driver.findByIdAndUpdate(driverId, { rideStatus: "WAITING" });

    const io = req.app.get('io');
    if (io) {
      io.to('drivers').emit('new-ride', {
        rideId: updatedRide._id,
        categoryName: updatedRide.rideInfo.categoryName,
        subcategoryName: updatedRide.rideInfo.subcategoryName,
        subSubcategoryName: updatedRide.rideInfo.subSubcategoryName,
        carType: updatedRide.rideInfo.carType,
        transmissionType: updatedRide.rideInfo.transmissionType,
        selectedUsage: updatedRide.rideInfo.selectedUsage,
        fromLocation: updatedRide.rideInfo.fromLocation,
        toLocation: updatedRide.rideInfo.toLocation,
        selectedDate: updatedRide.rideInfo.selectedDate,
        selectedTime: updatedRide.rideInfo.selectedTime,
        totalPayable: updatedRide.totalPayable,
        status: 'BOOKED'
      });
    }

    res.json({
      success: true,
      message: "Ride cancelled successfully",
      ride: updatedRide
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
router.post("/count-extra-charges", driverAuthMiddleware, async (req, res) => {
  try {
    const { rideId, extraKm } = req.body;
    const driverId = req.driver?.driverId;

    if (!rideId) {
      return res.status(400).json({
        success: false,
        message: "rideId is required"
      });
    }

    const rideEndTime = new Date().toLocaleTimeString("en-GB", {
      timeZone: "Asia/Kolkata",
    });
    const ride = await Ride.findById(rideId);

    if (!ride) {
      return res.status(404).json({
        success: false,
        message: "Ride not found"
      });
    }

    const { categoryId, categoryName, subcategoryId, subcategoryName, ridseStartTime, selectedUsage, selectedCategoryId } = ride.rideInfo;

    // Determine extra charges based on category
    let extraChargePerKm = 0;
    let extraChargePerMinute = 0;
    let includedMinutes = 0;
    let adminChargesInPercentage = 0;
    let gstChargesInPercentage = 0;

    const catNameLower = categoryName.toLowerCase();
    const subcategoryNameLower = subcategoryName.toLowerCase();

    if (catNameLower === "driver") {
      const driverData = await getDriverRideIncludedData(categoryId, subcategoryId, ride.rideInfo.subSubcategoryId, selectedUsage, subcategoryNameLower, selectedCategoryId);
      includedMinutes = driverData.includedMinutes;
      extraChargePerKm = driverData.extraChargePerKm;
      extraChargePerMinute = driverData.extraChargePerMinute;
      adminChargesInPercentage = driverData.extraChargesFromAdmin;
      gstChargesInPercentage = driverData.gst;
    } else if (catNameLower === "cab") {
      const cabData = await getCabRideIncludedData(categoryId, subcategoryId, ride.rideInfo.subSubcategoryId, selectedUsage, subcategoryNameLower, selectedCategoryId);
      extraChargePerKm = cabData.extraChargePerKm;
      extraChargePerMinute = cabData.extraChargePerMinute;
      adminChargesInPercentage = cabData.extraChargesFromAdmin;
      gstChargesInPercentage = cabData.gst;
    } else if (catNameLower === "parcel") {
      const parcelData = await getParcelRideIncludedData(categoryId, subcategoryId, selectedUsage, subcategoryNameLower, selectedCategoryId);
      extraChargePerKm = parcelData.extraChargePerKm;
      extraChargePerMinute = parcelData.extraChargePerMinute;
      adminChargesInPercentage = parcelData.extraChargesFromAdmin;
      gstChargesInPercentage = parcelData.gst;
    }

    let driverCharges = ride.rideInfo?.driverCharges || 0;
    let adminCharges = ride.rideInfo?.adminCharges || 0;
    let insuranceCharges = ride.rideInfo?.insuranceCharges || 0;
    let cancellationCharges = ride.rideInfo?.cancellationCharges || 0;
    let discount = ride.rideInfo?.discount || 0;
    let subtotal = ride.rideInfo?.subtotal || 0;
    let gstCharges = ride.rideInfo?.gstCharges || 0;
    let totalPayable = ride.totalPayable || 0;

    // Helper to convert "HH:MM:SS" string to minutes
    function timeToMinutes(timeStr) {
      if (!timeStr || typeof timeStr !== 'string') return 0;
      const parts = timeStr.split(":");
      if (parts.length !== 3) return 0;
      const [hours, minutes, seconds] = parts.map(Number);
      return hours * 60 + minutes + seconds / 60;
    }

    const startMinutes = timeToMinutes(ride.rideInfo.ridseStartTime);
    const endMinutes = timeToMinutes(rideEndTime);

    let diffOfMinutes = endMinutes - startMinutes;
    if (diffOfMinutes < 0) diffOfMinutes += 24 * 60; // handle overnight rides

    console.log("included minutes", includedMinutes)

    const safeIncludedMinutes = Number(includedMinutes) || 0;
    console.log("safeIncludedMinutes", safeIncludedMinutes)
    let extraMinutes = 0

    // Calculate extra charges only if extraKm is provided
    let extraKmCharges = 0;
    if (extraKm !== undefined && extraKm !== null) {
      extraKmCharges = extraKm * extraChargePerKm;
      const extraKmAdminCharges = extraKmCharges * adminChargesInPercentage / 100;
      const extraKmGstCharges = extraKmCharges * gstChargesInPercentage / 100;
      extraKmCharges = Math.ceil(extraKmCharges + extraKmAdminCharges + extraKmGstCharges);
    }

    // Calculate extraMinutes charges
    let extraMinutesCharges = 0;
    if (diffOfMinutes > safeIncludedMinutes) {
      extraMinutes = diffOfMinutes - safeIncludedMinutes
      extraMinutesCharges = extraMinutes * extraChargePerMinute;
      const extraMinutesAdminCharges = extraMinutesCharges * adminChargesInPercentage / 100;
      const extraMinutesGstCharges = extraMinutesCharges * gstChargesInPercentage / 100;
      extraMinutesCharges = Math.ceil(extraMinutesCharges + extraMinutesAdminCharges + extraMinutesGstCharges);
    }

    // Add to totalPayable
    totalPayable += extraKmCharges + extraMinutesCharges;

    // Prepare update data dynamically
    const updateData = {
      'rideInfo.extraMinutes': extraMinutes,
      'rideInfo.driverCharges': driverCharges,
      'rideInfo.adminCharges': adminCharges,
      'rideInfo.subtotal': subtotal,
      'rideInfo.gstCharges': gstCharges,
      'rideInfo.extended': true,
      'rideInfo.rideEndTime': rideEndTime,
      "rideInfo.extraKmCharges": extraKmCharges,
      "rideInfo.extraMinutesCharges": extraMinutesCharges,
      totalPayable
    };

    if (extraKm !== undefined && extraKm !== null) {
      updateData['rideInfo.extraKm'] = extraKm;
    }

    const updatedRide = await Ride.findByIdAndUpdate(rideId, updateData, { new: true });

    // Prepare response data dynamically
    const responseData = {
      rideId,
      categoryId,
      categoryName,
      subcategoryId,
      subcategoryName,
      includeInsurance: ride.rideInfo.includeInsurance,
      driverCharges,
      adminCharges,
      subtotal,
      insuranceCharges,
      cancellationCharges,
      gstCharges,
      discount,
    };

    // Include KM fields first if provided
    if (extraKm !== undefined && extraKm !== null) {
      responseData.extraKm = extraKm;
      responseData.extraChargePerKm = extraChargePerKm;
      responseData.extraKmCharges = extraKmCharges;
    }

    // Then include Minutes fields
    responseData.extraMinutes = extraMinutes;
    responseData.extraChargePerMinute = extraChargePerMinute;
    responseData.extraMinutesCharges = extraMinutesCharges;

    // Finally totalPayable
    responseData.totalPayable = totalPayable;

    res.json({
      success: true,
      message: "Extra charges calculated and ride updated successfully",
      rideEndTime: updatedRide.rideInfo.rideEndTime,
      diffOfMinutes: diffOfMinutes,
      includedMinutes: safeIncludedMinutes,
      data: responseData
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