const express = require("express");
const Driver = require("../DriverModel/DriverModel");
const Category = require('../models/Category');
const SubCategory = require('../models/SubCategory');
const driverAuthMiddleware = require('../middleware/driverAuthMiddleware');
const Vehicle = require("../DriverModel/VehicleModel");
const router = express.Router();
const DriverOtpSession = require("../DriverModel/DriverOtpSession");
const twilio = require("twilio");
const jwt = require("jsonwebtoken");
const { createSession } = require("../Services/DriversessionService");
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const { evaluateDriverProgress } = require("../utils/driverSteps");
const DriverAuthMiddleware = require("../middleware/driverAuthMiddleware");
const cloudinary = require("../config/cloudinary");
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });
const DriverSubscriptionPlan = require('../DriverModel/SubscriptionPlan')
const driverWallet = require("../DriverModel/driverWallet");
const withdrawalRequest = require("../DriverModel/withdrawalRequest");
const MinHoldBalance = require("../models/MinWithdrawBalance");
const CancellationCredit = require("../models/CancellationCredit");
const axios = require("axios");
const fs = require("fs").promises;
const path = require("path");
const sharp = require("sharp");
const DriverReferanceOtpSession = require("../DriverModel/DriverReferanceOtpSession");
const DriverIncentive = require("../models/DriverIncentive");
const DriverSuspend = require("../models/DriverSuspend");
const NotificationService = require('../Services/notificationService');
const DriverNotification = require('../DriverModel/DriverNotification');
const { processDeposit } = require('../utils/depositHandler');
const Razorpay = require('razorpay');
const adminAuthMiddleware = require("../middleware/adminAuthMiddleware");

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Helper function to get field name by step number based on category
function getFieldByStep(step, category = "Driver") {
  const stepFieldMaps = {
    Driver: {
      1: "personalInformation",
      2: "drivingDetails",
      3: "paymentAndSubscription",
      4: "languageSkillsAndReferences",
      5: "declaration"
    },
    Cab: {
      1: "personalInformation",
      2: "ownership",
      3: "drivingDetails",
      4: "paymentAndSubscription",
      5: "languageSkillsAndReferences",
      6: "declaration"
    },
    Parcel: {
      1: "personalInformation",
      2: "ownership",
      3: "drivingDetails",
      4: "paymentAndSubscription",
      5: "languageSkillsAndReferences",
      6: "declaration"
    }
  };
  return stepFieldMaps[category]?.[step] || null;
}
// Get wallet configuration (minimum amounts)

//dummy otp
router.post("/send-otp", async (req, res) => {
  try {
    const { mobile } = req.body;
    if (!mobile) return res.status(400).json({ message: "Mobile number is required" });

    // 🔥 Use dummy OTP for testing
    const otp = "123456";
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);

    // Ensure Driver exists
    let driver = await Driver.findOne({ mobile });
    if (!driver) {
      driver = new Driver({ mobile });
      await driver.save();
    }

    // Check if driver account is deleted
    if (driver.status === "deleted") {
      return res.status(403).json({ 
        success: false, 
        message: "Your account has been deleted. Please contact support for assistance." 
      });
    }

    // Check if driver is suspended
    if (driver.status === "Suspended") {
      const suspendRecord = await DriverSuspend.findOne({
        drivers: driver._id
      }).sort({ createdAt: -1 });

      if (suspendRecord) {
        const now = new Date();
        const suspendFrom = new Date(suspendRecord.suspendFrom);
        const suspendTo = new Date(suspendRecord.suspendTo);

        if (now >= suspendFrom && now <= suspendTo) {
          return res.status(403).json({
            success: false,
            message: `Your account is suspended from ${suspendFrom.toLocaleDateString('en-IN')} to ${suspendTo.toLocaleDateString('en-IN')}. Reason: ${suspendRecord.description}`,
            suspendFrom: suspendFrom,
            suspendTo: suspendTo,
            reason: suspendRecord.description
          });
        } else if (now > suspendTo) {
          driver.status = "Approved";
          await driver.save();
        } else if (now < suspendFrom) {
          driver.status = "Approved";
          await driver.save();
        }
      } else {
        driver.status = "Approved";
        await driver.save();
      }
    }

    // Save OTP session
    const otpSession = new DriverOtpSession({
      driver: driver._id,
      mobile,
      otp,
      otpExpiresAt
    });
    await otpSession.save();

    // ❌ No Twilio SMS — dummy mode
    res.json({
      success: true,
      message: "Dummy OTP generated successfully",
      otp // ⚠ only show in development/testing
    });

  } catch (error) {
    console.error("Send OTP error:", error.message);
    res.status(500).json({ success: false, message: "Failed to generate OTP" });
  }
});

router.post("/verify-otp", async (req, res) => {
  try {
    const { mobile, otp, playerId } = req.body;   // ⬅️ Added playerId

    // ✅ Validate input
    if (!mobile || !otp) {
      return res.status(400).json({ message: "Mobile & OTP required" });
    }
  // Convert mobile to string
    const mobileStr = String(mobile).trim();

    // Find latest OTP session
    const otpSession = await DriverOtpSession.findOne({
      mobile: mobileStr,
      isVerified: false
    }).sort({ createdAt: -1 });

    if (!otpSession) {
      return res.status(400).json({
        success: false,
        message: "No OTP found. Please request a new OTP."
      });
    }

    // Check expiry
    if (new Date() > otpSession.otpExpiresAt) {
      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new OTP."
      });
    }

    // ================================
    // 🔥 DUMMY OTP SUPPORT (123456)
    // ================================
    if (otp == "123456" || otp == 123456) {
      otpSession.isVerified = true;
      await otpSession.save();
    } else {
      if (otpSession.otp != otp) {
        return res.status(400).json({
          success: false,
          message: "Invalid OTP"
        });
      }
      otpSession.isVerified = true;
      await otpSession.save();
    }

    // Get driver
    const driver = await Driver.findOne({ mobile: mobileStr });
    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Driver not found"
      });
    }

    const driverId = driver._id.toString();

    // ⬅️🔥 SAVE PLAYER ID HERE
    await Driver.findByIdAndUpdate(driverId, {
      oneSignalPlayerId: playerId
    });

    const isNew = ["Pending", "Rejected", "Onreview", "PendingForPayment"].includes(driver.status);

    // Generate JWT
    const token = jwt.sign(
      { driverId: driver._id, mobile: driver.mobile },
      process.env.JWT_SECRET_DRIVER,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );

    // Create session
    await createSession(mobileStr, token);

    // Evaluate profile progress
    const { step, status: progressStatus } = evaluateDriverProgress(driver);

    if (["Pending", "PendingForPayment"].includes(driver.status)) {
      driver.status = progressStatus;
      await driver.save({ validateBeforeSave: false });
    }

    // Wallet check
    let wallet = await driverWallet.findOne({ driverId });
    if (!wallet) {
      await driverWallet.create({
        driverId,
        balance: 0,
        totalEarnings: 0,
        totalWithdrawn: 0,
        totalDeductions: 0,
        transactions: [],
      });
    }

    // Prepare response
    const response = {
      success: true,
      driverId,
      token,
      isNew,
      status: driver.status,
      step,
      selectedCategory: driver.selectedCategory,
      uniqueId: driver.uniqueId
    };

    if (driver.ownership) {
      response.ownership = driver.ownership;
    }

    if (["Pending", "PendingForPayment"].includes(driver.status)) {
      response.step = step;
    }

    res.json(response);

  } catch (error) {
    console.error("Verify OTP error:", error);
    res.status(500).json({
      success: false,
      message: "OTP verification failed",
      error: error.message
    });
  }
});

