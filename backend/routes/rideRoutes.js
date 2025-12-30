const express = require("express");
const Ride = require('../models/Ride'); // Ensure this path is correct
const authMiddleware = require('../middleware/authMiddleware'); // Ensure this path is correct
const router = express.Router();
const Rider = require("../models/Rider");
const Driver = require("../DriverModel/DriverModel");
const Vehicle = require("../DriverModel/VehicleModel");
const { Wallet } = require("../models/Payment&Wallet");
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
const { checkDriverWalletBalance } = require('../utils/walletBalanceChecker');
const NotificationService = require('../Services/notificationService');
const { calculateDriverRideCost, calculateCabRideCost, calculateParcelRideCost } = require('../utils/rideCalculation');
const priceCategory = require("../models/PriceCategory");
const Car = require('../models/Car');
const ParcelVehicle = require('../models/ParcelVehicle');
const carCategory = require("../models/CarCategory");
const parcelCategory = require("../models/ParcelCategory");
const driverTransmissionType = require("../models/DriverVehicleType");
const driveCarType = require('../models/VehicleCategory')
const Category = require("../models/Category");
const subcategory = require("../models/SubCategory");
const subSubcategory = require("../models/SubSubCategory");
const RiderNotification = require("../models/RiderNotification");
const { combinedAuthMiddleware } = require('../Services/authService');
const adminAuthMiddleware = require("../middleware/adminAuthMiddleware");

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

