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
const driverWallet = require("../DriverModel/driverWallet");
const withdrawalRequest = require("../DriverModel/withdrawalRequest");

// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>             Admin                >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

// Helper function for pagination and date filtering
const getPaginatedRides = async (status = null, req) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const dateFilter = req.query.date;

  let query = {};
  if (status) query.status = status;

  // Date filtering
  if (dateFilter === 'today') {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    query.createdAt = { $gte: today, $lt: tomorrow };
  } else if (dateFilter === 'yesterday') {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    const today = new Date(yesterday);
    today.setDate(today.getDate() + 1);
    query.createdAt = { $gte: yesterday, $lt: today };
  }

  const [rides, totalRides] = await Promise.all([
    Ride.find(query).skip(skip).limit(limit).sort({ createdAt: -1 }),
    Ride.countDocuments(query)
  ]);

  return {
    page,
    limit,
    totalRides,
    totalPages: Math.ceil(totalRides / limit),
    data: rides
  };
};

router.get('/', async (req, res) => {
  try {
    const result = await getPaginatedRides(null, req);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/booked', async (req, res) => {
  try {
    const result = await getPaginatedRides('BOOKED', req);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/confirmed', async (req, res) => {
  try {
    const result = await getPaginatedRides('CONFIRMED', req);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/ongoing', async (req, res) => {
  try {
    const result = await getPaginatedRides('ONGOING', req);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/completed', async (req, res) => {
  try {
    const result = await getPaginatedRides('COMPLETED', req);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/cancelled', async (req, res) => {
  try {
    const result = await getPaginatedRides('CANCELLED', req);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/extended', async (req, res) => {
  try {
    const result = await getPaginatedRides('EXTENDED', req);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/reached', async (req, res) => {
  try {
    const result = await getPaginatedRides('REACHED', req);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/booking/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: "Booking ID is required" });
    }

    const booking = await Ride.findById(id);

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    res.json({ success: true, data: booking });
  } catch (error) {
    console.error("Error fetching booking:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>             User / Rider                >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

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

    console.log('selected category data', selectedCategoryData)

    if (!selectedCategoryData) {
      return res.status(400).json({ message: "Invalid selectedCategory" });
    }

    const { riderId, mobile } = req.rider;

    const riderData = await Rider.findOne({ mobile })
    const riderName = riderData.name

    // Calculate unpaid cancellation charges to add to totalPayable
    const unpaidCancellationCharges = riderData.cancellationCharges - riderData.unclearedCancellationCharges;
    const adjustedTotalPayable = totalPayable + unpaidCancellationCharges;

    // Update unclearedCancellationCharges to reflect the applied amount
    if (unpaidCancellationCharges > 0) {
      riderData.unclearedCancellationCharges = riderData.cancellationCharges;
      riderData.cancellationCharges = 0;
      await riderData.save();
    }

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
        SelectedDays: durationValue,
        selectedDates: selectedDates || [],
        remainingDates: selectedDates || [],
        driverCharges: selectedCategoryData.driverCharges || 0,
        pickCharges: selectedCategoryData.pickCharges || 0,
        peakCharges: selectedCategoryData.peakCharges || 0,
        nightCharges: selectedCategoryData.nightCharges || 0,
        insuranceCharges: selectedCategoryData.insuranceCharges || 0,
        cancellationCharges: selectedCategoryData.cancellationCharges || 0,
        discount: selectedCategoryData.discountApplied || 0,
        gstCharges: selectedCategoryData.gstCharges || 0,
        subtotal: selectedCategoryData.subtotal || 0,
        adminCharges: selectedCategoryData.adminCommissionAdjusted || 0,
      },
      referralEarning: referralEarning || false,
      referralBalance: referralEarning ? referralBalance : 0,
      totalPayable: adjustedTotalPayable,
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
        totalPayable: adjustedTotalPayable,
        status: 'BOOKED'
      };

      // Get drivers with rideStatus 'WAITING' and matching categories
      const waitingDrivers = await Driver.find({
        rideStatus: 'WAITING',
        'personalInformation.category': categoryId,
        'personalInformation.subCategory': { $in: [subcategoryId] },
        $or: [
          { driverCategory: selectedCategoryId },
          { parcelCategory: selectedCategoryId },
          { assignedCar: selectedCategoryId },
        ],
      }).select('_id');

      console.log("waiting drivers", waitingDrivers)

      const waitingDriverIds = waitingDrivers.map(driver => driver._id.toString());

      console.log(`✅ Found ${waitingDriverIds.length} drivers with WAITING status and matching categories`);

      // Send to online drivers who have WAITING rideStatus
      let sentCount = 0;
      Object.entries(onlineDrivers).forEach(([driverId, driverSocketData]) => {
        // Only send to drivers with WAITING status
        if (waitingDriverIds.includes(driverId)) {
          io.to(driverSocketData.socketId).emit('new-ride', rideData);
          sentCount++;
        }
      });

      console.log(`🚗 New ride ${newRide._id} sent to ${sentCount} available drivers (WAITING status + matching categories)`);
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
router.get("/booked/my-rides", authMiddleware, async (req, res) => {
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

router.get("/confirmed/my-rides", authMiddleware, async (req, res) => {
  try {
    // riderId comes from token (authMiddleware)
    const { riderId } = req.rider;

    // Find only rides with status = "BOOKED" sorted by createdAt desc
    const rides = await Ride.find({ riderId, status: "CONFIRMED" }).sort({ createdAt: -1 });

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

router.get("/ongoing/my-rides", authMiddleware, async (req, res) => {
  try {
    // riderId comes from token (authMiddleware)
    const { riderId } = req.rider;

    // Find only rides with status = "BOOKED" sorted by createdAt desc
    const rides = await Ride.find({
      riderId, status: { $in: ["ONGOING", "EXTENDED"] }
    }).sort({ createdAt: -1 });

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

    const updatedBooking = await Ride.findOneAndUpdate(
      {
        _id: bookingId,
        status: { $in: ["BOOKED", "CONFIRMED", "REACHED"] } // only update if status is one of these
      },
      { status: "CANCELLED" },
      { new: true } // return the updated document
    );

    if (!updatedBooking) {
      return res.status(400).json({
        success: false,
        message: "Booking cannot be cancelled. Current status does not allow cancellation."
      });
    }

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

            // Move unclearedCancellationCharges back to cancellationCharges since ride is cancelled
            const rider = await Rider.findById(riderId);
            if (rider && rider.unclearedCancellationCharges > 0) {
              rider.cancellationCharges += rider.unclearedCancellationCharges;
              rider.unclearedCancellationCharges = 0;
              await rider.save();
            }

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
              // Move unclearedCancellationCharges back to cancellationCharges and add new charges
              rider.cancellationCharges += rider.unclearedCancellationCharges + remainingCharges;
              rider.unclearedCancellationCharges = 0;
              await rider.save();
            }

            console.log(`Deducted ${currentBalance} from wallet, stored ${remainingCharges} as pending charges`);
          }
        } else {
          // No wallet found, store full amount in rider model
          const rider = await Rider.findById(riderId);
          if (rider) {
            // Move unclearedCancellationCharges back to cancellationCharges and add new charges
            rider.cancellationCharges += rider.unclearedCancellationCharges + cancellationFee;
            rider.unclearedCancellationCharges = 0;
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

    const ride = await Ride.findById(rideId);
    if (!ride) {
      return res.status(404).json({ message: "Ride not found" });
    }

    // ✅ Get current time in HH:MM:SS format
    const driverReachTime = new Date().toLocaleTimeString("en-GB", {
      timeZone: "Asia/Kolkata",
    });
    const currentDate = new Date().toISOString().split('T')[0];

    const subcategoryName = ride.rideInfo.subcategoryName?.toLowerCase() || '';
    let updateData = {
      status: "REACHED",
      driverId: driverId,
    };

    if (subcategoryName.includes('weekly') || subcategoryName.includes('monthly')) {
      const weeklyMonthlyRideTimings = ride.rideInfo.weeklyMonthlyRideTimings || [];
      const existingIndex = weeklyMonthlyRideTimings.findIndex(timing => timing.date === currentDate);

      if (existingIndex >= 0) {
        weeklyMonthlyRideTimings[existingIndex].driverReachTime = driverReachTime;
      } else {
        weeklyMonthlyRideTimings.push({ date: currentDate, driverReachTime });
      }
      updateData["rideInfo.weeklyMonthlyRideTimings"] = weeklyMonthlyRideTimings;
    } else {
      updateData["rideInfo.driverReachTime"] = driverReachTime;
    }

    // ✅ Update the ride only if status is CONFIRMED
    const updatedRide = await Ride.findOneAndUpdate(
      { _id: rideId, status: "CONFIRMED" },
      updateData,
      { new: true }
    );

    if (!updatedRide) {
      return res.status(404).json({
        success: false,
        message: "Ride not found or not in CONFIRMED status",
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

    if (!rideId) {
      return res.status(400).json({ message: "Ride ID is required" });
    }

    const ride = await Ride.findById(rideId);
    if (!ride) {
      return res.status(404).json({ message: "Ride not found" });
    }

    // ✅ Get current time in HH:MM:SS format
    const rideStartTime = new Date().toLocaleTimeString("en-GB", {
      timeZone: "Asia/Kolkata",
    });
    const currentDate = new Date().toISOString().split('T')[0];

    const driverInfo = await Driver.findById(driverId);
    if (!driverInfo) {
      return res.status(404).json({ message: "Driver not found" });
    }

    const subcategoryName = ride.rideInfo.subcategoryName?.toLowerCase() || '';
    let updateData = {
      status: "ONGOING",
    };

    if (subcategoryName.includes('weekly') || subcategoryName.includes('monthly')) {
      const weeklyMonthlyRideTimings = ride.rideInfo.weeklyMonthlyRideTimings || [];
      const existingIndex = weeklyMonthlyRideTimings.findIndex(timing => timing.date === currentDate);

      if (existingIndex >= 0) {
        weeklyMonthlyRideTimings[existingIndex].rideStartTime = rideStartTime;
      } else {
        weeklyMonthlyRideTimings.push({ date: currentDate, rideStartTime: rideStartTime });
      }
      updateData["rideInfo.weeklyMonthlyRideTimings"] = weeklyMonthlyRideTimings;
    } else {
      updateData["rideInfo.ridseStartTime"] = rideStartTime;
    }

    // Find and update the ride only if status is REACHED
    const updatedRide = await Ride.findOneAndUpdate(
      { _id: rideId, status: "REACHED" },
      updateData,
      { new: true }
    );

    if (!updatedRide) {
      return res.status(400).json({ message: "Ride is already ongoing or not found" });
    }

    // Update driver rideStatus to ONGOING
    await Driver.findByIdAndUpdate(driverId, { rideStatus: "ONGOING" });

    console.log('✅ Ride ongoing by driver:', driverId, 'for ride:', rideId);



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
    let { rideId, NoOfDays, selectedDates, reason } = req.body;
    const driverId = req.driver?.driverId;

    // ✅ Validate rideId
    const currentRide = await Ride.findById(rideId);
    if (!currentRide) {
      return res.status(404).json({ success: false, message: "Ride not found" });
    }

    // ✅ Check if ride has driverId
    if (!currentRide.driverId) {
      return res.status(400).json({ success: false, message: "For this ride driver not found" });
    }

    // ✅ Parse selectedDates safely (works for JSON or string from form-data)
    if (typeof selectedDates === "string") {
      try {
        selectedDates = JSON.parse(selectedDates);
      } catch {
        selectedDates = selectedDates
          .replace(/\[|\]/g, "")
          .split(",")
          .map((d) => d.trim().replace(/"/g, ""));
      }
    }

    NoOfDays = parseInt(NoOfDays);

    // ✅ Validate selectedDates array
    if (!Array.isArray(selectedDates) || selectedDates.length === 0) {
      return res.status(400).json({ success: false, message: "selectedDates must be a non-empty array" });
    }

    const originalDates = currentRide.rideInfo.selectedDates || [];

    // ✅ Check for invalid dates
    const invalidDates = selectedDates.filter((d) => !originalDates.includes(d));
    if (invalidDates.length > 0) {
      return res.status(400).json({
        success: false,
        message: `These dates are not part of this ride: ${invalidDates.join(", ")}`,
      });
    }

    // ✅ Compute remaining and cancelled dates
    const remainingDates = originalDates.filter((d) => !selectedDates.includes(d));
    const remainingNoOfDays = remainingDates.length;
    const cancelDays = selectedDates.length;

    // ✅ Full cancellation
    if (remainingNoOfDays === 0) {
      await Ride.findByIdAndUpdate(rideId, {
        status: "CANCELLED",
        "rideInfo.remainingDates": [],
        "rideInfo.selectedDates": [],
        "rideInfo.SelectedDays": 0,
      });

      // Also update driver status to AVAILABLE again
      if (driverId) {
        await Driver.findByIdAndUpdate(driverId, { rideStatus: "AVAILABLE" });
      }

      return res.status(200).json({ success: true, message: "Full ride cancelled successfully" });
    }

    // ✅ Partial cancellation case - Calculate proportional charges
    const originalTotalDays = parseInt(currentRide.rideInfo.SelectedDays) || 1;
    const cancelRatio = cancelDays / originalTotalDays;
    const remainingRatio = remainingNoOfDays / originalTotalDays;

    // Calculate cancelled charges proportionally
    const cancelledChargesForNewRide = {
      driverCharges: Math.round(currentRide.rideInfo.driverCharges * cancelRatio),
      insuranceCharges: Math.round(currentRide.rideInfo.insuranceCharges * cancelRatio),
      cancellationCharges: Math.round(currentRide.rideInfo.cancellationCharges * cancelRatio),
      discountApplied: Math.round(currentRide.rideInfo.discount * cancelRatio),
      gstCharges: Math.round(currentRide.rideInfo.gstCharges * cancelRatio),
      subtotal: Math.round(currentRide.rideInfo.subtotal * cancelRatio),
      adminCommissionAdjusted: Math.round(currentRide.rideInfo.adminCharges * cancelRatio),
      totalPayable: Math.round(currentRide.totalPayable * cancelRatio),
    };

    // Calculate remaining charges for current ride
    const remainingCharges = {
      driverCharges: Math.round(currentRide.rideInfo.driverCharges * remainingRatio),
      insuranceCharges: Math.round(currentRide.rideInfo.insuranceCharges * remainingRatio),
      cancellationCharges: Math.round(currentRide.rideInfo.cancellationCharges * remainingRatio),
      discount: Math.round(currentRide.rideInfo.discount * remainingRatio),
      gstCharges: Math.round(currentRide.rideInfo.gstCharges * remainingRatio),
      subtotal: Math.round(currentRide.rideInfo.subtotal * remainingRatio),
      adminCharges: Math.round(currentRide.rideInfo.adminCharges * remainingRatio),
      totalPayable: Math.round(currentRide.totalPayable * remainingRatio),
    };

    // ✅ Create new ride document for cancelled dates
    const newCancelledRide = new Ride({
      riderId: currentRide.riderId,
      riderInfo: {
        riderName: currentRide.riderInfo.riderName,
        riderMobile: currentRide.riderInfo.riderMobile,
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
        SelectedDays: cancelDays,            // ✅ number of cancelled days
        selectedDates,                       // ✅ cancelled days
        remainingDates: [],                  // ✅ none remain in cancelled record
        driverCharges: cancelledChargesForNewRide.driverCharges,
        insuranceCharges: cancelledChargesForNewRide.insuranceCharges,
        cancellationCharges: cancelledChargesForNewRide.cancellationCharges,
        discount: cancelledChargesForNewRide.discountApplied,
        gstCharges: cancelledChargesForNewRide.gstCharges,
        subtotal: cancelledChargesForNewRide.subtotal,
        adminCharges: cancelledChargesForNewRide.adminCommissionAdjusted,
      },
      referralEarning: currentRide.referralEarning || false,
      referralBalance: currentRide.referralBalance || 0,
      totalPayable: cancelledChargesForNewRide.totalPayable,
      paymentType: currentRide.paymentType,
      status: "CANCELLED",
      cancellationReason: reason || "Cancelled by user",
    });

    await newCancelledRide.save();

    // ✅ Update current ride with remaining dates and recalculated charges
    await Ride.findByIdAndUpdate(currentRide._id, {
      $set: {
        "rideInfo.selectedDates": remainingDates,
        "rideInfo.remainingDates": remainingDates,
        "rideInfo.SelectedDays": remainingNoOfDays,
        "rideInfo.driverCharges": remainingCharges.driverCharges,
        "rideInfo.insuranceCharges": remainingCharges.insuranceCharges,
        "rideInfo.cancellationCharges": remainingCharges.cancellationCharges,
        "rideInfo.discount": remainingCharges.discount,
        "rideInfo.gstCharges": remainingCharges.gstCharges,
        "rideInfo.subtotal": remainingCharges.subtotal,
        "rideInfo.adminCharges": remainingCharges.adminCharges,
        "totalPayable": remainingCharges.totalPayable,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Partial cancellation successful",
      remainingDates,
      cancelledDates: selectedDates,
    });

  } catch (error) {
    console.error("Cancel Ride Error:", error);
    return res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
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



    res.json({
      message: "Ride extended successfully",
      ride: updatedRide,
    });
  } catch (error) {
    console.error("Error extending ride:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.post("/driver/complete", driverAuthMiddleware, async (req, res) => {
  try {
    const { rideId } = req.body;
    const driverId = req.driver?.driverId;
    const driverMobile = req.driver?.mobile;

    console.log('🚗 Driver completing ride:', driverId, 'for ride:', rideId);

    if (!rideId) {
      return res.status(400).json({ message: "Ride ID is required" });
    }

    // 🔹 Fetch driver info
    const driverInfo = await Driver.findById(driverId);
    if (!driverInfo) {
      return res.status(404).json({ message: "Driver not found" });
    }

    const driverName = driverInfo.personalInformation?.fullName;

    // Get ride data for validation before updating
    const currentRide = await Ride.findById(rideId);
    if (!currentRide) {
      return res.status(404).json({ message: "Ride not found" });
    }

    // Validate selectedDates and completedDates if both exist
    const selectedDates = currentRide.rideInfo.selectedDates || [];
    const completedDates = currentRide.rideInfo.completedDates || [];

    if (selectedDates.length > 0 && completedDates.length > 0) {
      const sortedSelectedDates = [...selectedDates].sort();
      const sortedCompletedDates = [...completedDates].sort();

      if (JSON.stringify(sortedSelectedDates) !== JSON.stringify(sortedCompletedDates)) {
        return res.status(400).json({
          message: "Cannot complete ride. Selected dates and completed dates must match.",
          selectedDates: sortedSelectedDates,
          completedDates: sortedCompletedDates
        });
      }
    }

    // 🔹 Update the ride status to COMPLETED (only if ONGOING or EXTENDED)
    const updatedRide = await Ride.findOneAndUpdate(
      { _id: rideId, status: { $in: ["ONGOING", "EXTENDED"] } },
      {
        status: "COMPLETED",
        driverId: driverId,
        driverInfo: { driverName, driverMobile },
      },
      { new: true }
    );

    if (!updatedRide) {
      return res.status(400).json({ message: "Ride already completed or not found" });
    }

    // console.log("Updated ride on completion:", updatedRide);

    // 🔹 Update driver's ride status
    await Driver.findByIdAndUpdate(driverId, { rideStatus: "WAITING" });

    // 🔹 Reset rider’s uncleared cancellation charges
    const rider = await Rider.findById(updatedRide.riderId);
    if (rider) {
      rider.unclearedCancellationCharges = 0;
      await rider.save();
    }

    // -------------------------
    // 💰 DRIVER WALLET LOGIC
    // -------------------------
    const rideInfo = updatedRide.rideInfo;

    // Calculate total credit for driver
    const driverEarning =
      (rideInfo.driverCharges || 0) +
      (rideInfo.pickCharges || 0) +
      (rideInfo.nightCharges || 0) +
      (rideInfo.peakCharges || 0) +
      (rideInfo.extraKmCharges || 0) +
      (rideInfo.extraMinutesCharges || 0) +
      (rideInfo.cancellationCharges || 0)

    // console.log("💰 Calculated driver earning:", driverEarning);

    if (driverEarning > 0) {
      let wallet = await driverWallet.findOne({ driverId });

      // Create wallet if not exists
      if (!wallet) {
        wallet = await driverWallet.create({
          driverId,
          balance: 0,
          totalEarnings: 0,
          totalWithdrawn: 0,
          totalDeductions: 0,
          transactions: [],
        });
      }

      // Add ride payment transaction
      wallet.transactions.push({
        type: "ride_payment",
        amount: driverEarning,
        rideId: updatedRide._id,
        paymentMethod: updatedRide.paymentType || "cash",
        description: `Ride completed (${rideInfo.categoryName} - ${rideInfo.subcategoryName})`,
        status: "completed",
      });

      wallet.balance += driverEarning;
      wallet.totalEarnings += driverEarning;

      await wallet.save();

      // console.log("✅ Wallet updated for driver:", driverId);

      // 🔹 Process uncleared cancellation charges
      const driver = await Driver.findById(driverId);
      const unclearedCharges = driver?.unclearedCancellationCharges || 0;

      if (unclearedCharges > 0) {
        const currentBalance = wallet.balance;

        if (currentBalance >= unclearedCharges) {
          // Deduct full uncleared charges from wallet
          wallet.balance -= unclearedCharges;
          wallet.totalDeductions += unclearedCharges;
          wallet.transactions.push({
            type: "cancellation_charge",
            amount: -unclearedCharges,
            rideId: updatedRide._id,
            description: `Uncleared cancellation charges deducted`,
            status: "completed"
          });
          await wallet.save();

          // Clear uncleared charges
          driver.unclearedCancellationCharges = 0;
          await driver.save();

          // console.log(`✅ Deducted full uncleared charges: ${unclearedCharges}`);
        } else {
          // Partial deduction from wallet
          const remainingCharges = unclearedCharges - currentBalance;

          if (currentBalance > 0) {
            wallet.totalDeductions += currentBalance;
            wallet.balance = 0;
            wallet.transactions.push({
              type: "cancellation_charge",
              amount: -currentBalance,
              rideId: updatedRide._id,
              description: `Partial uncleared cancellation charges deducted`,
              status: "completed"
            });
            await wallet.save();
          }

          // Update remaining uncleared charges
          driver.unclearedCancellationCharges = remainingCharges;
          await driver.save();

          // console.log(`✅ Deducted ${currentBalance} from wallet, remaining charges: ${remainingCharges}`);
        }
      }
    } else {
      // console.log("⚠️ No earning added (amount <= 0)");
    }

    // 🔹 Final response
    res.json({
      message: "Ride completed successfully and wallet updated",
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
    const { rideId, totalKm } = req.body;
    const driverId = req.driver?.driverId;

    if (!rideId) {
      return res.status(400).json({
        success: false,
        message: "rideId is required"
      });
    }

    const ride = await Ride.findById(rideId);

    if (!ride) {
      return res.status(404).json({
        success: false,
        message: "Ride not found"
      });
    }

    const rideEndTime = new Date().toLocaleTimeString("en-GB", {
      timeZone: "Asia/Kolkata",
    });
    const currentDate = new Date().toISOString().split('T')[0];

    const { categoryId, categoryName, subcategoryId, subcategoryName, subSubcategoryId, ridseStartTime, selectedUsage, selectedCategoryId, } = ride.rideInfo;

    // console.log("Ride info:", { categoryId, categoryName, subcategoryId, subcategoryName, ridseStartTime, selectedUsage, selectedCategoryId });

    // Determine extra charges based on category
    let extraChargePerKm = 0;
    let extraChargePerMinute = 0;
    let includedKm = 0;
    let includedMinutes = 0;
    let adminChargesInPercentage = 0;
    let gstChargesInPercentage = 0;

    const catNameLower = categoryName.toLowerCase();
    const subcategoryNameLower = subcategoryName.toLowerCase();

    if (catNameLower === "driver") {
      const driverData = await getDriverRideIncludedData(categoryId, subcategoryId, subSubcategoryId, selectedUsage, subcategoryNameLower, selectedCategoryId);
      includedKm = driverData.includedKm;
      includedMinutes = driverData.includedMinutes;
      extraChargePerKm = driverData.extraChargePerKm;
      extraChargePerMinute = driverData.extraChargePerMinute;
      adminChargesInPercentage = driverData.extraChargesFromAdmin;
      gstChargesInPercentage = driverData.gst;
    } else if (catNameLower === "cab") {
      const cabData = await getCabRideIncludedData(categoryId, subcategoryId, subSubcategoryId, selectedUsage, subcategoryNameLower, selectedCategoryId);
      includedKm = cabData.includedKm;
      includedMinutes = cabData.includedMinutes;
      extraChargePerKm = cabData.extraChargePerKm;
      extraChargePerMinute = cabData.extraChargePerMinute;
      adminChargesInPercentage = cabData.extraChargesFromAdmin;
      gstChargesInPercentage = cabData.gst;
    } else if (catNameLower === "parcel") {
      const parcelData = await getParcelRideIncludedData(categoryId, subcategoryId, selectedUsage, subcategoryNameLower, selectedCategoryId);
      includedKm = parcelData.includedKm;
      extraChargePerKm = parcelData.extraChargePerKm;
      extraChargePerMinute = parcelData.extraChargePerMinute;
      adminChargesInPercentage = parcelData.extraChargesFromAdmin;
      gstChargesInPercentage = parcelData.gst;
    }


    // Validate inputs and calculate extraKm
    const safeTotalKm = Number(totalKm) || 0;
    // console.log("safeTotalKm", safeTotalKm)
    const safeIncludedKm = Number(includedKm) || 0;
    // console.log("safeIncludedKm", safeIncludedKm)
    let extraKm = Math.max(0, safeTotalKm - safeIncludedKm);
    // console.log("extraKm", extraKm)

    // console.log("extraKm", extraKm)

    let driverCharges = ride.rideInfo?.driverCharges || 0;
    let adminCharges = ride.rideInfo?.adminCharges || 0;
    let insuranceCharges = ride.rideInfo?.insuranceCharges || 0;
    let cancellationCharges = ride.rideInfo?.cancellationCharges || 0;
    let discount = ride.rideInfo?.discount || 0;
    let subtotal = ride.rideInfo?.subtotal || 0;
    let gstCharges = ride.rideInfo?.gstCharges || 0;
    let totalPayable = ride.totalPayable || 0;

    // console.log("includedKm , includedMinutes", includedKm, includedMinutes)

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

    // console.log("included minutes", includedMinutes)

    const safeIncludedMinutes = Number(includedMinutes) || 0;
    // console.log("safeIncludedMinutes", safeIncludedMinutes)
    let extraMinutes = 0

    // Calculate extra charges only if extraKm is provided
    let extraKmCharges = 0;
    if (extraKm > 0) {
      extraKmCharges = extraKm * extraChargePerKm;

      const extraKmAdminCharges = extraKmCharges * adminChargesInPercentage / 100;
      const extraKmGstCharges = extraKmCharges * gstChargesInPercentage / 100;

      extraKmCharges = Math.ceil(extraKmCharges + extraKmAdminCharges + extraKmGstCharges);
    }

    // Calculate extraMinutes charges
    let extraMinutesCharges = 0;
    if (diffOfMinutes > safeIncludedMinutes) {
      extraMinutes = Number((diffOfMinutes - safeIncludedMinutes).toFixed(1));
      extraMinutesCharges = extraMinutes * extraChargePerMinute;
      const extraMinutesAdminCharges = extraMinutesCharges * adminChargesInPercentage / 100;
      const extraMinutesGstCharges = extraMinutesCharges * gstChargesInPercentage / 100;
      extraMinutesCharges = Math.ceil(extraMinutesCharges + extraMinutesAdminCharges + extraMinutesGstCharges);
    }

    // Add to totalPayable
    totalPayable += extraKmCharges + extraMinutesCharges;

    // Prepare update data dynamically
    const updateData = {
      "rideInfo.extraChargePerKm": extraChargePerKm,
      "rideInfo.extraChargePerMinute": extraChargePerMinute,
      "rideInfo.extraKm": extraKm,
      'rideInfo.extraMinutes': extraMinutes,
      'rideInfo.driverCharges': driverCharges,
      'rideInfo.adminCharges': adminCharges,
      'rideInfo.subtotal': subtotal,
      'rideInfo.gstCharges': gstCharges,
      'rideInfo.extended': true,
      "rideInfo.extraKmCharges": extraKmCharges,
      "rideInfo.extraMinutesCharges": extraMinutesCharges,
      totalPayable
    };


    if (subcategoryNameLower.includes('weekly') || subcategoryNameLower.includes('monthly')) {
      const weeklyMonthlyRideTimings = ride.rideInfo.weeklyMonthlyRideTimings || [];
      const existingIndex = weeklyMonthlyRideTimings.findIndex(timing => timing.date === currentDate);

      if (existingIndex >= 0) {
        weeklyMonthlyRideTimings[existingIndex].rideEndTime = rideEndTime;
      } else {
        weeklyMonthlyRideTimings.push({ date: currentDate, rideEndTime });
      }
      updateData["rideInfo.weeklyMonthlyRideTimings"] = weeklyMonthlyRideTimings;
    } else {
      updateData['rideInfo.rideEndTime'] = rideEndTime;
    }

    if (extraKm > 0) {
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
    if (extraKm > 0) {
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

// 1️⃣ Get all PENDING withdrawal requests
router.get("/withdrawals/pending", async (req, res) => {
  try {
    const pendingRequests = await withdrawalRequest
      .find({ status: "pending" })
      .populate("driverId", "mobile personalInformation.fullName personalInformation.currentAddress").sort({ createdAt: -1 });
    res.json({ success: true, data: pendingRequests });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 2️⃣ Get all COMPLETED withdrawal requests
router.get("/withdrawals/completed", async (req, res) => {
  try {
    const completedRequests = await withdrawalRequest
      .find({ status: "completed" })
      .populate("driverId", "mobile personalInformation.fullName personalInformation.currentAddress").sort({ createdAt: -1 });;
    res.json({ success: true, data: completedRequests });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 3️⃣ Get all REJECTED withdrawal requests
router.get("/withdrawals/rejected", async (req, res) => {
  try {
    const rejectedRequests = await withdrawalRequest
      .find({ status: "rejected" })
      .populate("driverId", "mobile personalInformation.fullName personalInformation.currentAddress").sort({ createdAt: -1 });;
    res.json({ success: true, data: rejectedRequests });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get cancellation info for driver
router.post("/driver/cancellation-info", driverAuthMiddleware, async (req, res) => {
  try {
    const { rideId } = req.body;
    const driverId = req.driver?.driverId;

    if (!rideId) {
      return res.status(400).json({ message: "Ride ID is required" });
    }

    const driver = await Driver.findById(driverId);
    if (!driver) {
      return res.status(404).json({ message: "Driver not found" });
    }

    const ride = await Ride.findById(rideId);
    if (!ride) {
      return res.status(404).json({ message: "Ride not found" });
    }

    // Get cancellation charges for the ride
    const { categoryName, categoryId, subcategoryId } = ride.rideInfo;
    const categoryNameLower = categoryName.toLowerCase();
    let cancellationDetails = null;

    try {
      if (categoryNameLower === 'driver') {
        cancellationDetails = await driverRideCost.findOne({
          category: categoryId,
          subcategory: subcategoryId
        }).select('driverCancellationCharges');
      } else if (categoryNameLower === 'cab') {
        cancellationDetails = await cabRideCost.findOne({
          category: categoryId,
          subcategory: subcategoryId
        }).select('driverCancellationCharges');
      } else if (categoryNameLower === 'parcel') {
        cancellationDetails = await parcelRideCost.findOne({
          category: categoryId,
          subcategory: subcategoryId
        }).select('driverCancellationCharges');
      }

      const currentRideCancellationCharges = cancellationDetails?.driverCancellationCharges || 0;

      res.json({
        success: true,
        data: {
          availableCancellationCredits: driver.cancellationRideCredits,
          currentRideCancellationCharges
        }
      });

    } catch (error) {
      console.error('Error fetching cancellation details:', error);
      res.status(500).json({ message: "Error fetching cancellation details" });
    }

  } catch (error) {
    console.error("Error getting cancellation info:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// Update completed days and dates
router.post("/complete-day", driverAuthMiddleware, async (req, res) => {
  try {
    const { rideId } = req.body;

    if (!rideId) {
      return res.status(400).json({ message: "Ride ID is required" });
    }

    const ride = await Ride.findById(rideId);
    if (!ride) {
      return res.status(404).json({ message: "Ride not found" });
    }

    const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const selectedDates = ride.rideInfo.selectedDates || [];
    const remainingDates = ride.rideInfo.remainingDates || [];
    const completedDates = ride.rideInfo.completedDates || [];
    const completedDays = ride.rideInfo.completedDays || [];
    const selectedDays = parseInt(ride.rideInfo.SelectedDays) || 0;

    // Check if current date exists in remainingDates
    if (!remainingDates.includes(currentDate)) {
      return res.status(400).json({ message: "Current date is not in remaining dates" });
    }

    // Check if already completed
    if (completedDates.includes(currentDate)) {
      return res.status(400).json({ message: "This date is already completed" });
    }

    // Update arrays
    const updatedCompletedDates = [...completedDates, currentDate];
    const updatedRemainingDates = remainingDates.filter(date => date !== currentDate);
    const updatedCompletedDays = [...completedDays, "1"];

    // Check if all days are completed
    if (updatedCompletedDays.length >= selectedDays) {
      return res.status(400).json({ message: "All selected days are already completed" });
    }

    const updatedRide = await Ride.findByIdAndUpdate(
      rideId,
      {
        "rideInfo.completedDates": updatedCompletedDates,
        "rideInfo.remainingDates": updatedRemainingDates,
        "rideInfo.completedDays": updatedCompletedDays,
        status: "CONFIRMED"
      },
      { new: true }
    );

    // ✅ Update driver status to CONFIRMED only if current rideStatus is ONGOING or EXTENDED
    const driverId = req.driver?.driverId;

    if (driverId) {
      const driver = await Driver.findById(driverId);

      if (driver && (driver.rideStatus === "ONGOING" || driver.rideStatus === "EXTENDED")) {
        await Driver.findByIdAndUpdate(driverId, { rideStatus: "CONFIRMED" });
      } else {
        return res.status(400).json({
          message: "Driver rideStatus must be ONGOING or EXTENDED to update to CONFIRMED.",
        });
      }
    }

    res.json({
      success: true,
      message: "Day completed successfully",
      data: {
        completedDates: updatedCompletedDates,
        remainingDates: updatedRemainingDates,
        completedDays: updatedCompletedDays,
        totalCompletedDays: updatedCompletedDays.length,
        totalSelectedDays: selectedDays
      }
    });
  } catch (error) {
    console.error("Error completing day:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;