router.post("/deleteAccount", async (req, res) => {
  try {
    const { mobileNo } = req.body;

    if (!mobileNo) {
      return res.status(400).json({ success: false, message: "Mobile number is required" });
    }

    const driver = await Driver.findOne({ mobile: mobileNo });
    if (!driver) {
      return res.status(404).json({ success: false, message: "Driver not found" });
    }

    if (driver.status === "deleted") {
      return res.status(400).json({ success: false, message: "Driver account is already deleted" });
    }

    driver.status = "deleted";
    driver.deletedDate = new Date();
    await driver.save();

    res.json({ success: true, message: "Driver account deleted successfully" });
  } catch (error) {
    console.error("Delete account error:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});


router.get("/",adminAuthMiddleware, async (req, res) => {
  try {
    const drivers = await Driver.find({ status: "Approved" })
      .populate('driverCategory')
      .sort({ createdAt: -1 });

    res.status(200).json(drivers);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get approved drivers with selectedCategory.name as 'Driver'
router.get("/approved-driver-category",adminAuthMiddleware, async (req, res) => {
  try {
    const drivers = await Driver.find({
      status: "Approved",
      "selectedCategory.name": "Driver"
    })
      .populate('driverCategory')
      
      .sort({ createdAt: -1 });

    res.json({ success: true, data: drivers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get driver profile data (name, isOnline, passportPhoto, completedRides, totalEarnings, minWithdrawAmount, minDepositAmount, totalNotifications, unreadCount)
router.get("/profile", DriverAuthMiddleware, async (req, res) => {
  try {
    const driverId = req.driver.driverId;

    const driver = await Driver.findById(driverId)
      .select("personalInformation.fullName personalInformation.passportPhoto isOnline completedRides ratings.avgRating")
      .lean();

    if (!driver) {
      return res.status(404).json({ success: false, message: "Driver not found" });
    }

    const wallet = await driverWallet.findOne({ driverId }).select("totalEarnings").lean();

    // Get wallet configuration amounts
    const config = await MinHoldBalance.findOne().sort({ createdAt: -1 });
    const minDepositAmount = config?.minDepositAmount || 0;
    const minWithdrawAmount = config?.minWithdrawAmount || 0;

    // Get notification counts
    const totalNotifications = await DriverNotification.countDocuments({ driverId });
    const unreadCount = await DriverNotification.countDocuments({ driverId, isRead: false });

    res.json({
      success: true,
      data: {
        name: driver.personalInformation?.fullName || null,
        isOnline: driver.isOnline || false,
        passportPhoto: driver.personalInformation?.passportPhoto || null,
        completedRides: driver.completedRides?.length || 0,
        totalEarnings: wallet?.totalEarnings || 0,
        avgRating: driver.ratings?.avgRating || 0,
        minWithdrawAmount,
        minDepositAmount,
        totalNotifications,
        unreadCount
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Assign drivers to price category
router.put("/assign-category",adminAuthMiddleware, async (req, res) => {
  try {
    const { categoryId, driverIds } = req.body;

    if (!categoryId || !Array.isArray(driverIds)) {
      return res.status(400).json({ message: "Category ID and driver IDs array are required" });
    }

    // Add category to selected drivers (push to array if not already present)
    await Driver.updateMany(
      { 
        _id: { $in: driverIds },
        driverCategory: { $ne: categoryId } // Only update if category not already assigned
      },
      { $addToSet: { driverCategory: categoryId } } // Add to array without duplicates
    );

    // Remove category from drivers not in the selection for this category
    await Driver.updateMany(
      {
        _id: { $nin: driverIds },
        driverCategory: categoryId
      },
      { $pull: { driverCategory: categoryId } } // Remove from array
    );

    res.json({
      success: true,
      message: "Driver categories updated successfully",
      updatedCount: driverIds.length
    });
  } catch (error) {
    console.error("Assign category error:", error);
    res.status(500).json({ success: false, message: "Failed to assign categories" });
  }
});

//Onreview drivers
router.get("/Pending",adminAuthMiddleware, async (req, res) => {
  try {
    const drivers = await Driver.find({ status: "Pending" }).populate([
        {
          path: "personalInformation.category",
          select: "name"
        },
        {
          path: "personalInformation.subCategory",
          select: "name"
        }
      ]).sort({ approvedDate: -1 });

    if (!drivers || drivers.length === 0) {
      return res.status(200).json({ success: true, data: [] });
    }

    res.status(200).json({ success: true, data: drivers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/Onreview",adminAuthMiddleware, async (req, res) => {
  try {
    const drivers = await Driver.find({ status: "Onreview" }).populate([
        {
          path: "personalInformation.category",
          select: "name"
        },
        {
          path: "personalInformation.subCategory",
          select: "name"
        }
      ]).sort({ approvedDate: -1 });

    if (!drivers || drivers.length === 0) {
      return res.status(200).json({ success: true, data: [] });

    }

    res.status(200).json({ success: true, data: drivers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/Approved",adminAuthMiddleware, async (req, res) => {
  try {
    const drivers = await Driver.find({ status: "Approved" }).populate([
        {
          path: "personalInformation.category",
          select: "name"
        },
        {
          path: "personalInformation.subCategory",
          select: "name"
        }
      ]).sort({ approvedDate: -1 });

    if (!drivers || drivers.length === 0) {
      return res.status(200).json({ success: true, data: [] });

    }

    res.status(200).json({ success: true, data: drivers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/Rejected",adminAuthMiddleware, async (req, res) => {
  try {
    const drivers = await Driver.find({ status: "Rejected" }).populate([
        {
          path: "personalInformation.category",
          select: "name"
        },
        {
          path: "personalInformation.subCategory",
          select: "name"
        }
      ]).sort({ approvedDate: -1 });

    if (!drivers || drivers.length === 0) {
      return res.status(200).json({ success: true, data: [] });

    }

    res.status(200).json({ success: true, data: drivers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/PendingForPayment",adminAuthMiddleware, async (req, res) => {
  try {
    const drivers = await Driver.find({ status: "PendingForPayment" }).populate([
        {
          path: "personalInformation.category",
          select: "name"
        },
        {
          path: "personalInformation.subCategory",
          select: "name"
        }
      ]).sort({ approvedDate: -1 });

    if (!drivers || drivers.length === 0) {
      return res.status(200).json({ success: true, data: [] });
    }
    res.status(200).json({ success: true, data: drivers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/deleted",adminAuthMiddleware, async (req, res) => {
  try {
    const drivers = await Driver.find({ status: "deleted" }).populate([
        {
          path: "personalInformation.category",
          select: "name"
        },
        {
          path: "personalInformation.subCategory",
          select: "name"
        }
      ]).sort({ approvedDate: -1 });

    if (!drivers || drivers.length === 0) {
      return res.status(200).json({ success: true, data: [] });
    }
    res.status(200).json({ success: true, data: drivers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/Suspended",adminAuthMiddleware, async (req, res) => {
  try {
    const drivers = await Driver.find({ status: "Suspended" }).populate([
        {
          path: "personalInformation.category",
          select: "name"
        },
        {
          path: "personalInformation.subCategory",
          select: "name"
        }
      ]).sort({ approvedDate: -1 });

    if (!drivers || drivers.length === 0) {
      return res.status(200).json({ success: true, data: [] });
    }

    // Get suspend details for each driver
    const driversWithSuspendInfo = await Promise.all(
      drivers.map(async (driver) => {
        const suspendRecord = await DriverSuspend.findOne({
          drivers: driver._id
        }).sort({ createdAt: -1 });

        return {
          ...driver.toObject(),
          suspendFrom: suspendRecord?.suspendFrom || null,
          suspendTo: suspendRecord?.suspendTo || null,
          suspendDescription: suspendRecord?.description || null
        };
      })
    );

    res.status(200).json({ success: true, data: driversWithSuspendInfo });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Approve driver
router.post("/approve/:driverId",adminAuthMiddleware, async (req, res) => {
  try {
    const { driverId } = req.params;

    // Find driver
    const driver = await Driver.findById(driverId);
    if (!driver) {
      return res.status(404).json({ message: "Driver not found" });
    }

    // Generate unique ID with collision handling
    const driverName = driver.personalInformation?.fullName || "DRIVER";
    const mobile = driver.mobile || "0000";
    const namePrefix = driverName.substring(0, 5).toUpperCase().replace(/[^A-Z]/g, 'X');
    const mobileSuffix = mobile.slice(-4);

    let uniqueId;
    let attempts = 0;
    const maxAttempts = 10;

    do {
      const randomDigits = Math.floor(10 + Math.random() * 90);
      const extraChars = attempts > 0 ? String.fromCharCode(65 + Math.floor(Math.random() * 26)) + Math.floor(Math.random() * 10) : '';
      uniqueId = `${namePrefix}${mobileSuffix}${randomDigits}${extraChars}`;

      const existingDriver = await Driver.findOne({ uniqueId, _id: { $ne: driverId } });
      if (!existingDriver) break;

      attempts++;
    } while (attempts < maxAttempts);

    if (attempts >= maxAttempts) {
      uniqueId = `${namePrefix}${mobileSuffix}${Date.now().toString().slice(-4)}`;
    }

    let currentPlanUpdate = {};

    // Check if driver has subscriptionPlan in paymentAndSubscription
    if (driver.paymentAndSubscription?.subscriptionPlan) {
      const subscriptionPlan = await DriverSubscriptionPlan.findById(driver.paymentAndSubscription.subscriptionPlan);
      if (subscriptionPlan) {
        const now = new Date();
        let expiryDate;
        if (driver.currentPlan?.expiryDate && driver.currentPlan.expiryDate > now) {
          expiryDate = new Date(driver.currentPlan.expiryDate);
          expiryDate.setDate(expiryDate.getDate() + subscriptionPlan.days); // extend from current expiry
        } else {
          expiryDate = new Date();
          expiryDate.setDate(expiryDate.getDate() + subscriptionPlan.days); // start from today
        }
        currentPlanUpdate = {
          currentPlan: {
            planId: subscriptionPlan._id,
            expiryDate
          }
        };
      }
    }

    // Get latest cancellation credit configuration
    const latestCredit = await CancellationCredit.findOne().sort({ createdAt: -1 });
    const cancellationCredits = latestCredit ? latestCredit.credits : 0;

    // Update driver status to Approved and set currentPlan, cancellation credits, uniqueId, and approvedDate
    const updatedDriver = await Driver.findByIdAndUpdate(
      driverId,
      {
        status: "Approved",
        uniqueId,
        cancellationRideCredits: cancellationCredits,
        approvedDate: new Date(),
        ...currentPlanUpdate
      },
      { new: true }
    );

    // Update all vehicles owned by this driver to adminStatus: 'approved'
    await Vehicle.updateMany(
      { owner: driverId },
      { 
        adminStatus: 'approved',
        approvedDate: new Date()
      }
    );

    // Send approval notification to driver
    try {
      await NotificationService.sendAndStoreDriverNotification(
        driverId,
        driver.oneSignalPlayerId,
        'Registration Approved',
        'Your driver registration has been approved. Welcome aboard!',
        'registration_approved',
        { driverId },
        driver.personalInformation?.category || null,
        null
      );
    } catch (notifError) {
      console.error('Driver approval notification error:', notifError);
    }

    res.json({ success: true, message: "Driver approved successfully", driver: updatedDriver });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to approve driver" });
  }
});

// Reject driver
router.post("/reject/:driverId", adminAuthMiddleware, async (req, res) => {
  try {
    const { driverId } = req.params;
    const { steps = [] } = req.body;

    // Get driver's category first
    const driverData = await Driver.findById(driverId).select("selectedCategory").lean();
    if (!driverData) {
      return res.status(404).json({ message: "Driver not found" });
    }

    const category = driverData.selectedCategory?.name || "Driver";

    // Check if step 2 (ownership) is being rejected for Cab/Parcel drivers
    if ((category === "Cab" || category === "Parcel") && steps.includes(2)) {
      // Delete all vehicles owned by this driver
      await Vehicle.deleteMany({ owner: driverId });

      // Remove vehicle references from driver
      await Driver.findByIdAndUpdate(driverId, {
        $unset: { vehiclesOwned: 1, vehiclesAssigned: 1, assignedDrivers: 1 }
      });
    }

    // Build unset object for specified steps based on category
    const unsetFields = {};
    steps.forEach(step => {
      const fieldName = getFieldByStep(step, category);
      if (fieldName) {
        unsetFields[fieldName] = 1;
      }
    });

    const updateQuery = { status: "Rejected", rejectedDate: new Date() };
    if (Object.keys(unsetFields).length > 0) {
      updateQuery.$unset = unsetFields;
    }

    const driver = await Driver.findByIdAndUpdate(
      driverId,
      updateQuery,
      { new: true }
    );

    if (!driver) {
      return res.status(404).json({ message: "Driver not found" });
    }

    // Send rejection notification to driver
    try {
      await NotificationService.sendAndStoreDriverNotification(
        driverId,
        driver.oneSignalPlayerId,
        'Registration Rejected',
        'Your driver registration has been rejected.',
        'registration_rejected',
        { driverId },
        driver.personalInformation?.category || null,
        null
      );
    } catch (notifError) {
      console.error('Driver rejection notification error:', notifError);
    }

    res.json({
      success: true,
      message: `Driver rejected successfully${steps.length ? ` and ${steps.length} step(s) cleared` : ''}`,
      driver
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to reject driver" });
  }
});

// Get driver cancellation credits info
router.get("/cancellation-credits",adminAuthMiddleware, async (req, res) => {
  try {
    // console.log('Fetching driver cancellation credits...');

    const drivers = await Driver.find({ status: "Approved" })
      .select("personalInformation.fullName mobile personalInformation.currentAddress cancellationRideCredits createdAt")
      .sort({ createdAt: -1 });

    // console.log(`Found ${drivers.length} approved drivers`);

    const driversData = drivers.map(driver => ({
      driverName: driver.personalInformation?.fullName || "N/A",
      mobile: driver.mobile || "N/A",
      currentAddress: driver.personalInformation?.currentAddress || "N/A",
      cancellationRideCredits: driver.cancellationRideCredits || 0,
      createdAt: driver.createdAt
    }));

    res.json({ success: true, data: driversData });
  } catch (error) {
    console.error('Cancellation credits API error:', error);
    res.status(500).json({ success: false, message: "Failed to fetch driver", error: error.message });
  }
});

// Get all cancellation credit configurations
router.get("/manage-credits",adminAuthMiddleware, async (req, res) => {
  try {
    const credits = await CancellationCredit.find().sort({ createdAt: -1 });
    res.json({ success: true, data: credits });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update cancellation credits for all drivers
router.post("/manage-credits",adminAuthMiddleware, async (req, res) => {
  try {
    const { credits } = req.body;

    if (credits === undefined || credits < 0) {
      return res.status(400).json({ message: "Credits must be a non-negative number" });
    }

    // Check if this is the first credit configuration
    const existingCredits = await CancellationCredit.find().sort({ createdAt: -1 });
    const isFirstCredit = existingCredits.length === 0;

    // Create new credit record
    const newCredit = new CancellationCredit({ credits });
    await newCredit.save();

    if (isFirstCredit) {
      // First credit: Set all approved drivers to this amount
      await Driver.updateMany(
        { status: "Approved" },
        { cancellationRideCredits: credits }
      );
      res.status(201).json({
        success: true,
        data: newCredit,
        message: `Initial credits (${credits}) set for all drivers`
      });
    } else {
      // Subsequent credits: Handle increase/decrease for existing drivers
      const previousCredit = existingCredits[0].credits;
      const difference = credits - previousCredit;

      if (difference > 0) {
        // Increase: Add difference to existing drivers
        await Driver.updateMany(
          { status: "Approved" },
          { $inc: { cancellationRideCredits: difference } }
        );
        res.status(201).json({
          success: true,
          data: newCredit,
          message: `Added ${difference} credits to existing drivers. New drivers will get ${credits} credits.`
        });
      } else if (difference < 0) {
        // Decrease: Smart deduction from existing drivers
        const deductAmount = Math.abs(difference);

        // Get all approved drivers with their current credits
        const drivers = await Driver.find({ status: "Approved" }).select('_id cancellationRideCredits');

        // Process each driver individually for smart deduction
        const updatePromises = drivers.map(driver => {
          const currentCredits = driver.cancellationRideCredits || 0;
          const actualDeduction = Math.min(currentCredits, deductAmount);
          const newCredits = currentCredits - actualDeduction;

          return Driver.findByIdAndUpdate(
            driver._id,
            { cancellationRideCredits: newCredits }
          );
        });

        await Promise.all(updatePromises);

        res.status(201).json({
          success: true,
          data: newCredit,
          message: `Deducted up to ${deductAmount} credits from existing drivers. New drivers will get ${credits} credits.`
        });
      } else {
        res.status(201).json({
          success: true,
          data: newCredit,
          message: `Credit configuration saved. New drivers will get ${credits} credits. Existing drivers unchanged.`
        });
      }
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get driver personal information with category details
router.get("/driverDetail", driverAuthMiddleware, async (req, res) => {
  try {
    const driver = await Driver.findById(req.driver.driverId);

    if (!driver) {
      return res.status(404).json({ message: "Driver not found" });
    }

    const Category = require('../models/Category');
    const SubCategory = require('../models/SubCategory');

    let categoryName = null;
    let subCategoryNames = [];

    // Get category name
    if (driver.personalInformation?.category) {
      const category = await Category.findById(driver.personalInformation.category);
      categoryName = category?.name || null;
    }

    // Get subcategory names
    if (driver.personalInformation?.subCategory?.length > 0) {
      const subCategories = await SubCategory.find({
        _id: { $in: driver.personalInformation.subCategory }
      });
      subCategoryNames = subCategories.map(sub => sub.name);
    }

    const response = {
      personalInformation: driver.personalInformation,
      mobile: driver.mobile,
      uniqueId: driver.uniqueId,
      categoryName,
      subCategoryNames
    };

    res.json({ success: true, data: response });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch driver profile", error: error.message });
  }
});

// Get driver by ID
router.get("/:driverId", adminAuthMiddleware, async (req, res) => {
  try {
    const { driverId } = req.params;
    const driver = await Driver.findById(driverId).populate([
        {
          path: "personalInformation.category",
          select: "name"
        },
        {
          path: "personalInformation.subCategory",
          select: "name"
        },
        {
          path: "drivingDetails.canDrive",
          select: "vehicleName"
        },
        {
          path: "drivingDetails.vehicleType",
          select: "name"
        }
      ]).sort({ approvedDate: -1 });
    if (!driver) {
      return res.status(404).json({ message: "Driver not found" });
    }
    res.json(driver);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch driver" });
  }
});

//kaleyra integration
/*
router.post("/send-otp", async (req, res) => {
  try {
    const { mobile } = req.body;

    // ✅ Validate mobile number exists
    if (!mobile) {
      return res.status(400).json({ message: "Mobile number is required" });
    }

    // ✅ Convert mobile to string if it's a number
    const mobileStr = String(mobile).trim();

    // ✅ Validate mobile number format
    if (!/^\d{10}$/.test(mobileStr) && !/^\+91\d{10}$/.test(mobileStr)) {
      return res.status(400).json({ message: "Invalid mobile number format" });
    }

    // ✅ Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);

    // ✅ Ensure Driver exists
    let driver = await Driver.findOne({ mobile: mobileStr });
    if (!driver) {
      driver = new Driver({ mobile: mobileStr });
      await driver.save();
    }

    // ✅ Check if driver account is deleted
    if (driver.status === "deleted") {
      return res.status(403).json({ 
        success: false, 
        message: "Your account has been deleted. Please contact support for assistance." 
      });
    }

    // Check if driver is suspended
    if (driver.status === "Suspended") {
      const suspendRecord = await DriverSuspend.findOne({
        drivers: driver._id
      }).sort({ createdAt: -1 });

      if (suspendRecord) {
        const now = new Date();
        const suspendFrom = new Date(suspendRecord.suspendFrom);
        const suspendTo = new Date(suspendRecord.suspendTo);

        if (now >= suspendFrom && now <= suspendTo) {
          return res.status(403).json({
            success: false,
            message: `Your account is suspended from ${suspendFrom.toLocaleDateString('en-IN')} to ${suspendTo.toLocaleDateString('en-IN')}. Reason: ${suspendRecord.description}`,
            suspendFrom: suspendFrom,
            suspendTo: suspendTo,
            reason: suspendRecord.description
          });
        } else if (now > suspendTo) {
          driver.status = "Approved";
          await driver.save();
        } else if (now < suspendFrom) {
          driver.status = "Approved";
          await driver.save();
        }
      } else {
        driver.status = "Approved";
        await driver.save();
      }
    }

    // ✅ Save OTP session
    const otpSession = new DriverOtpSession({
      driver: driver._id,
      mobile: mobileStr,
      otp,
      otpExpiresAt
    });
    await otpSession.save();

    // ✅ Format phone number correctly
    const toNumber = mobileStr.startsWith("+") ? mobileStr : `+91${mobileStr}`;

    // ✅ Build Kaleyra API URL
    const apiUrl = `https://api.kaleyra.io/v1/${process.env.KALEYRA_SID}/messages`;

    // ✅ Prepare payload
    const payload = {
      to: toNumber,
      sender: process.env.KALEYRA_SENDER_ID,
      type: "TXN",
      template_id: process.env.KALEYRA_TEMPLATE_ID,
      body: `DriveGo OTP is booking confirmation or registration: ${otp}`,
      template_params: otp,
    };

    // console.log("Payload sent to Kaleyra =>", JSON.stringify(payload, null, 2));

    // ✅ Send OTP via Kaleyra
    const response = await axios.post(apiUrl, payload, {
      headers: {
        "api-key": process.env.KALEYRA_API_KEY,
        "Content-Type": "application/json",
      },
    });



    res.json({
      success: true,
      message: "OTP sent successfully",
      // otp, // ⚠️ Remove this in production for security
    });
  } catch (error) {
    console.error("Send OTP error:", error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: "Failed to send OTP",
      error: error.response?.data || error.message,
    });
  }
});

router.post("/verify-otp", async (req, res) => {
  try {
    const { mobile, otp, playerId } = req.body; // ⬅️ Added playerId

    // Validate required fields
    if (!mobile || !otp) {
      return res.status(400).json({ message: "Mobile & OTP required" });
    }

    if (!playerId) {
      return res.status(400).json({ success: false, message: "Player ID is required" });
    }

    // Convert mobile to string
    const mobileStr = String(mobile).trim();

    // Find latest OTP session
    const otpSession = await DriverOtpSession.findOne({
      mobile: mobileStr,
      isVerified: false
    }).sort({ createdAt: -1 });

    if (!otpSession) {
      return res.status(400).json({
        success: false,
        message: "No OTP found. Please request a new OTP."
      });
    }

    // Check expiry
    if (new Date() > otpSession.otpExpiresAt) {
      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new OTP."
      });
    }

    // Verify OTP
    if (otpSession.otp != otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP"
      });
    }

    // Mark OTP session verified
    otpSession.isVerified = true;
    await otpSession.save();

    // Get driver
    const driver = await Driver.findOne({ mobile: mobileStr });
    if (!driver) {
      return res.status(404).json({
        success: false,
        message: "Driver not found"
      });
    }

    const driverId = driver._id.toString();

    // 🔥 SAVE PLAYER ID HERE
    await Driver.findByIdAndUpdate(driverId, {
      oneSignalPlayerId: playerId
    });

    const isNew = ["Pending", "Rejected", "Onreview", "PendingForPayment"].includes(driver.status);

    // Generate JWT
    const token = jwt.sign(
      { driverId: driver._id, mobile: driver.mobile },
      process.env.JWT_SECRET_DRIVER,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );

    // Create session
    await createSession(mobileStr, token);

    // Evaluate progress
    const { step, status: progressStatus } = evaluateDriverProgress(driver);

    // Update status if pending
    if (["Pending", "PendingForPayment"].includes(driver.status)) {
      driver.status = progressStatus;
      await driver.save();
    }

    // Ensure wallet exists
    let wallet = await driverWallet.findOne({ driverId });
    if (!wallet) {
      await driverWallet.create({
        driverId,
        balance: 0,
        totalEarnings: 0,
        totalWithdrawn: 0,
        totalDeductions: 0,
        transactions: [],
      });
    }

    // Prepare response
    const response = {
      success: true,
      driverId,
      token,
      isNew,
      step,
      status: driver.status,
      selectedCategory: driver.selectedCategory,
      uniqueId: driver.uniqueId
    };

    // Ownership logic
    if (driver.selectedCategory?.name === "Cab" && driver.cabVehicleDetails?.ownership) {
      response.ownership = driver.cabVehicleDetails.ownership;
    } 
    else if (driver.selectedCategory?.name === "Parcel" && driver.parcelVehicleDetails?.ownership) {
      response.ownership = driver.parcelVehicleDetails.ownership;
    }

    // Add step if pending
    if (["Pending", "PendingForPayment"].includes(driver.status)) {
      response.step = step;
    }

    res.json(response);

  } catch (error) {
    console.error("Verify OTP error:", error);
    res.status(500).json({
      success: false,
      message: "OTP verification failed",
      error: error.message
    });
  }
});
*/

router.get("/application/driverDeatils", DriverAuthMiddleware, async (req, res) => {
  try {
    const driverId = req.driver.driverId;

    const driver = await Driver.findById(driverId);
    if (!driver) {
      return res.status(404).json({ success: false, message: "Driver not found" });
    }

    const isNew = ["Pending", "Rejected", "Onreview", "PendingForPayment"].includes(driver.status);

    // Evaluate driver profile progress
    const { step, status: progressStatus } = evaluateDriverProgress(driver);

    // Update status for Pending, PendingForPayment, and Rejected drivers
    if (["Pending", "PendingForPayment", "Rejected"].includes(driver.status)) {
      // For rejected drivers, if they have missing fields, set to Pending
      // If all fields complete, set to Onreview for re-review
      if (driver.status === "Rejected") {
        driver.status = step === 0 ? "Onreview" : "Pending";
      } else {
        driver.status = progressStatus;
      }
      await driver.save();
    }

    // Get wallet configuration amounts
    const config = await MinHoldBalance.findOne().sort({ createdAt: -1 });
    const minDepositAmount = config?.minDepositAmount || 0;
    const minWithdrawAmount = config?.minWithdrawAmount || 0;

    // Get notification counts
    const totalNotifications = await DriverNotification.countDocuments({ driverId });
    const unreadCount = await DriverNotification.countDocuments({ driverId, isRead: false });

    // Prepare response
    const response = {
      success: true,
      driverId,
      isNew,
      status: driver.status,
      selectedCategory: driver.selectedCategory,
      uniqueId: driver.uniqueId,
      minDepositAmount,
      minWithdrawAmount,
      totalNotifications,
      unreadCount
    };

    // Add ownership if exists
    if (driver.ownership) {
      response.ownership = driver.ownership;
    }

    // Add step only if status is Pending or PendingForPayment
    if (["Pending", "PendingForPayment"].includes(driver.status)) {
      response.step = step;
    }

    res.json(response);
  } catch (error) {
    console.error("Driver details error:", error);
    res.status(500).json({ success: false, message: "Failed to get driver details" });
  }
});

// Toggle driver online status
router.patch("/online-status", DriverAuthMiddleware, async (req, res) => {
  try {
    const driverId = req.driver.driverId;

    // Get current status and toggle it
    const currentDriver = await Driver.findById(driverId).select("isOnline");
    if (!currentDriver) {
      return res.status(404).json({ success: false, message: "Driver not found" });
    }

    const newStatus = !currentDriver.isOnline;

    const driver = await Driver.findByIdAndUpdate(
      driverId,
      { isOnline: newStatus },
      { new: true, select: "isOnline" }
    );

    res.json({
      success: true,
      message: `Driver status updated to ${newStatus ? "online" : "offline"}`,
      data: { isOnline: driver.isOnline }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ✅ Cache directory creation (avoid repeated fs.mkdir calls)
const createdDirs = new Set();

// ✅ OPTIMIZED: Ultra-fast file upload with streaming
const uploadToServerFast = async (fileBuffer, filename, isImage = true) => {
  const folder = isImage ? "images" : "documents";
  const uploadPath = path.join(__dirname, `../cloud/${folder}`);

  // Create directory only once per server restart
  if (!createdDirs.has(uploadPath)) {
    await fs.mkdir(uploadPath, { recursive: true });
    createdDirs.add(uploadPath);
  }

  const filePath = path.join(uploadPath, filename);

  if (isImage) {
    // FASTEST Sharp settings: effort 1, lower quality, smaller size
    await sharp(fileBuffer)
      .resize({ width: 800, withoutEnlargement: true })
      .webp({
        quality: 70,
        effort: 1,
        smartSubsample: true
      })
      .toFile(filePath);  // Direct file write (faster than buffer)
  } else {
    // Direct write for PDFs
    await fs.writeFile(filePath, fileBuffer);
  }

  return `https://adminbackend.hire4drive.com/app/cloud/${folder}/${filename}`;
};

// ✅ OPTIMIZED: Process ALL files in parallel (no batching)
const processAllFiles = async (files) => {
  return Promise.all(
    files.map(async (file) => {
      try {
        const isImage = file.mimetype.startsWith("image/");
        const ext = path.extname(file.originalname) || (isImage ? ".webp" : ".pdf");
        const filename = `${file.fieldname}_${Date.now()}_${Math.random()
          .toString(36)
          .substr(2, 9)}${ext}`;

        const url = await uploadToServerFast(file.buffer, filename, isImage);
        return { fieldname: file.fieldname, url, success: true };
      } catch (error) {
        console.error(`❌ Upload failed for ${file.fieldname}:`, error.message);
        return {
          fieldname: file.fieldname,
          error: error.message,
          success: false,
        };
      }
    })
  );
};

// ✅ OPTIMIZED: Main route with detailed performance logging
router.post("/update-step", DriverAuthMiddleware, upload.any(), async (req, res) => {
  // 🔍 Performance tracking
  const timings = {};
  const startTime = Date.now();
  let checkpointTime = startTime;

  //console.log('req.files', req.files);

  const logTime = (label) => {
    const now = Date.now();
    const elapsed = now - checkpointTime;
    const total = now - startTime;
    timings[label] = { elapsed, total };
    // console.log(`⏱️  [${label}]: ${elapsed}ms (Total: ${total}ms)`);
    checkpointTime = now;
  };

  try {
    // logTime("START");

    const step = parseInt(req.body.step, 10);
    const mobile = req.driver?.mobile;

    // ✅ Safe JSON parsing
    let data = {};
    try {
      data = JSON.parse(req.body.data || "{}");
    } catch (err) {
      console.error("❌ JSON parse error:", err.message);
      return res.status(400).json({
        success: false,
        message: "Invalid JSON in data field",
        error: err.message,
      });
    }

    // logTime("JSON_PARSE");

    if (!mobile || !step) {
      return res.status(400).json({ message: "Mobile & step are required" });
    }

    // Get driver's category from selectedCategory for steps 2-5
    let category = "Driver"; // default
    let categoryId = null;
    if (step > 1) {
      const driverCategory = await Driver.findOne({ mobile }).select("selectedCategory").lean();
      if (driverCategory?.selectedCategory?.name) {
        category = driverCategory.selectedCategory.name;
        categoryId = driverCategory.selectedCategory.id;
      }
    }

    const field = getFieldByStep(step, category);
    if (!field) return res.status(400).json({ message: "Invalid step number" });

    // logTime("VALIDATION");

    // 🚀 CRITICAL OPTIMIZATION: Parallel driver fetch + file upload (all at once)
    // console.log(`📤 Starting parallel operations: DB fetch + ${req.files?.length || 0} file uploads`);

    // Always include all fields needed for progress evaluation
    const selectFields = "personalInformation drivingDetails ownership paymentAndSubscription languageSkillsAndReferences declaration status mobile currentPlan selectedCategory";

    const [driverData, uploadResults] = await Promise.all([
      Driver.findOne({ mobile }).select(selectFields).lean(),
      req.files?.length ? processAllFiles(req.files) : Promise.resolve([])
    ]);

    // logTime("PARALLEL_FETCH_AND_UPLOAD");
    // console.log(`✅ Uploaded ${uploadResults.filter(r => r.success).length}/${uploadResults.length} files`);

    if (!driverData) {
      console.error("❌ Driver not found:", mobile);
      return res.status(404).json({ message: "Driver not found" });
    }

    // 🚀 Organize files efficiently
    const fileGroups = {};
    const singleFiles = {};
    const arrayFields = ["aadhar", "drivingLicense", "vehiclePhotos"];

    uploadResults.forEach((result) => {
      if (result.success) {
        if (arrayFields.includes(result.fieldname)) {
          if (!fileGroups[result.fieldname]) fileGroups[result.fieldname] = [];
          fileGroups[result.fieldname].push(result.url);
        } else {
          singleFiles[result.fieldname] = result.url;
        }
      }
    });

    // logTime("FILE_ORGANIZATION");

    // Add single file fields to data
    Object.assign(data, singleFiles);

    // Merge array fields (for multiple docs)
    Object.entries(fileGroups).forEach(([fieldName, urls]) => {
      if (urls.length > 0) {
        const existingUrls = driverData[field]?.[fieldName] || [];
        data[fieldName] = [...new Set([...existingUrls, ...urls])];
      }
    });

    // For step 2 (ownership), store the ownership value directly
    let updates;
    if (step === 2 && (category === "Cab" || category === "Parcel")) {
      updates = { ownership: data.ownership };
    } else {
      // Merge with existing step data for other steps
      const fieldData = { ...driverData[field], ...data };
      updates = { [field]: fieldData };
    }

    // logTime("DATA_MERGE");

    // Set status update flag for later
    let shouldUpdateStatus = false;
    if (step >= 5) {
      shouldUpdateStatus = true;
    }

    // Handle selectedCategory update for step 1
    if (step === 1 && data.category) {
      try {
        const Category = require('../models/Category');
        const categoryDoc = await Category.findById(data.category).lean();
        if (categoryDoc) {
          updates.selectedCategory = {
            id: categoryDoc._id.toString(),
            name: categoryDoc.name
          };
        }
      } catch (error) {
        console.error('Category lookup error:', error);
      }
    }

    // 🚀 Single atomic database update
    // console.log(`💾 Updating database for step ${step}...`);
    const updatedDriver = await Driver.findOneAndUpdate(
      { mobile },
      { $set: updates },
      {
        new: true,
        runValidators: true
      }
    ).lean();

    // 🚗 Create Vehicle record for Owner/Owner_With_Vehicle with vehicle details
    if ((category === "Cab" || category === "Parcel") && step === 2 && data.ownership && data.rcNumber) {
      const ownership = data.ownership;
      
      if (ownership === "Owner" || ownership === "Owner_With_Vehicle") {
        // Prepare vehicle details based on category
        const vehicleDetailsField = category === "Cab" ? "cabVehicleDetails" : "parcelVehicleDetails";
        const vehicleDetails = {
          vehicleType: Array.isArray(data.vehicleType) ? data.vehicleType[0] : data.vehicleType,
          modelType: Array.isArray(data.modelType) ? data.modelType[0] : data.modelType,
          color: data.color,
          fuelType: data.fuelType,
          insuranceValidUpto: data.insuranceValidUpto,
          pollutionValidUpto: data.pollutionValidUpto,
          taxValidUpto: data.taxValidUpto,
          fitnessValidUpto: data.fitnessValidUpto,
          permitValidUpto: data.permitValidUpto,
          rc: data.rc,
          insurance: data.insurance,
          pollutionCertificate: data.pollutionCertificate,
          taxReceipt: data.taxReceipt,
          fitnessCertificate: data.fitnessCertificate,
          permit: data.permit,
          vehiclePhotos: data.vehiclePhotos || []
        };
        
        // Add category-specific fields
        if (category === "Cab") {
          vehicleDetails.seatCapacity = data.seatCapacity;
        } else if (category === "Parcel") {
          vehicleDetails.length = data.length;
          vehicleDetails.width = data.width;
          vehicleDetails.height = data.height;
          vehicleDetails.weightCapacity = data.weightCapacity;
        }
        
        const newVehicle = new Vehicle({
          owner: updatedDriver._id,
          category: categoryId,
          rcNumber: data.rcNumber,
          status: true,
          adminStatus: 'pending',
          assignedTo: ownership === "Owner_With_Vehicle" ? updatedDriver._id : null,
          [vehicleDetailsField]: vehicleDetails
        });
        
        const savedVehicle = await newVehicle.save();
        
        // Prepare driver updates based on ownership
        const driverUpdates = { $push: { vehiclesOwned: savedVehicle._id } };
        
        // For Owner_With_Vehicle, also add to vehiclesAssigned
        if (ownership === "Owner_With_Vehicle") {
          driverUpdates.$push.vehiclesAssigned = savedVehicle._id;
        }
        
        await Driver.findByIdAndUpdate(updatedDriver._id, driverUpdates);
        
        //console.log(`✅ Vehicle created for ${ownership} driver: ${savedVehicle._id}`);
      }
    }
    
    // Evaluate progress after update
    const progressResult = evaluateDriverProgress(updatedDriver);
    
    // Update status if needed
    if (shouldUpdateStatus || progressResult.step === 0) {
      await Driver.findOneAndUpdate(
        { mobile },
        { status: progressResult.status }
      );
    }

    // logTime("DB_UPDATE");

    const totalTime = Date.now() - startTime;

    // 🎯 Performance summary
    // console.log("\n" + "=".repeat(50));
    // console.log("📊 PERFORMANCE SUMMARY");
    // console.log("=".repeat(50));
    // console.log(`Total Time: ${totalTime}ms (${(totalTime/1000).toFixed(2)}s)`);
    // console.log(`Step: ${step} | Mobile: ${mobile}`);
    // console.log(`Files: ${req.files?.length || 0} uploaded`);
    // console.log("\nBreakdown:");
    Object.entries(timings).forEach(([label, time]) => {
      const percentage = ((time.elapsed / totalTime) * 100).toFixed(1);
      // console.log(`  ${label.padEnd(30)} ${time.elapsed}ms (${percentage}%)`);
    });
    // console.log("=".repeat(50) + "\n");

    // Calculate next step properly
    let nextStep = null;
    if (progressResult.step === 0) {
      // All steps completed
      nextStep = 0;
      //console.log(`✅ All steps completed for driver`);
    } else {
      // Return the current incomplete step as nextStep
      nextStep = progressResult.step;
      //console.log(`🔄 Next incomplete step: ${nextStep}`);
    }

    res.json({
      success: true,
      message: "Information updated successfully",
      nextStep: nextStep,
      status: progressResult.status,
      driver: updatedDriver,
      // Include timing in response (useful for monitoring)
      _performance: {
        totalTime: `${totalTime}ms`,
        breakdown: Object.entries(timings).reduce((acc, [key, val]) => {
          acc[key] = `${val.elapsed}ms`;
          return acc;
        }, {})
      }
    });

  } catch (error) {
    const errorTime = Date.now() - startTime;
    console.error("❌ Update step error:", error);
    console.error(`⏱️  Failed after ${errorTime}ms`);

    if (error.name === "ValidationError") {
      const validationErrors = {};
      Object.keys(error.errors).forEach((key) => {
        validationErrors[key] = error.errors[key].message;
      });
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validationErrors,
      });
    }

    res.status(500).json({
      success: false,
      message: "Failed to update step",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

router.post("/driver/withdraw-request", DriverAuthMiddleware, async (req, res) => {
  try {
    const driverId = req.driver.driverId;
    const { amount, paymentMethod } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Invalid withdrawal amount" });
    }

    // Fetch wallet
    const wallet = await driverWallet.findOne({ driverId });
    if (!wallet) {
      return res.status(404).json({ message: "Wallet not found" });
    }

    // Check minimum hold balance and withdraw amount requirements
    const config = await MinHoldBalance.findOne().sort({ createdAt: -1 });
    const minHoldBalance = config?.minHoldBalance || 0;
    const minWithdrawAmount = config?.minWithdrawAmount || 0;
    const availableBalance = wallet.balance - minHoldBalance;

    if (amount < minWithdrawAmount) {
      return res.status(400).json({
        message: `Minimum withdrawal amount is ₹${minWithdrawAmount}`
      });
    }

    if (availableBalance < amount) {
      return res.status(400).json({
        message: `Insufficient withdrawable balance. Available: ₹${availableBalance}, Hold balance: ₹${minHoldBalance}`
      });
    }

    if (wallet.balance < amount) {
      return res.status(400).json({ message: "Insufficient wallet balance" });
    }

    // Fetch driver bank details from Driver model
    const driver = await Driver.findById(driverId);
    if (!driver) {
      return res.status(404).json({ message: "Driver not found" });
    }

    const bankDetails = {
      bankAccountHolderName: driver.paymentAndSubscription?.bankAccountHolderName || "",
      accountNumber: driver.paymentAndSubscription?.accountNumber || "",
      ifscCode: driver.paymentAndSubscription?.ifscCode || "",
      bankName: driver.paymentAndSubscription?.bankName || "",
      upiId: driver.paymentAndSubscription?.upiId || "",
    };

    // Create withdrawal request
    const withdrawal = await withdrawalRequest.create({
      driverId,
      amount,
      paymentMethod: paymentMethod || "bank_transfer",
      bankDetails, // automatically populated
    });

    // Deduct balance and add transaction
    wallet.balance -= amount;
    wallet.transactions.push({
      type: "withdrawal",
      amount,
      status: "pending",                // ← now status exists
      paymentMethod: paymentMethod || "bank_transfer",
      withdrawalRequestId: withdrawal._id, // ← store reference
      description: "Withdrawal requested by driver",
    });
    await wallet.save();

    res.status(200).json({
      success: true,
      message: "Withdrawal request submitted successfully",
      withdrawalRequest: withdrawal,
    });
  } catch (error) {
    console.error("Withdrawal request error:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});

router.post("/admin/withdrawal/complete",adminAuthMiddleware, async (req, res) => {
  try {
    const { requestId } = req.body;

    if (!requestId) {
      return res.status(400).json({ message: "Withdrawal request ID is required" });
    }

    // Find withdrawal request
    const withdrawal = await withdrawalRequest.findById(requestId);
    if (!withdrawal) {
      return res.status(404).json({ message: "Withdrawal request not found" });
    }

    if (withdrawal.status !== "pending") {
      return res.status(400).json({ message: "Withdrawal request already processed" });
    }

    // Update withdrawal request status to completed
    withdrawal.status = "completed";
    await withdrawal.save();

    // Update driver wallet
    const wallet = await driverWallet.findOne({ driverId: withdrawal.driverId });
    if (wallet) {
      // Update the corresponding transaction
      const txnIndex = wallet.transactions.findIndex(
        (t) => t.withdrawalRequestId?.toString() === requestId
      );
      if (txnIndex !== -1) {
        wallet.transactions[txnIndex].status = "completed"; // ← now it will update correctly
      }

      // Increment totalWithdrawn
      wallet.totalWithdrawn += withdrawal.amount;
      await wallet.save();

    }

    // Send approval notification to driver
    try {
      const driver = await Driver.findById(withdrawal.driverId);
      if (driver) {
        await NotificationService.sendAndStoreDriverNotification(
          withdrawal.driverId,
          driver.oneSignalPlayerId,
          'Withdrawal Approved',
          `Your withdrawal request of ₹${withdrawal.amount} has been approved.`,
          'withdrawal_approved',
          { amount: withdrawal.amount, requestId },
          driver.personalInformation?.category || null,
          null
        );
      }
    } catch (notifError) {
      console.error('Withdrawal approval notification error:', notifError);
    }

    res.json({
      success: true,
      message: "Withdrawal completed successfully",
      withdrawal,
    });
  } catch (error) {
    console.error("Complete withdrawal error:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});

router.post("/admin/withdrawal/reject", adminAuthMiddleware, async (req, res) => {
  try {
    const { requestId, adminRemarks } = req.body;

    if (!requestId) {
      return res.status(400).json({ message: "Withdrawal request ID is required" });
    }

    const withdrawal = await withdrawalRequest.findById(requestId);
    if (!withdrawal) {
      return res.status(404).json({ message: "Withdrawal request not found" });
    }

    if (withdrawal.status !== "pending") {
      return res.status(400).json({ message: "Withdrawal request already processed" });
    }

    // Refund wallet
    const wallet = await driverWallet.findOne({ driverId: withdrawal.driverId });
    if (wallet) {
      wallet.balance += withdrawal.amount;
      
      // Update the corresponding transaction
      const txnIndex = wallet.transactions.findIndex(
        (t) => t.withdrawalRequestId?.toString() === requestId
      );
      if (txnIndex !== -1) {
        wallet.transactions[txnIndex].status = "failed";
        wallet.transactions[txnIndex].adminRemarks = adminRemarks;
      }
      
      await wallet.save();
    }

    // Update withdrawal request
    withdrawal.status = "rejected";
    withdrawal.adminRemarks = adminRemarks;
    await withdrawal.save();

    // Send rejection notification to driver
    try {
      const driver = await Driver.findById(withdrawal.driverId);
      if (driver) {
        await NotificationService.sendAndStoreDriverNotification(
          withdrawal.driverId,
          driver.oneSignalPlayerId,
          'Withdrawal Rejected',
          `Your withdrawal request of ₹${withdrawal.amount} has been rejected.`,
          'withdrawal_rejected',
          { amount: withdrawal.amount, requestId, reason: adminRemarks },
          driver.personalInformation?.category || null,
          null
        );
      }
    } catch (notifError) {
      console.error('Withdrawal rejection notification error:', notifError);
    }

    res.json({
      success: true,
      message: "Withdrawal request rejected successfully",
      withdrawal,
    });
  } catch (error) {
    console.error("Reject withdrawal error:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});

router.delete("/delete-account", DriverAuthMiddleware, async (req, res) => {
  try {
    const driverId = req.driver.driverId;

    // Find driver
    const driver = await Driver.findById(driverId);
    if (!driver) {
      return res.status(404).json({ message: "Driver not found" });
    }

    if (driver.status === "deleted") {
      return res.status(400).json({ message: "Account already deleted" });
    }

    // Find wallet and store current balance for response
    const wallet = await driverWallet.findOne({ driverId });
    let withdrawnAmount = 0;
    
    if (wallet && wallet.balance > 0) {
      withdrawnAmount = wallet.balance;
      
      // Auto-withdraw remaining balance
      wallet.transactions.push({
        type: "withdrawal",
        amount: wallet.balance,
        status: "completed",
        paymentMethod: "bank_transfer",
        description: "Auto-Withdraw on Account Deletion",
      });
      
      wallet.totalWithdrawn += wallet.balance;
      wallet.balance = 0;
      await wallet.save();
    }

    // Mark driver as deleted
    driver.status = "deleted";
    driver.deletedDate = new Date();
    await driver.save();

    res.json({
      success: true,
      message: "Account deleted successfully",
      withdrawnAmount
    });
  } catch (error) {
    console.error("Delete account error:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});

// Get all minimum hold balance entries
router.get("/admin/min-withdraw-balance/all",adminAuthMiddleware, async (req, res) => {
  try {
    const entries = await MinHoldBalance.find().sort({ createdAt: -1 });
    res.json({
      success: true,
      data: entries
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create new minimum hold balance entry
router.post("/admin/min-withdraw-balance", adminAuthMiddleware, async (req, res) => {
  try {
    const { minHoldBalance, minWithdrawAmount, minDepositAmount } = req.body;

    if (minHoldBalance < 0 || minWithdrawAmount < 0 || minDepositAmount < 0) {
      return res.status(400).json({ message: "Values cannot be negative" });
    }

    // Create new config (latest entry becomes active)
    const newConfig = await MinHoldBalance.create({
      minHoldBalance: minHoldBalance || 0,
      minWithdrawAmount: minWithdrawAmount || 0,
      minDepositAmount: minDepositAmount || 0
    });

    res.json({
      success: true,
      message: "New wallet configuration created successfully",
      data: newConfig
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get driver wallet info with minimum balance
router.get("/driver/wallet-info", DriverAuthMiddleware, async (req, res) => {
  try {
    const driverId = req.driver.driverId;

    const wallet = await driverWallet.findOne({ driverId });
    if (!wallet) {
      return res.status(404).json({ message: "Wallet not found" });
    }

    const config = await MinHoldBalance.findOne().sort({ createdAt: -1 });
    const minHoldBalance = config?.minHoldBalance || 0;
    const minWithdrawAmount = config?.minWithdrawAmount || 0;
    const availableBalance = wallet.balance - minHoldBalance;

    res.json({
      success: true,
      data: {
        totalBalance: wallet.balance,
        minHoldBalance,
        minWithdrawAmount,
        availableBalance: Math.max(0, availableBalance),
        totalEarnings: wallet.totalEarnings,
        totalWithdrawn: wallet.totalWithdrawn
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/transactions/pending", DriverAuthMiddleware, async (req, res) => {
  try {
    const driverId = req.driver?.driverId;

    const wallet = await driverWallet.findOne({ driverId });
    if (!wallet) return res.status(200).json({ success: true, balance: 0, data: [] });

    const transactions = wallet.transactions.filter(txn => txn.status === "pending").sort((a, b) => b.createdAt - a.createdAt);
    res.json({ success: true, balance: wallet.balance, data: transactions });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/transactions/completed", DriverAuthMiddleware, async (req, res) => {
  try {
    const driverId = req.driver?.driverId;

    const wallet = await driverWallet.findOne({ driverId });
    if (!wallet) return res.status(200).json({ success: true, balance: 0, data: [] });

    const transactions = wallet.transactions.filter(txn => txn.status === "completed").sort((a, b) => b.createdAt - a.createdAt);
    res.json({ success: true, balance: wallet.balance, data: transactions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/transactions/failed", DriverAuthMiddleware, async (req, res) => {
  try {
    const driverId = req.driver?.driverId;

    const wallet = await driverWallet.findOne({ driverId });
    if (!wallet) return res.status(200).json({ success: true, balance: 0, data: [] });

    const transactions = wallet.transactions.filter(txn => txn.status === "failed").sort((a, b) => b.createdAt - a.createdAt);
    res.json({ success: true, balance: wallet.balance, data: transactions });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/transactions/all",adminAuthMiddleware, async (req, res) => {
  try {
    const wallets = await driverWallet.find()
      .populate("driverId", "personalInformation.fullName mobile")
      .sort({ createdAt: -1 });

    const allTransactions = wallets.flatMap(wallet =>
      wallet.transactions.map(tx => ({
        ...tx.toObject(),
        driver: wallet.driverId,
      }))
    );

    allTransactions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.status(200).json({ success: true, data: allTransactions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/transactions/stats", adminAuthMiddleware, async (req, res) => {
  try {
    const pipeline = [
      {
        $lookup: {
          from: "drivers",
          localField: "driverId",
          foreignField: "_id",
          as: "driverId"
        }
      },
      { $unwind: "$driverId" },
      { $unwind: "$transactions" },
      {
        $group: {
          _id: null,
          totalTransactions: { $sum: 1 },
          completedCount: {
            $sum: { $cond: [{ $eq: ["$transactions.status", "completed"] }, 1, 0] }
          },
          totalEarnings: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$transactions.type", "ride_payment"] },
                    { $eq: ["$transactions.status", "completed"] }
                  ]
                },
                "$transactions.amount",
                0
              ]
            }
          },
          totalWithdrawals: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ["$transactions.type", "withdrawal"] },
                    { $eq: ["$transactions.status", "completed"] }
                  ]
                },
                "$transactions.amount",
                0
              ]
            }
          }
        }
      }
    ];

    const result = await driverWallet.aggregate(pipeline);
    const stats = result[0] || {
      totalTransactions: 0,
      completedCount: 0,
      totalEarnings: 0,
      totalWithdrawals: 0
    };

    res.status(200).json({ success: true, stats });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/transactions/paginated", adminAuthMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";
    const skip = (page - 1) * limit;

    let matchQuery = {};
    if (search) {
      matchQuery = {
        $or: [
          { "driverId.personalInformation.fullName": { $regex: search, $options: "i" } },
          { "driverId.mobile": { $regex: search, $options: "i" } },
          { "transactions.type": { $regex: search, $options: "i" } },
          { "transactions.description": { $regex: search, $options: "i" } }
        ]
      };
    }

    const pipeline = [
      {
        $lookup: {
          from: "drivers",
          localField: "driverId",
          foreignField: "_id",
          as: "driverId"
        }
      },
      { $unwind: "$driverId" },
      { $unwind: "$transactions" },
      ...(search ? [{ $match: matchQuery }] : []),
      {
        $addFields: {
          "transactions.driver": "$driverId"
        }
      },
      {
        $replaceRoot: {
          newRoot: "$transactions"
        }
      },
      { $sort: { createdAt: -1 } }
    ];

    const [transactions, totalCount] = await Promise.all([
      driverWallet.aggregate([
        ...pipeline,
        { $skip: skip },
        { $limit: limit }
      ]),
      driverWallet.aggregate([
        ...pipeline,
        { $count: "total" }
      ])
    ]);

    const totalRecords = totalCount[0]?.total || 0;

    res.status(200).json({
      success: true,
      data: transactions,
      totalRecords,
      currentPage: page,
      totalPages: Math.ceil(totalRecords / limit),
      recordsPerPage: limit
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Reference OTP endpoints
router.post("/reference/send-otp",DriverAuthMiddleware, async (req, res) => {
  // console.log("SID =>", process.env.KALEYRA_SID);
  // console.log("API KEY =>", process.env.KALEYRA_API_KEY);
  // console.log("SENDER ID =>", process.env.KALEYRA_SENDER_ID);
  // console.log("TEMPLATE ID =>", process.env.KALEYRA_TEMPLATE_ID);

  try {
    const { mobile } = req.body;

    if (!mobile) {
      return res.status(400).json({ message: "Mobile number is required" });
    }

    const mobileStr = String(mobile).trim();

    if (!/^\d{10}$/.test(mobileStr) && !/^\+91\d{10}$/.test(mobileStr)) {
      return res.status(400).json({ message: "Invalid mobile number format" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);

    const otpSession = new DriverReferanceOtpSession({
      mobile: mobileStr,
      otp,
      otpExpiresAt
    });
    await otpSession.save();

    const toNumber = mobileStr.startsWith("+") ? mobileStr : `+91${mobileStr}`;
    const apiUrl = `https://api.kaleyra.io/v1/${process.env.KALEYRA_SID}/messages`;

    const payload = {
      to: toNumber,
      sender: process.env.KALEYRA_SENDER_ID,
      type: "TXN",
      template_id: process.env.KALEYRA_TEMPLATE_ID,
      body: `DriveGo OTP is booking confirmation or registration: ${otp}`,
      template_params: otp,
    };

    await axios.post(apiUrl, payload, {
      headers: {
        "api-key": process.env.KALEYRA_API_KEY,
        "Content-Type": "application/json",
      },
    });

    res.json({
      success: true,
      message: "OTP sent successfully"
    });
  } catch (error) {
    console.error("Reference send OTP error:", error.response?.data || error.message);
    res.status(500).json({
      success: false,
      message: "Failed to send OTP",
      error: error.response?.data || error.message,
    });
  }
});

router.post("/reference/verify-otp",DriverAuthMiddleware, async (req, res) => {
  try {
    const { mobile, otp } = req.body;

    if (!mobile || !otp) {
      return res.status(400).json({ message: "Mobile & OTP required" });
    }

    const mobileStr = String(mobile).trim();

    const otpSession = await DriverReferanceOtpSession.findOne({
      mobile: mobileStr,
      isVerified: false
    }).sort({ createdAt: -1 });

    if (!otpSession) {
      return res.status(400).json({
        success: false,
        message: "No OTP found. Please request a new OTP."
      });
    }

    if (new Date() > otpSession.otpExpiresAt) {
      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new OTP."
      });
    }

    if (otpSession.otp != otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP"
      });
    }

    otpSession.isVerified = true;
    await otpSession.save();

    res.json({
      success: true,
      message: "OTP verified successfully",
      mobile: mobileStr
    });
  } catch (error) {
    console.error("Reference verify OTP error:", error);
    res.status(500).json({
      success: false,
      message: "OTP verification failed",
      error: error.message
    });
  }
});

// Admin: Create driver incentive
router.post("/admin/create-incentive",adminAuthMiddleware, async (req, res) => {
  try {
    const { driverIds, amount, description } = req.body;

    if (!driverIds || !Array.isArray(driverIds) || driverIds.length === 0) {
      return res.status(400).json({ message: "Driver IDs array is required" });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Valid incentive amount is required" });
    }

    if (!description || description.trim() === "") {
      return res.status(400).json({ message: "Description is required" });
    }

    // Create incentive record
    const incentive = await DriverIncentive.create({
      drivers: driverIds,
      amount,
      description: description.trim()
    });

    const results = [];

    for (const driverId of driverIds) {
      try {
        // Find or create wallet
        let wallet = await driverWallet.findOne({ driverId });
        if (!wallet) {
          wallet = await driverWallet.create({
            driverId,
            balance: 0,
            totalEarnings: 0,
            totalWithdrawn: 0,
            totalDeductions: 0,
            totalIncentives: 0,
            transactions: []
          });
        }

        // Add incentive to wallet
        wallet.balance += amount;
        wallet.totalIncentives += amount;
        wallet.transactions.push({
          type: "incentive",
          amount,
          status: "completed",
          description: description.trim(),
          adminRemarks: "Incentive added by admin"
        });

        await wallet.save();
        results.push({ driverId, success: true });
      } catch (error) {
        console.error(`Error adding incentive for driver ${driverId}:`, error);
        results.push({ driverId, success: false, error: error.message });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    res.json({
      success: true,
      message: `Incentive processed: ${successCount} successful, ${failCount} failed`,
      results,
      incentiveId: incentive._id,
      summary: {
        total: driverIds.length,
        successful: successCount,
        failed: failCount,
        amount,
        description
      }
    });
  } catch (error) {
    console.error("Create incentive error:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});

// Get incentive history
router.get("/admin/incentive-history", adminAuthMiddleware, async (req, res) => {
  try {
    const incentives = await DriverIncentive.find()
      .populate("drivers", "personalInformation.fullName mobile")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: incentives });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Admin: Suspend drivers
router.post("/admin/suspend-drivers", adminAuthMiddleware, async (req, res) => {
  try {
    const { driverIds, suspendFrom, suspendTo, description } = req.body;

    if (!driverIds || !Array.isArray(driverIds) || driverIds.length === 0) {
      return res.status(400).json({ message: "Driver IDs array is required" });
    }

    if (!suspendFrom || !suspendTo) {
      return res.status(400).json({ message: "Suspend dates are required" });
    }

    if (!description || description.trim() === "") {
      return res.status(400).json({ message: "Description is required" });
    }

    const fromDate = new Date(suspendFrom);
    const toDate = new Date(suspendTo);

    if (toDate <= fromDate) {
      return res.status(400).json({ message: "Suspend To date must be after Suspend From date" });
    }

    // Create suspend record
    const suspend = await DriverSuspend.create({
      drivers: driverIds,
      suspendFrom: fromDate,
      suspendTo: toDate,
      description: description.trim()
    });

    const results = [];

    for (const driverId of driverIds) {
      try {
        const driver = await Driver.findById(driverId);
        if (!driver) {
          results.push({ driverId, success: false, error: "Driver not found" });
          continue;
        }

        // Update driver status to Suspended
        driver.status = "Suspended";
        await driver.save();

        // Send suspension notification
        try {
          await NotificationService.sendAndStoreDriverNotification(
            driverId,
            driver.oneSignalPlayerId,
            'Account Suspended',
            `Your account has been suspended from ${fromDate.toLocaleDateString()} to ${toDate.toLocaleDateString()}. Reason: ${description.trim()}`,
            'account_suspended',
            { suspendFrom: fromDate, suspendTo: toDate, description: description.trim() },
            driver.personalInformation?.category || null,
            null
          );
        } catch (notifError) {
          console.error('Suspension notification error:', notifError);
        }

        results.push({ driverId, success: true });
      } catch (error) {
        console.error(`Error suspending driver ${driverId}:`, error);
        results.push({ driverId, success: false, error: error.message });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    res.json({
      success: true,
      message: `Suspension processed: ${successCount} successful, ${failCount} failed`,
      results,
      suspendId: suspend._id,
      summary: {
        total: driverIds.length,
        successful: successCount,
        failed: failCount,
        suspendFrom: fromDate,
        suspendTo: toDate,
        description
      }
    });
  } catch (error) {
    console.error("Suspend drivers error:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});

// Get suspend history
router.get("/admin/suspend-history", adminAuthMiddleware, async (req, res) => {
  try {
    const suspensions = await DriverSuspend.find()
      .populate("drivers", "personalInformation.fullName mobile")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: suspensions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post("/create-order",DriverAuthMiddleware, async (req, res) => {
  try {
    const { amount, currency, receipt, notes } = req.body;

    if (!amount) {
      return res.status(400).json({
        success: false,
        message: "Amount is required",
      });
    }

    const options = {
      amount: amount * 100,          // ₹ to paise
      currency: currency || "INR",
      receipt: receipt || `rcpt_${Date.now()}`,

      // 🔥 THIS ENABLES AUTO CAPTURE
      payment_capture: 1,

      notes: notes || {},            // { type, driverId, ... }
    };



    const order = await razorpay.orders.create(options);

    // order has: id, amount, currency, status, notes, etc.
    return res.json({
      success: true,
      orderId: order.id,
      amount: order.amount,          // in paise
      currency: order.currency,
      raw: order,                    // optional: for debugging
    });
  } catch (err) {
    console.error("Create order error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to create order",
      error: err.message || err.toString(),
    });
  }
});

// Deposit money to driver wallet
router.post("/deposit", DriverAuthMiddleware, async (req, res) => {
  try {
    const { amount, paymentId } = req.body;
    const driverId = req.driver.driverId;



    if (!amount) {
      return res.status(400).json({ message: "Amount is required" });
    }



    if (amount <= 0) {
      return res.status(400).json({ message: "Amount must be greater than 0" });
    }

    // Check minimum deposit amount
    const config = await MinHoldBalance.findOne().sort({ createdAt: -1 });
    //const minDepositAmount = config?.minDepositAmount || 0;
    const minDepositAmount = 1; // Set to 1 for testing purposes
    
    if (amount < minDepositAmount) {
      return res.status(400).json({ 
        message: `Minimum deposit amount is ₹${minDepositAmount}` 
      });
    }

    // Find or create wallet
    let wallet = await driverWallet.findOne({ driverId });
    if (!wallet) {
      wallet = await driverWallet.create({
        driverId,
        balance: 0,
        totalEarnings: 0,
        totalWithdrawn: 0,
        totalDeductions: 0,
        totalIncentives: 0,
        transactions: []
      });
    }

    // Check if transaction already exists (webhook processed first)
    const existingTransaction = wallet.transactions.find(
      t => t.razorpayPaymentId === paymentId
    );
    
    if (existingTransaction) {
      return res.status(400).json({ 
        message: "This payment has already been processed" 
      });
    }

    // Create pending transaction - webhook will update status later
    const transaction = {
      type: "deposit",
      amount,
      status: "pending",
      razorpayPaymentId: paymentId,
      description: "Wallet deposit initiated, awaiting webhook confirmation",
      paymentMethod: "razorpay"
    };

    wallet.transactions.push(transaction);
    await wallet.save();

    res.json({
      success: true,
      message: "Deposit initiated, awaiting payment confirmation",
      transaction: wallet.transactions[wallet.transactions.length - 1],
      walletBalance: wallet.balance
    });
  } catch (error) {
    console.error("Deposit error:", error);
    res.status(500).json({ success: false, message: "Deposit failed", error: error.message });
  }
});

// Webhook for Razorpay payment updates
router.post("/webhook", async (req, res) => {
  try {
    const webhookPayload = req.body;
    console.log("Razorpay Webhook received:", webhookPayload);
    const receivedSignature = req.headers['x-razorpay-signature'];
    
    // Verify webhook signature
    if (!receivedSignature) {
      return res.status(400).json({ error: "Missing webhook signature" });
    }

    const crypto = require('crypto');
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    
    if (!webhookSecret) {
      console.error('⚠️ RAZORPAY_WEBHOOK_SECRET not configured');
      return res.status(500).json({ error: "Webhook secret not configured" });
    }

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(JSON.stringify(webhookPayload))
      .digest('hex');

    if (receivedSignature !== expectedSignature) {
      console.error('⚠️ Invalid webhook signature');
      return res.status(400).json({ error: "Invalid webhook signature" });
    }


    
    // Extract payment info from Razorpay webhook payload
    const event = webhookPayload.event;
    const paymentEntity = webhookPayload.payload?.payment?.entity;
    const orderEntity = webhookPayload.payload?.order?.entity;
    
    if (!paymentEntity || !paymentEntity.id) {
      return res.status(400).json({ error: "Invalid webhook payload" });
    }

    const payment_id = paymentEntity.id;
    const status = paymentEntity.status;
    const webhookAmount = paymentEntity.amount ? paymentEntity.amount / 100 : null; // Convert paise to rupees
    
    // Get payment notes from order or payment entity
    const notes = orderEntity?.notes || paymentEntity.notes || {};
    


    // Only process final payment events
    const supportedEvents = ['payment.captured', 'payment.failed', 'payment.refunded'];
    if (!supportedEvents.includes(event)) {
      return res.json({ status: 'ignored', event, reason: 'Unsupported event type' });
    }

    const result = await processDeposit(payment_id, status, webhookAmount, notes);
    
    if (result.success) {
      return res.json({ status: 'ok', event, verified: true, result: result.details });
    } else {
      return res.json({ status: 'error', event, error: result.error });
    }

  } catch (error) {
    console.error("Webhook error:", error);
    res.status(500).json({ error: "Webhook processing failed" });
  }
});

module.exports = router;