router.get('/', adminAuthMiddleware, async (req, res) => {
  try {
    const result = await getPaginatedRides(null, req);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/booked', adminAuthMiddleware, async (req, res) => {
  try {
    const result = await getPaginatedRides('BOOKED', req);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/confirmed', adminAuthMiddleware, async (req, res) => {
  try {
    const result = await getPaginatedRides('CONFIRMED', req);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/ongoing', adminAuthMiddleware, async (req, res) => {
  try {
    const result = await getPaginatedRides('ONGOING', req);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/completed', adminAuthMiddleware, async (req, res) => {
  try {
    const result = await getPaginatedRides('COMPLETED', req);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/cancelled', adminAuthMiddleware, async (req, res) => {
  try {
    const result = await getPaginatedRides('CANCELLED', req);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/extended', adminAuthMiddleware, async (req, res) => {
  try {
    const result = await getPaginatedRides('EXTENDED', req);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/reached', adminAuthMiddleware, async (req, res) => {
  try {
    const result = await getPaginatedRides('REACHED', req);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get("/booking/:id", adminAuthMiddleware, async (req, res) => {
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

// Add admin extra charges to ride
router.post("/admin/extra-charges", adminAuthMiddleware, async (req, res) => {
  try {
    const { rideId, charges, description } = req.body;

    if (!rideId || charges === undefined) {
      return res.status(400).json({ message: "Ride ID and charges are required" });
    }

    const ride = await Ride.findById(rideId);
    if (!ride) {
      return res.status(404).json({ message: "Ride not found" });
    }

    const updatedRide = await Ride.findByIdAndUpdate(
      rideId,
      {
        $set: {
          "rideInfo.adminAddedRideExtraCharges.Charges": charges,
          "rideInfo.adminAddedRideExtraCharges.description": description
        },
        $inc: { totalPayable: charges }
      },
      { new: true }
    );

    // Send notification to driver if ride has driverId
    if (updatedRide.driverId) {
      try {
        const driver = await Driver.findById(updatedRide.driverId);
        if (driver && driver.oneSignalPlayerId) {
          await NotificationService.sendToUser(
            driver.oneSignalPlayerId,
            'Ride Extra Charges Added',
            'Hey Driver! Admin just added ride extra charges. Tap to check.',
            { type: 'admin_extra_charges', rideId: rideId }
          );
        }
      } catch (notifError) {
        console.error('Error sending notification to driver:', notifError);
      }
    }

    res.json({
      success: true,
      message: "Admin extra charges added successfully",
      data: updatedRide
    });
  } catch (error) {
    console.error("Error adding admin extra charges:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// update status to confirm and assign driver ride by driver
router.post("/admin/driver/confirm", adminAuthMiddleware, async (req, res) => {
  try {
    const { rideId, driverId } = req.body;

    if (!rideId) {
      return res.status(400).json({ message: "Ride ID is required" });
    }

    // Get ride details for wallet balance check
    const ride = await Ride.findById(rideId);
    if (!ride) {
      return res.status(404).json({ message: "Ride not found" });
    }

    // Check wallet balance before confirming ride
    try {
      const balanceCheck = await checkDriverWalletBalance(
        driverId,
        ride.rideInfo.categoryId,
        ride.rideInfo.subcategoryId,
        ride.rideInfo.subSubcategoryId
      );

      if (!balanceCheck.success) {
        return res.status(402).json({
          success: false,
          message: balanceCheck.message,
          requiredBalance: balanceCheck.requiredBalance,
          currentBalance: balanceCheck.currentBalance,
          errorCode: 'INSUFFICIENT_WALLET_BALANCE'
        });
      }
    } catch (walletError) {
      console.error('Wallet balance check error:', walletError);
      return res.status(500).json({
        success: false,
        message: 'Failed to validate wallet balance'
      });
    }

    const driverInfo = await Driver.findById(driverId);
    if (!driverInfo) {
      return res.status(404).json({ message: "Driver not found" });
    }

    const driverName = driverInfo.personalInformation?.fullName
    const driverMobile = driverInfo.mobile

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


    // Emit socket event to remove ride from all drivers
    const io = req.app.get('io');
    if (io) {
      io.to('drivers').emit('ride-assigned', {
        rideId: rideId,
        driverId: driverId
      });
      //console.log('🚗 Ride assigned event emitted:', rideId);
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

// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>             User / Rider                >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

router.post("/book", combinedAuthMiddleware, async (req, res) => {
  try {
    const {
      riderId: bodyRiderId, // Only for staff bookings
      categoryId,
      subcategoryId,
      subSubcategoryId,
      carTypeId,
      transmissionTypeId,
      fromLocationData,
      toLocationData,
      includeInsurance,
      notes,
      selectedCategoryId,
      selectedDate,
      selectedTime,
      selectedUsage,
      durationValue,
      durationType,
      selectedDates,
      paymentType,
      totalPayable,
      isReferralEarningUsed,
      referralEarningUsedAmount,
      senderDetails,
      receiverDetails,
      selectedCarCategoryId,
      selectedParcelCategoryId
    } = req.body;

    // Determine riderId based on authentication type
    let riderId, riderData, riderName, staffId, staffInfo;

    if (req.rider) {
      // User authentication - riderId from middleware
      riderId = req.rider.riderId;
      const mobile = req.rider.mobile;
      
      riderData = await Rider.findOne({ mobile });
      riderName = riderData.name;
    } else if (req.staff) {
      // Staff authentication - riderId from body, staffId from middleware
      if (!bodyRiderId) {
        return res.status(400).json({ message: "riderId is required for staff bookings" });
      }
      riderId = bodyRiderId;
      staffId = req.staff.staffId;
      
      // Get rider data
      riderData = await Rider.findById(riderId);
      if (!riderData) {
        return res.status(404).json({ success: false, message: 'Rider not found' });
      }
      riderName = riderData.name;
      
      // Staff info from middleware
      staffInfo = {
        staffName: req.staff.name,
        staffMobile: req.staff.mobile
      };
    } else {
      return res.status(401).json({ message: "Authentication required" });
    }

    if (!categoryId || !paymentType || !selectedDate || !selectedTime) {
      return res.status(400).json({ message: "Required fields missing" });
    }

    const categoryDoc = await Category.findById(categoryId).select('name');
    const subcategoryDoc = await subcategory.findById(subcategoryId).select('name');
    const subSubcategoryDoc = subSubcategoryId ? await subSubcategory.findById(subSubcategoryId).select('name') : null;

    const carTypeDoc = carTypeId ? await driveCarType.findById(carTypeId).select('vehicleName') : null;
    const transmissionTypeDoc = transmissionTypeId ? await driverTransmissionType.findById(transmissionTypeId).select('name') : null;

    const categoryName = categoryDoc?.name;
    const subcategoryName = subcategoryDoc?.name;
    const subSubcategoryName = subSubcategoryDoc?.name;
    const carType = carTypeDoc?.vehicleName;
    const transmissionType = transmissionTypeDoc?.name;



    const categoryNameLower = categoryName?.toLowerCase();

    let selectedCategoryDoc = null;
    if (categoryNameLower === 'driver') {
      selectedCategoryDoc = await priceCategory.findById(selectedCategoryId).select('priceCategoryName');
    } else if (categoryNameLower === 'cab') {
      selectedCategoryDoc = await Car.findById(selectedCategoryId).select('name');
    } else if (categoryNameLower === 'parcel') {
      selectedCategoryDoc = await ParcelVehicle.findById(selectedCategoryId).select('name');
    }

    const selectedCategory = categoryNameLower === 'driver'
      ? selectedCategoryDoc?.priceCategoryName
      : selectedCategoryDoc?.name;

    // ✅ SERVER-SIDE CALCULATION & VALIDATION
    let calculatedCharges;
    try {
      const calcParams = {
        categoryName,
        categoryId,
        subcategoryId,
        subSubcategoryId,
        selectedDate,
        selectedTime,
        includeInsurance,
        selectedUsage,
        durationType,
        durationValue,
        selectedCategoryId,
        isReferralEarningUsed,
        referralEarningUsedAmount,
        rider:riderData
      };

      if (categoryNameLower === 'driver') {
        calculatedCharges = await calculateDriverRideCost(calcParams);
      } else if (categoryNameLower === 'cab') {
        calculatedCharges = await calculateCabRideCost({ ...calcParams, carCategoryId: selectedCarCategoryId });
      } else if (categoryNameLower === 'parcel') {
        calculatedCharges = await calculateParcelRideCost({ ...calcParams, parcelCategoryId: selectedParcelCategoryId });
      } else {
        return res.status(400).json({ message: "Invalid category" });
      }
    } catch (calcError) {
      console.error('Calculation error:', calcError);
      return res.status(400).json({ message: calcError.message || "Failed to calculate ride cost" });
    }



    // Calculate unpaid cancellation charges
    const unpaidCancellationCharges = riderData.unclearedCancellationCharges;
    calculatedCharges.cancellationCharges = unpaidCancellationCharges;

    // ✅ CALCULATE SERVER-SIDE TOTAL
    const serverTotalPayable =
      calculatedCharges.driverCharges +
      calculatedCharges.pickCharges +
      calculatedCharges.peakCharges +
      calculatedCharges.nightCharges +
      calculatedCharges.insuranceCharges +
      calculatedCharges.adminCharges +
      calculatedCharges.gstCharges +
      calculatedCharges.cancellationCharges
    //  - calculatedCharges.discount;

    console.log("server charges", serverTotalPayable, "client charges", totalPayable)
    // ✅ VALIDATE AGAINST FRONTEND TOTAL (allow 2 rupee tolerance for rounding)
    const tolerance = 2;
    if (Math.abs(serverTotalPayable - totalPayable) > tolerance) {
      return res.status(400).json({
        message: "Price mismatch detected. Please refresh and try again.",
        serverTotal: serverTotalPayable,
        clientTotal: totalPayable
      });
    }

    const adjustedTotalPayable = serverTotalPayable;

    // Update unclearedCancellationCharges to reflect the applied amount
    if (unpaidCancellationCharges > 0) {
      riderData.unclearedCancellationCharges = riderData.cancellationCharges;
      riderData.cancellationCharges = 0;
      await riderData.save();
    }

    // Handle wallet deduction for wallet payments BEFORE saving ride
    if (paymentType === 'wallet') {
      const wallet = await Wallet.findOne({ riderId });
      
      if (!wallet) {
        return res.status(404).json({ message: 'Wallet not found' });
      }
      
      if (wallet.balance < adjustedTotalPayable) {
        return res.status(400).json({ message: 'Insufficient wallet balance' });
      }
      
      // Add spend transaction to wallet
      const transaction = {
        amount: adjustedTotalPayable,
        status: 'completed',
        type: 'spend',
        description: 'Ride booking payment',
        paidAt: new Date()
      };
      
      wallet.transactions.push(transaction);
      wallet.balance -= adjustedTotalPayable;
      wallet.totalSpent += adjustedTotalPayable;
      wallet.lastTransactionAt = new Date();
      
      await wallet.save();
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
    // console.log('📅 Ride date:', rideDate);



    // In rideInfo
    const newRide = new Ride({
      riderId,
      riderInfo: {
        riderName,
        riderMobile: req.staff ? riderData.mobile : req.rider.mobile
      },
      ...(staffId && {
        staffId,
        staffInfo
      }),
      rideInfo: {
        categoryId,
        subcategoryId,
        subSubcategoryId,
        categoryName,
        subcategoryName,
        subSubcategoryName,
        carTypeId,
        carType,
        transmissionTypeId,
        transmissionType,
        fromLocation: fromLocationData,
        toLocation: toLocationData && toLocationData !== "" ? toLocationData : undefined,
        senderDetails,
        receiverDetails,
        includeInsurance,
        notes,
        selectedCategoryId,
        selectedCategory,

        selectedDate: rideDate,
        selectedTime,
        selectedUsage,
        SelectedDays: durationValue,
        selectedDates: selectedDates || [],
        remainingDates: selectedDates || [],
        driverCharges: calculatedCharges.driverCharges,
        pickCharges: calculatedCharges.pickCharges,
        peakCharges: calculatedCharges.peakCharges,
        nightCharges: calculatedCharges.nightCharges,
        insuranceCharges: calculatedCharges.insuranceCharges,
        cancellationCharges: calculatedCharges.cancellationCharges,
        discount: calculatedCharges.discount,
        gstCharges: calculatedCharges.gstCharges,
        subtotal: calculatedCharges.subtotal,
        adminCharges: calculatedCharges.adminCharges,
      },
      isReferralEarningUsed: isReferralEarningUsed || false,
      referralEarningUsedAmount: isReferralEarningUsed ? referralEarningUsedAmount : 0,
      totalPayable: adjustedTotalPayable,
      paymentType,
      bookedBy: req.staff ? "STAFF" : "USER",
      status: "BOOKED",
    });
    let selectedCarCategoryName = null
    if (selectedCarCategoryId) {
      selectedCarCategoryName = await carCategory.findById(selectedCarCategoryId).select('name');
      newRide.rideInfo.selectedCarCategory = selectedCarCategoryName;
      newRide.rideInfo.selectedCarCategoryId = selectedCarCategoryId;
    }

    let selectedParcelCategoryName = null
    if (selectedParcelCategoryId) {
      selectedParcelCategoryName = await parcelCategory.findById(selectedParcelCategoryId).select('categoryName');
      newRide.rideInfo.selectedParcelCategory = selectedParcelCategoryName;
      newRide.rideInfo.selectedParcelCategoryId = selectedParcelCategoryId;
    }

    // Get vehicle type information before saving
    let vehicleTypeId = null;
    let vehicleTypeName = null;

    if (categoryNameLower === 'cab' && selectedCategoryId) {
      try {
        const car = await Car.findById(selectedCategoryId).populate('vehicleType');
        if (car && car.vehicleType) {
          vehicleTypeId = car.vehicleType._id;
          vehicleTypeName = car.vehicleType.name;
        }
      } catch (error) {
        console.error('Error fetching cab vehicle type:', error);
      }
    } else if (categoryNameLower === 'parcel' && selectedCategoryId) {
      try {
        const parcelVehicle = await ParcelVehicle.findById(selectedCategoryId).populate('parcelVehicleType');
        if (parcelVehicle && parcelVehicle.parcelVehicleType) {
          vehicleTypeId = parcelVehicle.parcelVehicleType._id;
          vehicleTypeName = parcelVehicle.parcelVehicleType.name;
        }
      } catch (error) {
        console.error('Error fetching parcel vehicle type:', error);
      }
    }

    // Store vehicle type information in ride
    if (vehicleTypeId && vehicleTypeName) {
      newRide.rideInfo.vehicleTypeId = vehicleTypeId;
      newRide.rideInfo.vehicleType = vehicleTypeName;
    }

    await newRide.save();

    // Update wallet transaction with rideId for wallet payments
    if (paymentType === 'wallet') {
      const wallet = await Wallet.findOne({ riderId });
      if (wallet && wallet.transactions.length > 0) {
        const lastTransaction = wallet.transactions[wallet.transactions.length - 1];
        lastTransaction.rideId = newRide._id;
        await wallet.save();
      }
    }

    // Add ride to staff's completed rides if booked by staff
    if (req.staff) {
      const OfflineStaff = require('../offline&agentBookingModels/offlineStaffModel');
      await OfflineStaff.findByIdAndUpdate(
        staffId,
        { $addToSet: { completedRides: newRide._id } }
      );
    }

    // console.log('📱 New ride booked:', newRide._id);

    // Emit socket event to drivers with EXTENDED rides only
    const io = req.app.get('io');
    const onlineDrivers = req.app.get('onlineDrivers');

    if (io && onlineDrivers) {
      const rideData = {
        rideId: newRide._id,
        categoryName: newRide.rideInfo ? newRide.rideInfo.categoryName : null,
        subcategoryName: newRide.rideInfo ? newRide.rideInfo.subcategoryName : null,
        subSubcategoryName: newRide.rideInfo ? newRide.rideInfo.subSubcategoryName : null,
        carType: newRide.rideInfo ? newRide.rideInfo.carType : null,
        selectedCategory: newRide.rideInfo ? newRide.rideInfo.selectedCategory : null,
        transmissionType: newRide.rideInfo ? newRide.rideInfo.transmissionType : null,
        selectedUsage: newRide.rideInfo?.selectedUsage,
        fromLocation: newRide.rideInfo?.fromLocation,
        toLocation: newRide.rideInfo?.toLocation,
        selectedDate: newRide.rideInfo?.selectedDate,
        selectedTime: newRide.rideInfo?.selectedTime,
        totalPayable: adjustedTotalPayable,
        status: 'BOOKED'
      };

      // Add vehicle type information to rideData
      if (vehicleTypeId && vehicleTypeName) {
        rideData.vehicleTypeId = vehicleTypeId;
        rideData.vehicleType = vehicleTypeName;
      }

      if (selectedCarCategoryName != null) {
        rideData.selectedCarCategory = selectedCarCategoryName;
      }

      if (selectedParcelCategoryName != null) {
        rideData.selectedParcelCategory = selectedParcelCategoryName;
        rideData.senderDetails = senderDetails;
        rideData.receiverDetails = receiverDetails;
      }

      // Get eligible drivers based on category
      let waitingDrivers = [];
      const categoryNameLower = categoryName.toLowerCase();

      if (categoryNameLower === 'driver') {
        // For driver category, use driverCategory field with vehicle type validation
        const driverQuery = {
          rideStatus: 'WAITING',
          isOnline: true,
          status: 'Approved',
          'personalInformation.category': categoryId,
          'personalInformation.subCategory': { $in: [subcategoryId] },
          driverCategory: { $in: [selectedCategoryId] } // Changed to $in for array search
        };
        
        // Add vehicle type validations if carTypeId and transmissionTypeId exist
        if (carTypeId) {
          driverQuery['drivingDetails.canDrive'] = { $in: [carTypeId] };
        }
        if (transmissionTypeId) {
          driverQuery['drivingDetails.vehicleType'] = { $in: [transmissionTypeId] };
        }
        
        waitingDrivers = await Driver.find(driverQuery).select('_id');
      } else if (categoryNameLower === 'cab' || categoryNameLower === 'parcel') {
        // For cab and parcel, find vehicles with matching modelType and get assignedTo drivers
        const vehicleField = categoryNameLower === 'cab' ? 'cabVehicleDetails.modelType' : 'parcelVehicleDetails.modelType';

        const vehicles = await Vehicle.find({
          [vehicleField]: selectedCategoryId,
          status: true,
          adminStatus: 'approved'
        }).select('assignedTo');


        const assignedDriverIds = vehicles.flatMap(vehicle => vehicle.assignedTo);

        if (assignedDriverIds.length > 0) {
          waitingDrivers = await Driver.find({
            _id: { $in: assignedDriverIds },
            rideStatus: 'WAITING',
            isOnline: true,
            status: 'Approved',
            'personalInformation.category': categoryId,
            'personalInformation.subCategory': { $in: [subcategoryId] },
            ownership: { $ne: 'Owner' }
          }).select('_id');
        }
      }

      console.log("waiting drivers", waitingDrivers)

      const waitingDriverIds = waitingDrivers.map(driver => driver._id.toString());

      console.log(`✅ Found ${waitingDriverIds.length} drivers with WAITING status and matching categories for ${categoryNameLower}`);

      // Send to online drivers who have WAITING rideStatus
      //console.log('ride data to send:', rideData);
      let sentCount = 0;
      Object.entries(onlineDrivers).forEach(([driverId, driverSocketData]) => {
        // Only send to drivers with WAITING status
        if (waitingDriverIds.includes(driverId)) {
          io.to(driverSocketData.socketId).emit('new-ride', rideData);
          sentCount++;
        }
      });

      console.log(`🚗 New ride ${newRide._id} sent to ${sentCount} available drivers (WAITING status + matching categories)`);

      // Send push notifications to eligible drivers only
      try {
        console.log(`🔍 Looking for eligible drivers from ${waitingDriverIds.length} waiting drivers`);

        const eligibleDrivers = await Driver.find({
          _id: { $in: waitingDriverIds },
          oneSignalPlayerId: { $ne: null, $exists: true }
        }).select('oneSignalPlayerId');

        console.log(`📱 Found ${eligibleDrivers.length} eligible drivers with OneSignal player IDs`);

        if (eligibleDrivers.length > 0) {
          const playerIds = eligibleDrivers.map(driver => driver.oneSignalPlayerId);

          console.log(`📤 Sending push notifications to player IDs:`, playerIds);


          // Convert time to 12-hour format
          const formatTo12Hour = (time24) => {
            const [hours, minutes] = time24.split(':');
            const hour = parseInt(hours);
            const ampm = hour >= 12 ? 'PM' : 'AM';
            const hour12 = hour % 12 || 12;
            return `${hour12}:${minutes} ${ampm}`;
          };

          const formattedTime = formatTo12Hour(newRide.rideInfo.selectedTime);
          const message = `${newRide.riderInfo.riderName} books a ${newRide.rideInfo.subcategoryName} ride  pick up on ${formattedSelectedDate.replace(/ /g, '/')} at ${formattedTime}.`;

          await NotificationService.sendToMultipleUsers(
            playerIds,
            'New Ride Available',
            message,
          );

          console.log(`✅ Push notification sent successfully to ${playerIds.length} eligible drivers`);
        } else {
          console.log(`❌ No eligible drivers found with OneSignal player IDs`);
        }
      } catch (notifError) {
        console.error('❌ Push notification error:', notifError);
      }
    } else {
      console.log('❌ Socket.io or onlineDrivers not available');
    }

    // ✅ Deduct referral balance if used
    const rider = await Rider.findById(riderId);
    if (rider && isReferralEarningUsed && referralEarningUsedAmount > 0) {
      rider.referralEarning.currentBalance -= referralEarningUsedAmount;
      if (rider.referralEarning.currentBalance < 0)
        rider.referralEarning.currentBalance = 0;

      // Add to history
      rider.referralEarning.history.push({
        rideId: newRide._id,
        amount: -referralEarningUsedAmount,
        type: "earning_used_for_book_ride"
      });

      await rider.save();
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

// booked rides
router.get("/current/my-rides", authMiddleware, async (req, res) => {
  try {
    // riderId comes from token (authMiddleware)
    const { riderId } = req.rider;

    // Find only rides with status = "BOOKED" sorted by createdAt desc
    const rides = await Ride.find({ riderId, status: { $in: ["BOOKED", "CONFIRMED"]} }).sort({ createdAt: -1 });

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
      riderId, status: { $in: ["ONGOING", "EXTENDED" , "REACHED"] }
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

// past rides
router.get("/past/my-rides", authMiddleware, async (req, res) => {
  try {
    // riderId comes from token (authMiddleware)
    const { riderId } = req.rider;

    // Find all rides for this rider sorted by createdAt desc
    const rides = await Ride.find({ riderId , status: { $in: ["COMPLETED", "CANCELLED"] } }).sort({ createdAt: -1 });

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

//give ride doc as per ride id for detail view
router.post("/bookingDetail", combinedAuthMiddleware, async (req, res) => {
  try {
    const { rideId } = req.body;

    if (!rideId) {
      return res.status(400).json({ message: "Ride ID is required" });
    }

    const ride = await Ride.findById(rideId);

    if (!ride) {
      return res.status(404).json({ message: "Ride not found" });
    }

    res.json({ success:true , data:ride });
  } catch (error) {
    console.error("Error fetching booking:", error);
    res.status(500).json({ success:false , message: "Server error", error: error.message });
  }
});

// Check cancellation charges for a ride
router.post("/booking/cancellation-charges", authMiddleware, async (req, res) => {
  try {
    const { rideId } = req.body;

    if (!rideId) {
      return res.status(400).json({ message: "Ride ID is required" });
    }

    const ride = await Ride.findOne({
      _id: rideId,
      status: { $in: ["BOOKED", "CONFIRMED", "REACHED"] }
    });

    if (!ride) {
      return res.status(400).json({
        success: false,
        message: "Ride not found or cannot be cancelled",
        cancellationCharges: 0
      });
    }

    const { categoryName, categoryId, subcategoryId, selectedDate, selectedTime, selectedCategoryId } = ride.rideInfo;
    const bookingDriverId = ride.driverId;
    const categoryNameLower = categoryName.toLowerCase();
    
    let cancellationDetails = null;

    if (categoryNameLower === 'driver') {
      cancellationDetails = await driverRideCost.findOne({
        category: categoryId,
        subcategory: subcategoryId,
        priceCategory: selectedCategoryId
      }).select('cancellationFee cancellationBufferTime');
    } else if (categoryNameLower === 'cab') {
      cancellationDetails = await cabRideCost.findOne({
        category: categoryId,
        subcategory: subcategoryId,
        car: selectedCategoryId
      }).select('cancellationFee cancellationBufferTime');
    } else if (categoryNameLower === 'parcel') {
      cancellationDetails = await parcelRideCost.findOne({
        category: categoryId,
        subcategory: subcategoryId
      }).select('cancellationFee cancellationBufferTime');
    }

    const cancellationFee = cancellationDetails?.cancellationFee || 0;
    const cancellationBufferTime = cancellationDetails?.cancellationBufferTime || 0;

    let shouldApplyCharges = false;
    let reason = '';

    if (cancellationFee > 0) {
      // Check if driver has reached location
      if (bookingDriverId) {
        const driver = await Driver.findById(bookingDriverId);
        if (driver && driver.rideStatus === 'REACHED') {
          shouldApplyCharges = true;
          reason = 'Driver already reached pickup location';
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
          reason = `Late cancellation (${cancellationBufferTime} min window exceeded)`;
        }
      }
    }

    res.json({
      success: true,
      cancellationCharges: shouldApplyCharges ? cancellationFee : 0,
      reason: shouldApplyCharges ? reason : 'Free cancellation',
    });

  } catch (error) {
    console.error("Error checking cancellation charges:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error", 
      cancellationCharges: 0,
      error: error.message 
    });
  }
});

//for cancel ride using ride id
router.post("/booking/cancel", authMiddleware, async (req, res) => {
  try {
    const { rideId , Reason } = req.body;
    const riderId = req.rider?.riderId;

    if (!rideId) {
      return res.status(400).json({ message: "Booking ID is required" });
    }

    // First check if ride exists and can be cancelled
    const rideToCancel = await Ride.findOne({
      _id: rideId,
      status: { $in: ["BOOKED", "CONFIRMED", "REACHED"] }
    });

    if (!rideToCancel) {
      return res.status(400).json({
        success: false,
        message: "Booking cannot be cancelled. Current status does not allow cancellation."
      });
    }

    // Extract required data from rideToCancel
    const { categoryName, categoryId, subcategoryId, selectedDate, selectedTime, selectedCategoryId } = rideToCancel.rideInfo;
    const bookingDriverId = rideToCancel.driverId;

    // Check category and fetch cancellation details from appropriate model
    const categoryNameLower = categoryName.toLowerCase();
    let cancellationDetails = null;

    try {
      if (categoryNameLower === 'driver') {
        cancellationDetails = await driverRideCost.findOne({
          category: categoryId,
          subcategory: subcategoryId,
          priceCategory: selectedCategoryId
        }).select('cancellationFee cancellationBufferTime');
      } else if (categoryNameLower === 'cab') {
        cancellationDetails = await cabRideCost.findOne({
          category: categoryId,
          subcategory: subcategoryId,
          car: selectedCategoryId
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
            // Add transaction to wallet for full deduction
            wallet.transactions.push({
              amount: cancellationFee,
              status: 'paid',
              type: 'cancellation_charges',
              description: description,
              rideId: rideId,
              paidAt: new Date()
            });

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

            // console.log(`Deducted full cancellation fee: ${cancellationFee} from wallet`);
          } else {
            // Add transaction to wallet for partial deduction
            if (currentBalance > 0) {
              wallet.transactions.push({
                amount: currentBalance,
                status: 'paid',
                type: 'cancellation_charges',
                description: `${description} (Partial payment)`,
                rideId: rideId,
                paidAt: new Date()
              });
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

            // console.log(`Deducted ${currentBalance} from wallet, stored ${remainingCharges} as pending charges`);
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

          //console.log(`No wallet found, stored ${cancellationFee} as pending charges`);
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

        }
      }


    } catch (modelError) {
      console.error('Error processing cancellation:', modelError);
    }

    // ✅ Now update the ride status to CANCELLED after successful processing
    const updatedBooking = await Ride.findByIdAndUpdate(
      rideId,
      { status: "CANCELLED", whoCancel: "Rider" , cancellationReason : Reason},
      { new: true }
    );

    // ✅ Refund referral earning if used
    if (rideToCancel.isReferralEarningUsed && rideToCancel.referralEarningUsedAmount > 0) {
      const rider = await Rider.findById(riderId);
      if (rider) {
        rider.referralEarning.currentBalance += rideToCancel.referralEarningUsedAmount;

        // Add to history
        rider.referralEarning.history.push({
          rideId: rideToCancel._id,
          amount: rideToCancel.referralEarningUsedAmount,
          type: "refund"
        });

        await rider.save();
      }
    }

    // Update driver rideStatus to WAITING if driver is assigned
    if (bookingDriverId) {
      await Driver.findByIdAndUpdate(bookingDriverId, { rideStatus: 'WAITING' });

      // Send cancellation notification to the assigned driver
      try {
        const driver = await Driver.findById(bookingDriverId);
        if (driver) {
          await NotificationService.sendAndStoreDriverNotification(
            bookingDriverId,
            driver.oneSignalPlayerId,
            'Trip Cancelled',
            `${rideToCancel.riderInfo.riderName} has cancelled the ${rideToCancel.rideInfo.subcategoryName} trip`,
            'ride_cancelled',
            {},
            null,
            rideId
          );
        }
      } catch (notifError) {
        console.error('Cancellation notification error:', notifError);
      }
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



    if (!rideId) {
      return res.status(400).json({ message: "Ride ID is required" });
    }

    // Get ride details for wallet balance check
    const ride = await Ride.findById(rideId);
    if (!ride) {
      return res.status(404).json({ message: "Ride not found" });
    }

    // Check wallet balance before confirming ride
    try {
      const balanceCheck = await checkDriverWalletBalance(
        driverId,
        ride.rideInfo.categoryId,
        ride.rideInfo.subcategoryId,
        ride.rideInfo.subSubcategoryId
      );

      if (!balanceCheck.success) {
        return res.status(402).json({
          success: false,
          message: balanceCheck.message,
          requiredBalance: balanceCheck.requiredBalance,
          currentBalance: balanceCheck.currentBalance,
          errorCode: 'INSUFFICIENT_WALLET_BALANCE'
        });
      }
    } catch (walletError) {
      console.error('Wallet balance check error:', walletError);
      return res.status(500).json({
        success: false,
        message: 'Failed to validate wallet balance'
      });
    }

    const driverInfo = await Driver.findById(driverId);
    if (!driverInfo) {
      return res.status(404).json({ message: "Driver not found" });
    }

    const driverName = driverInfo.personalInformation?.fullName



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

    // Send notification to rider
    try {
      const rider = await Rider.findById(updatedRide.riderId);
      if (rider && rider.oneSignalPlayerId) {
        const rideDate = new Date(updatedRide.rideInfo.selectedDate);
        const formattedDate = rideDate.toLocaleDateString('en-GB');
        
        // Convert 24-hour time to 12-hour format with AM/PM
        const [hours, minutes] = updatedRide.rideInfo.selectedTime.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const hour12 = hour % 12 || 12;
        const formattedTime = `${hour12}:${minutes} ${ampm}`;
        
        const message = `Your ride has been confirmed by ${driverName}. Ready at ${formattedDate} on ${formattedTime}`;
        
        await NotificationService.sendAndStoreRiderNotification(
          updatedRide.riderId,
          rider.oneSignalPlayerId,
          'Ride Confirmed',
          message,
          'ride_confirmed',
          {},
          updatedRide.rideInfo?.categoryId || null,
          rideId
        );
        console.log('Rider notification sent for ride confirmation',rider.oneSignalPlayerId);
      }
    } catch (notifError) {
      console.error('Error sending rider notification:', notifError);
    }

    // Emit socket event to remove ride from all drivers
    const io = req.app.get('io');
    if (io) {
      io.to('drivers').emit('ride-assigned', {
        rideId: rideId,
        driverId: driverId
      });
      //console.log('🚗 Ride assigned event emitted:', rideId);
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

    // ✅ Get current date and validate ride day
    const currentDate = new Date().toISOString().split('T')[0];
    const subcategoryName = ride.rideInfo.subcategoryName?.toLowerCase() || '';

    // ✅ Date validation
    if (subcategoryName.includes('weekly') || subcategoryName.includes('monthly')) {
      const remainingDates = ride.rideInfo.remainingDates || [];
      if (!remainingDates.includes(currentDate)) {
        return res.status(400).json({
          success: false,
          message: "You can only update status to REACHED on scheduled ride days"
        });
      }
    } else {
      const selectedDate = new Date(ride.rideInfo.selectedDate).toISOString().split('T')[0];
      if (selectedDate !== currentDate) {
        return res.status(400).json({
          success: false,
          message: "You can only update status to REACHED on the scheduled ride date"
        });
      }
    }

    // ✅ Get current time in HH:MM:SS format
    const driverReachTime = new Date().toLocaleTimeString("en-GB", {
      timeZone: "Asia/Kolkata",
    });
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

    // Send notification to rider
    try {
      const rider = await Rider.findById(updatedRide.riderId);
      if (rider && rider.oneSignalPlayerId) {
        const driverName = driver.personalInformation?.fullName || 'Your driver';
        const message = `${driverName} has reached your pickup location. Please come out!`;
        
        await NotificationService.sendAndStoreRiderNotification(
          updatedRide.riderId,
          rider.oneSignalPlayerId,
          'Driver Reached',
          message,
          'driver_reached',
          {},
          updatedRide.rideInfo?.categoryId || null,
          rideId
        );
      }
    } catch (notifError) {
      console.error('Error sending rider notification:', notifError);
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



    if (!rideId) {
      return res.status(400).json({ message: "Ride ID is required" });
    }

    const ride = await Ride.findById(rideId);
    if (!ride) {
      return res.status(404).json({ message: "Ride not found" });
    }

    // ✅ Get current date and validate ride day
    const currentDate = new Date().toISOString().split('T')[0];
    const subcategoryName = ride.rideInfo.subcategoryName?.toLowerCase() || '';

    // ✅ Date validation
    if (subcategoryName.includes('weekly') || subcategoryName.includes('monthly')) {
      const remainingDates = ride.rideInfo.remainingDates || [];
      if (!remainingDates.includes(currentDate)) {
        return res.status(400).json({
          success: false,
          message: "You can only update status to ONGOING on scheduled ride days"
        });
      }
    } else {
      const selectedDate = new Date(ride.rideInfo.selectedDate).toISOString().split('T')[0];
      if (selectedDate !== currentDate) {
        return res.status(400).json({
          success: false,
          message: "You can only update status to ONGOING on the scheduled ride date"
        });
      }
    }

    const driverInfo = await Driver.findById(driverId);
    if (!driverInfo) {
      return res.status(404).json({ message: "Driver not found" });
    }

    // ✅ Get current time in HH:MM:SS format
    const rideStartTime = new Date().toLocaleTimeString("en-GB", {
      timeZone: "Asia/Kolkata",
    });
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

    const originalDates = currentRide.rideInfo.selectedDates || [];

    // ✅ Only validate selectedDates for weekly/monthly rides
    const subcategoryName = currentRide.rideInfo.subcategoryName?.toLowerCase() || '';
    if (subcategoryName.includes('weekly') || subcategoryName.includes('monthly')) {
      // ✅ Validate selectedDates array
      if (!Array.isArray(selectedDates) || selectedDates.length === 0) {
        return res.status(400).json({ success: false, message: "selectedDates must be a non-empty array" });
      }

      // ✅ Check for invalid dates
      const invalidDates = selectedDates.filter((d) => !originalDates.includes(d));
      if (invalidDates.length > 0) {
        return res.status(400).json({
          success: false,
          message: `These dates are not part of this ride: ${invalidDates.join(", ")}`,
        });
      }
    }

    // ✅ Compute remaining and cancelled dates
    const remainingDates = originalDates.filter((d) => !(selectedDates || []).includes(d));
    const remainingNoOfDays = remainingDates.length;
    const cancelDays = (selectedDates || []).length;

    // 🔹 Process cancellation charges BEFORE branching
    const driver = await Driver.findById(driverId);
    if (driver) {
      // Get cancellation charges for the ride
      const { categoryName, categoryId, subcategoryId, selectedCategoryId, subcategoryName } = currentRide.rideInfo;
      const categoryNameLower = categoryName.toLowerCase();
      let cancellationDetails = null;

      try {
        if (categoryNameLower === 'driver') {
          cancellationDetails = await driverRideCost.findOne({
            category: categoryId,
            subcategory: subcategoryId,
            priceCategory: selectedCategoryId
          }).select('driverCancellationCharges');
        } else if (categoryNameLower === 'cab') {
          cancellationDetails = await cabRideCost.findOne({
            category: categoryId,
            subcategory: subcategoryId,
            car: selectedCategoryId
          }).select('driverCancellationCharges');
        } else if (categoryNameLower === 'parcel') {
          cancellationDetails = await parcelRideCost.findOne({
            category: categoryId,
            subcategory: subcategoryId
          }).select('driverCancellationCharges');
        }

        const baseCancellationCharges = cancellationDetails?.driverCancellationCharges || 0;
        const subcategoryNameLower = subcategoryName.toLowerCase();
        const cancellationCharges = (subcategoryNameLower.includes('weekly') || subcategoryNameLower.includes('monthly'))
          ? baseCancellationCharges * selectedDates.length
          : baseCancellationCharges;

        if (cancellationCharges > 0) {
          // Check if driver has available cancellation credits
          if (driver.cancellationRideCredits > 0) {
            // Use one credit
            driver.cancellationRideCredits -= 1;
            await driver.save();

          } else {
            // No credits left, check wallet and deduct
            let wallet = await driverWallet.findOne({ driverId });

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

            const currentBalance = wallet.balance;

            if (currentBalance >= cancellationCharges) {
              wallet.balance -= cancellationCharges;
              wallet.totalDeductions += cancellationCharges;
              wallet.transactions.push({
                type: "cancellation_charge",
                amount: cancellationCharges,
                description: "Cancellation charges for ride cancellation",
                status: "completed",
              });
              await wallet.save();

            } else {
              const remainingCharges = cancellationCharges - currentBalance;

              if (currentBalance > 0) {
                wallet.totalDeductions += currentBalance;
                wallet.balance = 0;
                wallet.transactions.push({
                  type: "cancellation_charge",
                  amount: currentBalance,
                  description: "Partial cancellation charges deducted",
                  status: "completed",
                });
                await wallet.save();
              }

              driver.unclearedCancellationCharges += remainingCharges;
              await driver.save();

            }
          }
        }
      } catch (error) {
        console.error('Error processing cancellation charges:', error);
      }
    }

    // ✅ Full cancellation
    if (remainingNoOfDays === 0) {
      await Ride.findByIdAndUpdate(rideId, {
        status: "CANCELLED",
        whoCancel: "Driver",
        "rideInfo.remainingDates": [],
        "rideInfo.selectedDates": [],
        "rideInfo.SelectedDays": 0,
        cancellationReason:reason
      });

      // Also update driver status to WAITING again
      if (driverId) {
        await Driver.findByIdAndUpdate(driverId, { rideStatus: "WAITING" });
      }

      // ✅ Create new cancelled ride document for full cancellation
      const isWeeklyMonthly = subcategoryName.includes('weekly') || subcategoryName.includes('monthly');
      const newSelectedDate = isWeeklyMonthly
        ? (currentRide.rideInfo.selectedDates && currentRide.rideInfo.selectedDates.length > 0
          ? currentRide.rideInfo.selectedDates[0]
          : currentRide.rideInfo.selectedDate)
        : currentRide.rideInfo.selectedDate;

      const newCancelledRide = new Ride({
        riderId: currentRide.riderId,
        riderInfo: {
          riderName: currentRide.riderInfo.riderName,
          riderMobile: currentRide.riderInfo.riderMobile,
        },
        ...(currentRide.staffId && {
          staffId: currentRide.staffId,
          staffInfo: currentRide.staffInfo
        }),
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
          selectedDate: newSelectedDate,
          selectedTime: currentRide.rideInfo.selectedTime,
          selectedUsage: currentRide.rideInfo.selectedUsage,
          transmissionType: currentRide.rideInfo.transmissionType,
          SelectedDays: currentRide.rideInfo.SelectedDays,
          selectedDates: currentRide.rideInfo.selectedDates,
          remainingDates: currentRide.rideInfo.selectedDates,
          driverCharges: currentRide.rideInfo.driverCharges,
          insuranceCharges: currentRide.rideInfo.insuranceCharges,
          cancellationCharges: currentRide.rideInfo.cancellationCharges,
          discount: currentRide.rideInfo.discount,
          gstCharges: currentRide.rideInfo.gstCharges,
          subtotal: currentRide.rideInfo.subtotal,
          adminCharges: currentRide.rideInfo.adminCharges,
        },
        isReferralEarningUsed: currentRide.isReferralEarningUsed || false,
        referralEarningUsedAmount: currentRide.referralEarningUsedAmount || 0,
        totalPayable: currentRide.totalPayable,
        paymentType: currentRide.paymentType,
        bookedBy: currentRide.bookedBy || "USER",
        status: "BOOKED",
        cancellationReason: reason || "Cancelled by driver",
      });

      await newCancelledRide.save();

      // ✅ Emit socket event for new ride
      const io = req.app.get('io');
      const onlineDrivers = req.app.get('onlineDrivers');

      if (io && onlineDrivers) {
        // Determine selectedDate based on ride type for full cancellation
        const isWeeklyMonthly = subcategoryName.includes('weekly') || subcategoryName.includes('monthly');
        const socketSelectedDate = isWeeklyMonthly
          ? (currentRide.rideInfo.selectedDates && currentRide.rideInfo.selectedDates.length > 0
            ? currentRide.rideInfo.selectedDates[0]
            : currentRide.rideInfo.selectedDate)
          : currentRide.rideInfo.selectedDate;

        // Get vehicle type information for cancelled ride
        let vehicleTypeId = null;
        let vehicleTypeName = null;

        const categoryNameLower = currentRide.rideInfo.categoryName.toLowerCase();
        if (categoryNameLower === 'cab' && currentRide.rideInfo.selectedCategoryId) {
          try {
            const car = await Car.findById(currentRide.rideInfo.selectedCategoryId).populate('vehicleType');
            if (car && car.vehicleType) {
              vehicleTypeId = car.vehicleType._id;
              vehicleTypeName = car.vehicleType.name;
            }
          } catch (error) {
            console.error('Error fetching cab vehicle type:', error);
          }
        } else if (categoryNameLower === 'parcel' && currentRide.rideInfo.selectedCategoryId) {
          try {
            const parcelVehicle = await ParcelVehicle.findById(currentRide.rideInfo.selectedCategoryId).populate('parcelVehicleType');
            if (parcelVehicle && parcelVehicle.parcelVehicleType) {
              vehicleTypeId = parcelVehicle.parcelVehicleType._id;
              vehicleTypeName = parcelVehicle.parcelVehicleType.name;
            }
          } catch (error) {
            console.error('Error fetching parcel vehicle type:', error);
          }
        }

        const rideData = {
          rideId: newCancelledRide._id,
          categoryName: currentRide.rideInfo.categoryName,
          subcategoryName: currentRide.rideInfo.subcategoryName,
          subSubcategoryName: currentRide.rideInfo.subSubcategoryName,
          carType: currentRide.rideInfo.carType,
          transmissionType: currentRide.rideInfo.transmissionType,
          selectedUsage: currentRide.rideInfo.selectedUsage,
          fromLocation: currentRide.rideInfo.fromLocation,
          toLocation: currentRide.rideInfo.toLocation,
          selectedDate: socketSelectedDate,
          selectedTime: currentRide.rideInfo.selectedTime,
          totalPayable: currentRide.totalPayable,
          status: 'BOOKED'
        };

        // Add vehicle type information to rideData
        if (vehicleTypeId && vehicleTypeName) {
          rideData.vehicleTypeId = vehicleTypeId;
          rideData.vehicleType = vehicleTypeName;
        }

        // Get eligible drivers based on category
        let waitingDrivers = [];


        if (categoryNameLower === 'driver') {
          const driverQuery = {
            rideStatus: 'WAITING',
            isOnline: true,
            status: 'Approved',
            'personalInformation.category': currentRide.rideInfo.categoryId,
            'personalInformation.subCategory': { $in: [currentRide.rideInfo.subcategoryId] },
            driverCategory: currentRide.rideInfo.selectedCategoryId
          };
          
          // Add vehicle type validations if carTypeId and transmissionTypeId exist
          if (currentRide.rideInfo.carTypeId) {
            driverQuery['drivingDetails.canDrive'] = { $in: [currentRide.rideInfo.carTypeId] };
          }
          if (currentRide.rideInfo.transmissionTypeId) {
            driverQuery['drivingDetails.vehicleType'] = { $in: [currentRide.rideInfo.transmissionTypeId] };
          }
          
          waitingDrivers = await Driver.find(driverQuery).select('_id');
        } else if (categoryNameLower === 'cab' || categoryNameLower === 'parcel') {
          const vehicleField = categoryNameLower === 'cab' ? 'cabVehicleDetails.modelType' : 'parcelVehicleDetails.modelType';

          const vehicles = await Vehicle.find({
            [vehicleField]: currentRide.rideInfo.selectedCategoryId,
            status: true,
            adminStatus: 'approved'
          }).select('assignedTo');

          const assignedDriverIds = vehicles.flatMap(vehicle => vehicle.assignedTo);

          if (assignedDriverIds.length > 0) {
            waitingDrivers = await Driver.find({
              _id: { $in: assignedDriverIds },
              rideStatus: 'WAITING',
              isOnline: true,
              status: 'Approved',
              'personalInformation.category': currentRide.rideInfo.categoryId,
              'personalInformation.subCategory': { $in: [currentRide.rideInfo.subcategoryId] },
              ownership: { $ne: 'Owner' }
            }).select('_id');
          }
        }

        const waitingDriverIds = waitingDrivers.map(driver => driver._id.toString());

        let sentCount = 0;
        Object.entries(onlineDrivers).forEach(([driverId, driverSocketData]) => {
          if (waitingDriverIds.includes(driverId)) {
            io.to(driverSocketData.socketId).emit('new-ride', rideData);
            sentCount++;
          }
        });


      }

      // Send notification to rider for full cancellation
      try {
        const rider = await Rider.findById(currentRide.riderId);
        if (rider && rider.oneSignalPlayerId) {
          const driverName = driver.personalInformation?.fullName || 'Your driver';
          const isWeeklyMonthly = subcategoryName.includes('weekly') || subcategoryName.includes('monthly');
          
          let message;
          if (isWeeklyMonthly) {
            const formattedDates = currentRide.rideInfo.selectedDates.map(date => {
              const dateObj = new Date(date);
              return dateObj.toLocaleDateString('en-GB');
            }).join(', ');
            message = `${driverName} cancelled your full ride for dates: ${formattedDates}. Don't worry, a new driver will be assigned shortly.`;
          } else {
            const rideDate = new Date(currentRide.rideInfo.selectedDate);
            const formattedDate = rideDate.toLocaleDateString('en-GB');
            message = `${driverName} cancelled your ride scheduled for ${formattedDate}. Don't worry, a new driver will be assigned shortly.`;
          }
          
          await NotificationService.sendToUser(
            rider.oneSignalPlayerId,
            'Ride Cancelled',
            message
          );
          
          await RiderNotification.create({
            riderId: currentRide.riderId,
            rideId: currentRide._id,
            title: 'Ride Cancelled',
            message: message,
            categoryId: currentRide.rideInfo?.categoryId || null,
            type: 'ride_cancelled'
          });
        }
      } catch (notifError) {
        console.error('Error sending rider notification:', notifError);
      }

      return res.status(200).json({
        success: true,
        message: "Full ride cancelled successfully",
        cancelledRideId: newCancelledRide._id
      });
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
    const partialIsWeeklyMonthly = subcategoryName.includes('weekly') || subcategoryName.includes('monthly');
    const partialNewSelectedDate = partialIsWeeklyMonthly
      ? (selectedDates && selectedDates.length > 0 ? selectedDates[0] : currentRide.rideInfo.selectedDate)
      : currentRide.rideInfo.selectedDate;

    const newCancelledRide = new Ride({
      riderId: currentRide.riderId,
      riderInfo: {
        riderName: currentRide.riderInfo.riderName,
        riderMobile: currentRide.riderInfo.riderMobile,
      },
      ...(currentRide.staffId && {
        staffId: currentRide.staffId,
        staffInfo: currentRide.staffInfo
      }),
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
        selectedDate: partialNewSelectedDate,
        selectedTime: currentRide.rideInfo.selectedTime,
        selectedUsage: currentRide.rideInfo.selectedUsage,
        transmissionType: currentRide.rideInfo.transmissionType,
        SelectedDays: cancelDays,            // ✅ number of cancelled days
        selectedDates,                       // ✅ cancelled days
        remainingDates: selectedDates,                  // ✅ none remain in cancelled record
        driverCharges: cancelledChargesForNewRide.driverCharges,
        insuranceCharges: cancelledChargesForNewRide.insuranceCharges,
        cancellationCharges: cancelledChargesForNewRide.cancellationCharges,
        discount: cancelledChargesForNewRide.discountApplied,
        gstCharges: cancelledChargesForNewRide.gstCharges,
        subtotal: cancelledChargesForNewRide.subtotal,
        adminCharges: cancelledChargesForNewRide.adminCommissionAdjusted,
      },
      isReferralEarningUsed: currentRide.isReferralEarningUsed || false,
      referralEarningUsedAmount: currentRide.referralEarningUsedAmount || 0,
      totalPayable: cancelledChargesForNewRide.totalPayable,
      paymentType: currentRide.paymentType,
      bookedBy: currentRide.bookedBy || "USER",
      status: "BOOKED",
      cancellationReason: reason || "Cancelled by user",
    });

    await newCancelledRide.save();

    // ✅ Emit socket event for new cancelled ride
    const io = req.app.get('io');
    const onlineDrivers = req.app.get('onlineDrivers');

    if (io && onlineDrivers) {
      // Determine selectedDate based on ride type
      const isWeeklyMonthly = subcategoryName.includes('weekly') || subcategoryName.includes('monthly');
      const socketSelectedDate = isWeeklyMonthly
        ? (selectedDates && selectedDates.length > 0 ? selectedDates[0] : currentRide.rideInfo.selectedDate)
        : currentRide.rideInfo.selectedDate;

      // Get vehicle type information for partial cancelled ride
      let vehicleTypeId = null;
      let vehicleTypeName = null;


      if (categoryNameLower === 'cab' && currentRide.rideInfo.selectedCategoryId) {
        try {
          const car = await Car.findById(currentRide.rideInfo.selectedCategoryId).populate('vehicleType');
          if (car && car.vehicleType) {
            vehicleTypeId = car.vehicleType._id;
            vehicleTypeName = car.vehicleType.name;
          }
        } catch (error) {
          console.error('Error fetching cab vehicle type:', error);
        }
      } else if (categoryNameLower === 'parcel' && currentRide.rideInfo.selectedCategoryId) {
        try {
          const parcelVehicle = await ParcelVehicle.findById(currentRide.rideInfo.selectedCategoryId).populate('parcelVehicleType');
          if (parcelVehicle && parcelVehicle.parcelVehicleType) {
            vehicleTypeId = parcelVehicle.parcelVehicleType._id;
            vehicleTypeName = parcelVehicle.parcelVehicleType.name;
          }
        } catch (error) {
          console.error('Error fetching parcel vehicle type:', error);
        }
      }

      const rideData = {
        rideId: newCancelledRide._id,
        categoryName: currentRide.rideInfo.categoryName,
        subcategoryName: currentRide.rideInfo.subcategoryName,
        subSubcategoryName: currentRide.rideInfo.subSubcategoryName,
        carType: currentRide.rideInfo.carType,
        transmissionType: currentRide.rideInfo.transmissionType,
        selectedUsage: currentRide.rideInfo.selectedUsage,
        fromLocation: currentRide.rideInfo.fromLocation,
        toLocation: currentRide.rideInfo.toLocation,
        selectedDate: socketSelectedDate,
        selectedTime: currentRide.rideInfo.selectedTime,
        totalPayable: cancelledChargesForNewRide.totalPayable,
        status: 'BOOKED'
      };

      // Add vehicle type information to rideData
      if (vehicleTypeId && vehicleTypeName) {
        rideData.vehicleTypeId = vehicleTypeId;
        rideData.vehicleType = vehicleTypeName;
      }

      // Get eligible drivers based on category
      let waitingDrivers = [];
      const categoryNameLower = currentRide.rideInfo.categoryName.toLowerCase();

      if (categoryNameLower === 'driver') {
        const driverQuery = {
          rideStatus: 'WAITING',
          isOnline: true,
          status: 'Approved',
          'personalInformation.category': currentRide.rideInfo.categoryId,
          'personalInformation.subCategory': { $in: [currentRide.rideInfo.subcategoryId] },
          driverCategory: { $in: [currentRide.rideInfo.selectedCategoryId] } // Changed to $in for array search
        };
        
        // Add vehicle type validations if carTypeId and transmissionTypeId exist
        if (currentRide.rideInfo.carTypeId) {
          driverQuery['drivingDetails.canDrive'] = { $in: [currentRide.rideInfo.carTypeId] };
        }
        if (currentRide.rideInfo.transmissionTypeId) {
          driverQuery['drivingDetails.vehicleType'] = { $in: [currentRide.rideInfo.transmissionTypeId] };
        }
        
        waitingDrivers = await Driver.find(driverQuery).select('_id');
      } else if (categoryNameLower === 'cab' || categoryNameLower === 'parcel') {
        const vehicleField = categoryNameLower === 'cab' ? 'cabVehicleDetails.modelType' : 'parcelVehicleDetails.modelType';

        const vehicles = await Vehicle.find({
          [vehicleField]: currentRide.rideInfo.selectedCategoryId,
          status: true,
          adminStatus: 'approved'
        }).select('assignedTo');

        const assignedDriverIds = vehicles.flatMap(vehicle => vehicle.assignedTo);

        if (assignedDriverIds.length > 0) {
          waitingDrivers = await Driver.find({
            _id: { $in: assignedDriverIds },
            rideStatus: 'WAITING',
            isOnline: true,
            status: 'Approved',
            'personalInformation.category': currentRide.rideInfo.categoryId,
            'personalInformation.subCategory': { $in: [currentRide.rideInfo.subcategoryId] },
            ownership: { $ne: 'Owner' }
          }).select('_id');
        }
      }

      const waitingDriverIds = waitingDrivers.map(driver => driver._id.toString());

      let sentCount = 0;
      Object.entries(onlineDrivers).forEach(([driverId, driverSocketData]) => {
        if (waitingDriverIds.includes(driverId)) {
          io.to(driverSocketData.socketId).emit('new-ride', rideData);
          sentCount++;
        }
      });


    }

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

    // Send notification to rider for partial cancellation
    try {
      const rider = await Rider.findById(currentRide.riderId);
      if (rider && rider.oneSignalPlayerId) {
        const driverName = driver.personalInformation?.fullName || 'Your driver';
        const formattedDates = selectedDates.map(date => {
          const dateObj = new Date(date);
          return dateObj.toLocaleDateString('en-GB');
        }).join(', ');
        
        const message = `${driverName} cancelled your ride for these dates: ${formattedDates}. Don't worry, a new driver will be assigned for those dates shortly.`;
        
        await NotificationService.sendToUser(
          rider.oneSignalPlayerId,
          'Partial Ride Cancelled',
          message
        );
        
        await RiderNotification.create({
          riderId: currentRide.riderId,
          rideId: currentRide._id,
          title: 'Partial Ride Cancelled',
          message: message,
          type: 'partial_ride_cancelled',
          
        });
      }
    } catch (notifError) {
      console.error('Error sending rider notification:', notifError);
    }

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



    if (!rideId) {
      return res.status(400).json({ message: "Ride ID is required" });
    }

    const ride = await Ride.findById(rideId);
    if (!ride) {
      return res.status(404).json({ message: "Ride not found" });
    }

    // ✅ Get current date and validate ride day
    const currentDate = new Date().toISOString().split('T')[0];
    const subcategoryName = ride.rideInfo.subcategoryName?.toLowerCase() || '';

    // ✅ Date validation
    if (subcategoryName.includes('weekly') || subcategoryName.includes('monthly')) {
      const remainingDates = ride.rideInfo.remainingDates || [];
      if (!remainingDates.includes(currentDate)) {
        return res.status(400).json({
          success: false,
          message: "You can only extend ride on scheduled ride days"
        });
      }
    } else {
      const selectedDate = new Date(ride.rideInfo.selectedDate).toISOString().split('T')[0];
      if (selectedDate !== currentDate) {
        return res.status(400).json({
          success: false,
          message: "You can only extend ride on the scheduled ride date"
        });
      }
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

    // Send notification to rider
    try {
      const rider = await Rider.findById(updatedRide.riderId);
      if (rider && rider.oneSignalPlayerId) {
        const message = `${driverName} has extended your ride. You may experience additional charges based on extra time or distance.`;
        
        await NotificationService.sendAndStoreRiderNotification(
          updatedRide.riderId,
          rider.oneSignalPlayerId,
          'Ride Extended',
          message,
          'ride_extended',
          {},
          updatedRide.rideInfo?.categoryId,
          updatedRide._id
        );
      }
    } catch (notifError) {
      console.error('Error sending rider notification:', notifError);
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

router.post("/driver/complete", driverAuthMiddleware, async (req, res) => {
  try {
    const { rideId } = req.body;
    const driverId = req.driver?.driverId;
    const driverMobile = req.driver?.mobile;



    if (!rideId) {
      return res.status(400).json({ message: "Ride ID is required" });
    }

    // 🔹 Fetch driver info
    const driverInfo = await Driver.findById(driverId);
    if (!driverInfo) {
      return res.status(404).json({ message: "Driver not found" });
    }

    const driverName = driverInfo.personalInformation?.fullName;

    // Get ride data before updating
    const currentRide = await Ride.findById(rideId);
    if (!currentRide) {
      return res.status(404).json({ message: "Ride not found" });
    }

    // 📅 Date validation
    const currentDate = new Date().toISOString().split('T')[0];
    const subcategoryName = currentRide.rideInfo.subcategoryName?.toLowerCase() || '';

    if (subcategoryName.includes('weekly') || subcategoryName.includes('monthly')) {
      const selectedDates = currentRide.rideInfo.selectedDates || [];
      const completedDates = currentRide.rideInfo.completedDates || [];

      if (selectedDates.length > 0 && completedDates.length > 0) {
        if (JSON.stringify([...selectedDates].sort()) !== JSON.stringify([...completedDates].sort())) {
          return res.status(400).json({
            message: "Cannot complete ride. Selected dates and completed dates must match.",
            selectedDates,
            completedDates
          });
        }
      }
    } else {
      const selectedDate = new Date(currentRide.rideInfo.selectedDate).toISOString().split('T')[0];
      if (selectedDate !== currentDate) {
        return res.status(400).json({
          success: false,
          message: "You can only complete ride on the scheduled ride date"
        });
      }
    }

    // 🔹 Update ride to COMPLETED
    const updatedRide = await Ride.findOneAndUpdate(
      { _id: rideId, status: { $in: ["ONGOING", "EXTENDED"] } },
      {
        status: "COMPLETED",
        driverId,
        driverInfo: { driverName, driverMobile }
      },
      { new: true }
    );

    if (!updatedRide) {
      return res.status(400).json({ message: "Ride already completed or not found" });
    }

    // 🔹 Update driver status
    await Driver.findByIdAndUpdate(driverId, {
      rideStatus: "WAITING",
      $push: { completedRides: rideId }
    });

    // Add ride to staff's completed rides if ride was booked by staff
    if (updatedRide.staffId) {
      const OfflineStaff = require('../offline&agentBookingModels/offlineStaffModel');
      await OfflineStaff.findByIdAndUpdate(
        updatedRide.staffId,
        { $addToSet: { completedRides: rideId } }
      );
    }

    // 🔹 Reset rider’s uncleared cancellation charges
    const rider = await Rider.findById(updatedRide.riderId);
    if (rider) {
      rider.unclearedCancellationCharges = 0;
      await rider.save();

      // 💰 REFERRAL EARNING LOGIC - Award referrer on ride completion
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
                (ref) => ref.riderId.toString() === updatedRide.riderId.toString()
              );
              eligible = referralIndex >= 0 && referralIndex < MaxReferrals;
            }

            if (eligible) {
              const adminCharges = updatedRide.rideInfo.adminCharges || 0;
              const referralBonus = (adminCharges * commission) / 100;

              referrer.referralEarning.totalEarnings =
                (referrer.referralEarning.totalEarnings || 0) + referralBonus;
              referrer.referralEarning.currentBalance =
                (referrer.referralEarning.currentBalance || 0) + referralBonus;

              // Add to history
              referrer.referralEarning.history.push({
                rideId: updatedRide._id,
                amount: referralBonus,
                type: "rider_completes_ride"
              });

              const refIndex = referrer.referrals.findIndex(
                (ref) => ref.riderId.toString() === updatedRide.riderId.toString()
              );
              if (refIndex >= 0) {
                referrer.referrals[refIndex].totalEarned += referralBonus;
              }

              await referrer.save();
            }
          }
        }
      }
    }

    // -------------------------
    // 💰 FINANCIAL CALCULATIONS (BEFORE STATUS UPDATES)
    // -------------------------

    const riderId = updatedRide.riderId;
    const payableAmount = updatedRide.totalPayable;
    const paymentType = updatedRide.paymentType; // cash or wallet
    const rideInfo = updatedRide.rideInfo;

    const driverEarning =
      (rideInfo.driverCharges || 0) +
      (rideInfo.pickCharges || 0) +
      (rideInfo.nightCharges || 0) +
      (rideInfo.peakCharges || 0) +
      (rideInfo.extraKmCharges || 0) +
      (rideInfo.extraMinutesCharges || 0) +
      (rideInfo.cancellationCharges || 0) +
      (rideInfo.adminAddedRideExtraCharges?.Charges || 0);

    const adminPayable = 
      (rideInfo.adminCharges || 0) +
      (rideInfo.gstCharges || 0) +
      (rideInfo.insuranceCharges || 0);

    if (paymentType === "cash") {
      // Read Wallet model and update totalSpent
      let riderWalletDoc = await Wallet.findOne({ riderId });

      if (riderWalletDoc) {
        riderWalletDoc.totalSpent += payableAmount;
        await riderWalletDoc.save();
      } else {
        // Create wallet if it does not exist
        await Wallet.create({
          riderId,
          balance: 0,
          totalDeposited: 0,
          totalSpent: payableAmount
        });
      }
    }

    // -------------------------
    // 💰 DRIVER WALLET LOGIC
    // -------------------------

    let wallet = await driverWallet.findOne({ driverId });
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

    if (paymentType === "cash") {
      // For cash payments: Only deduct admin payable (driver already got cash)
      // Deduct admin payable (admin charges + GST + insurance)
      if (adminPayable > 0) {
        wallet.transactions.push({
          type: "admin_ride_commission",
          amount: -adminPayable,
          rideId: updatedRide._id,
          paymentMethod: updatedRide.paymentType,
          description: `Admin commission deducted (${rideInfo.categoryName} - ${rideInfo.subcategoryName})`,
          status: "completed",
        });
        wallet.balance -= adminPayable;
        wallet.totalDeductions += adminPayable;
      }
    } else if (paymentType === "wallet") {
      // For wallet payments: Calculate what driver should get from total paid
      const driverPaymentFromWallet = payableAmount - (rideInfo.extraKmCharges || 0) - (rideInfo.extraMinutesCharges || 0);
      
      if (driverPaymentFromWallet > 0) {
        wallet.transactions.push({
          type: "ride_payment",
          amount: driverPaymentFromWallet,
          rideId: updatedRide._id,
          paymentMethod: updatedRide.paymentType,
          description: `Ride payment from wallet (${rideInfo.categoryName} - ${rideInfo.subcategoryName})`,
          status: "completed",
        });
        wallet.balance += driverPaymentFromWallet;
        wallet.totalEarnings += driverPaymentFromWallet;
      }
    }

    await wallet.save();

      const driver = await Driver.findById(driverId);
      const unclearedCharges = driver?.unclearedCancellationCharges || 0;

      if (unclearedCharges > 0) {
        const currentBalance = wallet.balance;

        if (currentBalance >= unclearedCharges) {
          wallet.balance -= unclearedCharges;
          wallet.totalDeductions += unclearedCharges;
          wallet.transactions.push({
            type: "cancellation_charge",
            amount: -unclearedCharges,
            rideId: updatedRide._id,
            description: "Uncleared cancellation charges deducted",
            status: "completed"
          });
          await wallet.save();

          driver.unclearedCancellationCharges = 0;
          await driver.save();
        } else {
          const remainingCharges = unclearedCharges - currentBalance;

          if (currentBalance > 0) {
            wallet.totalDeductions += currentBalance;
            wallet.balance = 0;
            wallet.transactions.push({
              type: "cancellation_charge",
              amount: -currentBalance,
              rideId: updatedRide._id,
              description: "Partial uncleared cancellation charge deducted",
              status: "completed"
            });
            await wallet.save();
          }

          driver.unclearedCancellationCharges = remainingCharges;
          await driver.save();
        }
      }

    // Send notification to rider
    try {
      if (rider && rider.oneSignalPlayerId) {
        const message = `Your ride with ${driverName} has been completed successfully. Thank you for choosing our service!`;
        
        await NotificationService.sendAndStoreRiderNotification(
          updatedRide.riderId,
          rider.oneSignalPlayerId,
          'Ride Completed',
          message,
          'ride_completed',
          {},
          updatedRide.rideInfo?.categoryId,
          updatedRide._id
        );
      }
    } catch (notifError) {
      console.error('Error sending rider notification:', notifError);
    }

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
      const driverData = await getDriverRideIncludedData(categoryId, subcategoryId, subSubcategoryId, selectedUsage, selectedCategoryId);
      includedKm = driverData.includedKm;
      includedMinutes = driverData.includedMinutes;
      extraChargePerKm = driverData.extraChargePerKm;
      extraChargePerMinute = driverData.extraChargePerMinute;
      adminChargesInPercentage = driverData.extraChargesFromAdmin;
      gstChargesInPercentage = driverData.gst;

    } else if (catNameLower === "cab") {
      const cabData = await getCabRideIncludedData(categoryId, subcategoryId, subSubcategoryId, selectedUsage, selectedCategoryId);
      includedKm = cabData.includedKm;
      includedMinutes = cabData.includedMinutes;
      extraChargePerKm = cabData.extraChargePerKm;
      extraChargePerMinute = cabData.extraChargePerMinute;
      adminChargesInPercentage = cabData.extraChargesFromAdmin;
      gstChargesInPercentage = cabData.gst;

    } else if (catNameLower === "parcel") {
      const parcelData = await getParcelRideIncludedData(categoryId, subcategoryId, selectedUsage, selectedCategoryId);
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
      includedKm: safeIncludedKm,
      diffOfKm: extraKm,
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
router.get("/withdrawals/pending",adminAuthMiddleware, async (req, res) => {
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
router.get("/withdrawals/completed", adminAuthMiddleware, async (req, res) => {
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
router.get("/withdrawals/rejected", adminAuthMiddleware, async (req, res) => {
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
    const { categoryName, categoryId, subcategoryId, selectedCategoryId } = ride.rideInfo;

    const categoryNameLower = categoryName.toLowerCase();
    let cancellationDetails = null;

    try {
      if (categoryNameLower === 'driver') {
        cancellationDetails = await driverRideCost.findOne({
          category: categoryId,
          subcategory: subcategoryId,
          priceCategory: selectedCategoryId
        }).select('driverCancellationCharges _id');
      } else if (categoryNameLower === 'cab') {
        cancellationDetails = await cabRideCost.findOne({
          category: categoryId,
          subcategory: subcategoryId,
          car: selectedCategoryId
        }).select('driverCancellationCharges _id');
      } else if (categoryNameLower === 'parcel') {
        cancellationDetails = await parcelRideCost.findOne({
          category: categoryId,
          subcategory: subcategoryId,
          priceCategory: selectedCategoryId
        }).select('driverCancellationCharges _id');
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

// Get eligible drivers for a ride
router.post("/eligible-drivers", adminAuthMiddleware, async (req, res) => {
  try {
    const { rideId } = req.body;

    if (!rideId) {
      return res.status(400).json({ message: "Ride ID is required" });
    }

    const ride = await Ride.findById(rideId);
    if (!ride) {
      return res.status(404).json({ message: "Ride not found" });
    }

    if (ride.status === "CONFIRMED") {
      return res.status(400).json({ message: "Ride is already confirmed" });
    }

    const { categoryId, subcategoryId, selectedCategoryId, categoryName } = ride.rideInfo;
    const categoryNameLower = categoryName.toLowerCase();

    let eligibleDrivers = [];

    if (categoryNameLower === 'driver') {
      eligibleDrivers = await Driver.find({
        status: 'Approved',
        'personalInformation.category': categoryId,
        'personalInformation.subCategory': { $in: [subcategoryId] },
        driverCategory: selectedCategoryId
      }).select('personalInformation.fullName mobile');
    } else if (categoryNameLower === 'cab' || categoryNameLower === 'parcel') {
      const vehicleField = categoryNameLower === 'cab' ? 'cabVehicleDetails.modelType' : 'parcelVehicleDetails.modelType';

      const vehicles = await Vehicle.find({
        [vehicleField]: selectedCategoryId,
        status: true,
        adminStatus: 'approved'
      }).select('assignedTo');

      const assignedDriverIds = vehicles.flatMap(vehicle => vehicle.assignedTo);

      if (assignedDriverIds.length > 0) {
        eligibleDrivers = await Driver.find({
          _id: { $in: assignedDriverIds },
          status: 'Approved',
          'personalInformation.category': categoryId,
          'personalInformation.subCategory': { $in: [subcategoryId] },
          ownership: { $ne: 'Owner' }
        }).select('personalInformation.fullName mobile');
      }
    }

    const drivers = eligibleDrivers.map(driver => ({
      _id: driver._id,
      name: driver.personalInformation?.fullName || 'N/A',
      mobile: driver.mobile || 'N/A'
    }));

    res.json({
      success: true,
      count: drivers.length,
      drivers
    });
  } catch (error) {
    console.error("Error fetching eligible drivers:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});

module.exports = router;