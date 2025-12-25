const express = require("express");
const router = express.Router();
const Rider = require("../models/Rider");
const OtpSession = require("../models/OtpSession");
const { Wallet } = require("../models/Payment&Wallet");
const twilio = require("twilio");
const jwt = require("jsonwebtoken");
const Session = require("../models/Session");
const authMiddleware = require("../middleware/authMiddleware");
const { createSession } = require("../Services/sessionService");
const axios = require("axios");
const Razorpay = require('razorpay');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const AuthMiddleware = require("../middleware/authMiddleware");

// Configure multer for memory storage with file size limit
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>             User app                >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

// Update rider profile data (multiple fields at once)
router.put("/userApp/update", upload.single('profilePhoto'), authMiddleware, async (req, res) => {
  try {
    const updates = req.body; // expect full object { name, email, mobile, gender, referralCode }

    // console.log("Update request body:", updates);

    // Handle profile photo upload (file)
    if (req.file) {
      const uploadPath = path.join(__dirname, '../cloud/images');
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }

      const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(req.file.originalname || '.jpg');
      const filePath = path.join(uploadPath, uniqueName);
      fs.writeFileSync(filePath, req.file.buffer);

      updates.profilePhoto = `https://adminbackend.hire4drive.com/app/cloud/images/${uniqueName}`;
    }

    // Handle base64 profile photo
    if (updates.profilePhoto && updates.profilePhoto.startsWith('data:image/')) {
      try {
        const base64Data = updates.profilePhoto.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');

        const uploadPath = path.join(__dirname, '../cloud/images');
        if (!fs.existsSync(uploadPath)) {
          fs.mkdirSync(uploadPath, { recursive: true });
        }

        const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + '.webp';
        const filePath = path.join(uploadPath, uniqueName);
        fs.writeFileSync(filePath, buffer);

        updates.profilePhoto = `https://adminbackend.hire4drive.com/app/cloud/images/${uniqueName}`;
      } catch (error) {
        return res.status(400).json({ success: false, message: "Invalid base64 image data" });
      }
    }

    // Allowed fields to protect against unwanted updates (e.g., password, _id)
    const allowedFields = ["name", "mobile", "gender", "email", "profilePhoto"];
    const invalidFields = Object.keys(updates).filter(f => !allowedFields.includes(f));

    if (invalidFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Invalid fields: ${invalidFields.join(", ")}`
      });
    }

    // Trim all string fields
    for (const key in updates) {
      if (typeof updates[key] === "string") {
        updates[key] = updates[key].trim();
      }
    }

    // === Field-specific validations ===
    if (updates.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(updates.email)) {
        return res.status(400).json({ success: false, message: "Invalid email format" });
      }

      // Check for duplicate email
      const existingEmail = await Rider.findOne({
        email: updates.email,
        _id: { $ne: req.rider.riderId }
      });
      if (existingEmail) {
        return res.status(400).json({ success: false, message: "Email already in use" });
      }
    }

    if (updates.mobile) {
      const mobileRegex = /^[6-9]\d{9}$/;
      if (!mobileRegex.test(updates.mobile)) {
        return res.status(400).json({ success: false, message: "Invalid mobile number format" });
      }

      // Check for duplicate mobile
      const existingMobile = await Rider.findOne({
        mobile: updates.mobile,
        _id: { $ne: req.rider.riderId }
      });
      if (existingMobile) {
        return res.status(400).json({ success: false, message: "Mobile number already in use" });
      }
    }

    if (updates.name) {
      if (updates.name.length < 2 || updates.name.length > 50) {
        return res.status(400).json({ success: false, message: "Name must be between 2 and 50 characters" });
      }
    }

    if (updates.gender) {
      if (!["male", "female", "other"].includes(updates.gender)) {
        return res.status(400).json({ success: false, message: "Invalid gender value" });
      }
    }



    // === Perform update ===
    const updatedRider = await Rider.findByIdAndUpdate(
      req.rider.riderId,
      { $set: updates }, // ✅ update all provided fields
      { new: true, runValidators: true }
    ).select("-password");

    if (!updatedRider) {
      return res.status(404).json({ success: false, message: "Rider not found" });
    }

    res.json({
      success: true,
      rider: updatedRider,
      message: "Profile updated successfully"
    });
  } catch (err) {
    console.error("Update profile error:", err);

    if (err.name === "ValidationError") {
      const errorMessages = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({
        success: false,
        message: `Validation failed: ${errorMessages.join(", ")}`
      });
    }

    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`
      });
    }

    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.post("/create-order", authMiddleware, async (req, res) => {
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

// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>             User Web            >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

// Get all riders with non-empty names
router.get("/completeProfile", async (req, res) => {
  try {
    const riders = await Rider.find({
      name: { $ne: "" },
      gender: { $ne: "" }   // <-- added gender filter
    }).sort({ createdAt: -1 });

    const ridersWithWallet = await Promise.all(riders.map(async (rider) => {
      const wallet = await Wallet.findOne({ riderId: rider._id });
      return {
        ...rider.toObject(),
        wallet: {
          totalDeposited: wallet?.totalDeposited || 0,
          totalSpent: wallet?.totalSpent || 0,
          balance: wallet?.balance || 0
        }
      };
    }));

    res.json({ success: true, data: ridersWithWallet });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/inCompleteProfile", async (req, res) => {
  try {
    const riders = await Rider.find({ name: "", gender: "" }).sort({ createdAt: -1 });

    const ridersWithWallet = await Promise.all(riders.map(async (rider) => {
      const wallet = await Wallet.findOne({ riderId: rider._id });
      return {
        ...rider.toObject(),
        wallet: {
          totalDeposited: wallet?.totalDeposited || 0,
          totalSpent: wallet?.totalSpent || 0,
          balance: wallet?.balance || 0
        }
      };
    }));

    res.json({ success: true, data: ridersWithWallet });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/all", async (req, res) => {
  try {
    const riders = await Rider.find({}).sort({ createdAt: -1 });

    const ridersWithWallet = await Promise.all(riders.map(async (rider) => {
      const wallet = await Wallet.findOne({ riderId: rider._id });
      return {
        ...rider.toObject(),
        wallet: {
          totalDeposited: wallet?.totalDeposited || 0,
          totalSpent: wallet?.totalSpent || 0,
          balance: wallet?.balance || 0
        }
      };
    }));

    res.json({ success: true, data: ridersWithWallet });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/auth/check", (req, res) => {
  // Get token from "Authorization: Bearer <token>"
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  // console.log("Checking auth token from headers:", token);

  if (!token) return res.json({ loggedIn: false });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET_USER);
    res.json({ loggedIn: true, user: decoded });
  } catch (err) {
    console.error("Invalid or expired token:", err.message);
    res.json({ loggedIn: false });
  }
});

// ✅ Find rider by ID from token
router.get("/find-rider", authMiddleware, async (req, res) => {
  try {
    const riderId = req.rider.riderId;

    if (!riderId) {
      return res.status(400).json({ success: false, message: "RiderId missing in token" });
    }

    const rider = await Rider.findById(riderId)
      .select('name mobile gender email referralCode ratings.avgRating referralEarning referrals')
      .populate('referrals.riderId', 'name')
      .populate('referralEarning.history.rideId', '_id');

    if (!rider) {
      return res.status(200).json({ success: false, message: "Rider not found" });
    }

    res.status(200).json({
      success: true,
      rider: {
        ...rider.toObject(),
        avgRating: rider.ratings?.avgRating || 0,
        totalReferrals: rider.referrals?.length || 0,
        totalEarnings: rider.referralEarning?.totalEarnings || 0,
        currentBalance: rider.referralEarning?.currentBalance || 0
      },
    });
  } catch (error) {
    console.error("Error finding rider:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

//update rider profile data
router.put("/update", upload.single('profilePhoto'), authMiddleware, async (req, res) => {
  try {
    const { field, value } = req.body;
    let updateData = {};

    // Handle profile photo upload
    if (req.file) {
      const uploadPath = path.join(__dirname, '../cloud/images');
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }

      const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(req.file.originalname || '.jpg');
      const filePath = path.join(uploadPath, uniqueName);
      fs.writeFileSync(filePath, req.file.buffer);

      updateData.profilePhoto = `https://adminbackend.hire4drive.com/app/cloud/images/${uniqueName}`;
    }

    // If only uploading photo, skip field validation
    if (req.file && !field) {
      const updatedRider = await Rider.findByIdAndUpdate(
        req.rider.riderId,
        { $set: updateData },
        { new: true, runValidators: true }
      ).select("-password");

      if (!updatedRider) {
        return res.status(404).json({ success: false, message: "Rider not found" });
      }

      return res.json({
        success: true,
        rider: updatedRider,
        message: "Profile photo updated successfully"
      });
    }

    // Validate field
    const allowedFields = ["name", "mobile", "gender", "email"];
    if (!allowedFields.includes(field)) {
      return res.status(400).json({ success: false, message: "Invalid field" });
    }

    // Validate value is not empty
    if (!value || !value.toString().trim()) {
      return res.status(400).json({ success: false, message: "Field value cannot be empty" });
    }

    const trimmedValue = value.toString().trim();
    updateData[field] = trimmedValue;

    // Field-specific validation
    if (field === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedValue)) {
        return res.status(400).json({ success: false, message: "Invalid email format" });
      }

      // Check if email already exists
      const existingEmail = await Rider.findOne({
        email: trimmedValue,
        _id: { $ne: req.rider.riderId },
        status: { $ne: "deleted" }
      });
      if (existingEmail) {
        return res.status(400).json({ success: false, message: "Email already in use" });
      }
    }

    if (field === 'mobile') {
      const mobileRegex = /^[6-9]\d{9}$/; // Indian mobile number format
      if (!mobileRegex.test(trimmedValue)) {
        return res.status(400).json({ success: false, message: "Invalid mobile number format" });
      }

      // Check if mobile already exists
      const existingMobile = await Rider.findOne({
        mobile: trimmedValue,
        _id: { $ne: req.rider.riderId },
        status: { $ne: "deleted" }
      });
      if (existingMobile) {
        return res.status(400).json({ success: false, message: "Mobile number already in use" });
      }
    }

    if (field === 'name') {
      if (trimmedValue.length < 2 || trimmedValue.length > 50) {
        return res.status(400).json({ success: false, message: "Name must be between 2 and 50 characters" });
      }
    }

    if (field === 'gender') {
      if (!['male', 'female', 'other'].includes(trimmedValue)) {
        return res.status(400).json({ success: false, message: "Invalid gender value" });
      }
    }

    // Find and update using $set
    const updatedRider = await Rider.findByIdAndUpdate(
      req.rider.riderId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).select("-password"); // exclude password if exists

    if (!updatedRider) {
      return res.status(404).json({ success: false, message: "Rider not found" });
    }

    res.json({
      success: true,
      rider: updatedRider,
      message: `${field.charAt(0).toUpperCase() + field.slice(1)} updated successfully`
    });
  } catch (err) {
    console.error("Update profile error:", err);

    // Handle validation errors
    if (err.name === 'ValidationError') {
      const errorMessages = Object.values(err.errors).map(error => error.message);
      return res.status(400).json({
        success: false,
        message: `Validation failed: ${errorMessages.join(', ')}`
      });
    }

    // Handle duplicate key errors (if you have unique indexes)
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`
      });
    }

    res.status(500).json({ success: false, message: "Server error" });
  }
});

//delete rider 
router.post("/delete-rider", async (req, res) => {
  try {
    const { mobile } = req.body;

    if (!mobile) {
      return res.status(400).json({ success: false, message: "Mobile is required" });
    }

    // Soft delete by updating status to 'deleted'
    const deletedRider = await Rider.findOneAndUpdate(
      { mobile, status: { $ne: "deleted" } },
      { status: "deleted" },
      { new: true }
    );

    if (!deletedRider) {
      return res.status(404).json({ success: false, message: "Rider not found or already deleted" });
    }

    // Remove sessions and clear cookies
    await Session.deleteMany({ mobileNumber: mobile });
    res.clearCookie('authToken');

    res.status(200).json({
      success: true,
      message: "Rider deleted successfully",
      deletedRider,
    });
  } catch (error) {
    console.error("Error deleting rider:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

//delete rider 
router.delete("/userApp/delete-rider", AuthMiddleware, async (req, res) => {
  try {
    const riderId = req.rider.riderId;

    if (!riderId) {
      return res.status(400).json({ success: false, message: "Mobile is required" });
    }

    // Soft delete by updating status to 'deleted'
    const deletedRider = await Rider.findOneAndUpdate(
      { _id: riderId, status: { $ne: "deleted" } },
      { status: "deleted" },
      { new: true }
    );

    if (!deletedRider) {
      return res.status(404).json({ success: false, message: "Rider not found or already deleted" });
    }

    res.status(200).json({
      success: true,
      message: "Rider deleted successfully",
      deletedRider,
    });
  } catch (error) {
    console.error("Error deleting rider:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// dummy otp generation
router.post("/send-otp", async (req, res) => {
  try {
    const { mobile } = req.body;
    if (!mobile) {
      return res.status(400).json({ message: "Mobile number is required" });
    }

    // Use dummy OTP for testing
    const otp = "123456";
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);

    // Ensure Rider exists
    let rider = await Rider.findOne({ mobile });
    if (rider && rider.status === "deleted") {
      return res.status(400).json({ success:false , message: "Rider is already deleted" });
    }
    if (!rider) {
      rider = new Rider({ mobile });
      await rider.save();
    }
    // Save OTP session
    const otpSession = new OtpSession({
      rider: rider._id,
      mobile,
      otp,
      otpExpiresAt
    });
    await otpSession.save();

    res.json({
      success: true,
      message: "Dummy OTP generated successfully",
      otp // ⚠️ expose only in dev/testing
    });
  } catch (error) {
    console.error("Send OTP error:", error.message);
    res.status(500).json({ success: false, message: "Failed to generate OTP" });
  }
});

router.post("/verify-otp", async (req, res) => {
  try {
    const { mobile, otp, playerId } = req.body;
    if (!mobile || !otp) {
      return res.status(400).json({ message: "Mobile & OTP required" });
    }

    // 🔒 Check against fixed dummy OTP
    if (otp !== "123456") {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    // Mark last OTP as verified (optional but clean)
    await OtpSession.findOneAndUpdate(
      { mobile },
      { isVerified: true },
      { sort: { createdAt: -1 } }
    );

    // Ensure Rider exists
    let rider = await Rider.findOne({ mobile, status: { $ne: "deleted" } });
    if (!rider) {
      rider = new Rider({ mobile });
      await rider.save();
    }

    // Store OneSignal playerId if provided
    if (playerId) {
      rider.oneSignalPlayerId = playerId;
      await rider.save();
    }

    const isNew = !rider.name;

    // Generate JWT
    const token = jwt.sign(
      { riderId: rider._id, mobile: rider.mobile },
      process.env.JWT_SECRET_USER,
      { expiresIn: "7d" }
    );

    // Store session
    await createSession(mobile, token);

    res.json({
      success: true,
      token,
      isNew,
      rider
    });
  } catch (error) {
    console.error("Verify OTP error:", error);
    res.status(500).json({ success: false, message: "OTP verification failed" });
  }
});

// Web version with cookie authentication
router.post("/web/verify-otp", async (req, res) => {
  try {
    const { mobile, otp, playerId } = req.body;
    if (!mobile || !otp) {
      return res.status(400).json({ message: "Mobile & OTP required" });
    }

    // Block Postman/cURL from setting cookies
    const userAgent = req.headers['user-agent'] || '';
    const isPostmanOrCurl = userAgent.includes('Postman') || userAgent.includes('curl') || userAgent.includes('insomnia');
    
    if (isPostmanOrCurl) {
      return res.status(403).json({ 
        success: false, 
        message: "Cookie authentication not allowed for API testing tools" 
      });
    }

    // 🔒 Check against fixed dummy OTP
    if (otp !== "123456") {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    // Mark last OTP as verified (optional but clean)
    await OtpSession.findOneAndUpdate(
      { mobile },
      { isVerified: true },
      { sort: { createdAt: -1 } }
    );

    // Ensure Rider exists
    let rider = await Rider.findOne({ mobile, status: { $ne: "deleted" } });
    if (!rider) {
      rider = new Rider({ mobile });
      await rider.save();
    }

    // Store OneSignal playerId if provided
    if (playerId) {
      rider.oneSignalPlayerId = playerId;
      await rider.save();
    }

    const isNew = !rider.name;

    // Generate JWT
    const token = jwt.sign(
      { riderId: rider._id, mobile: rider.mobile },
      process.env.JWT_SECRET_USER,
      { expiresIn: "7d" }
    );

    // Store session
    await createSession(mobile, token);

    // Set token in httpOnly cookie
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    };

    // Different config for development vs production
    if (process.env.NODE_ENV === 'production') {
      cookieOptions.sameSite = 'none';
      cookieOptions.domain = '.hire4drive.com';
    } else {
      // Development - works with localhost
      cookieOptions.sameSite = 'lax';
      // No domain restriction for localhost testing
    }

    res.cookie('authToken', token, cookieOptions);

    res.json({
      success: true,
      isNew,
      rider
    });
  } catch (error) {
    console.error("Verify OTP error:", error);
    res.status(500).json({ success: false, message: "OTP verification failed" });
  }
});

/*
//kaleyra integration
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

    // ✅ Ensure rider exists
    let rider = await Rider.findOne({ mobile: mobileStr });
        if(rider && rider.status === "deleted") {
      return res.status(400).json({ success:false , message: "Rider is already deleted" });
    }
    if (!rider) {
      rider = new Rider({ mobile: mobileStr });
      await rider.save();
    }

    // ✅ Save OTP session in DB
    await new OtpSession({
      rider: rider._id,
      mobile: mobileStr,
      otp,
      otpExpiresAt,
    }).save();

    // ✅ Format phone number correctly
    const toNumber = mobileStr.startsWith("+") ? mobileStr : `+91${mobileStr}`;

    // ✅ Build Kaleyra API URL
    const apiUrl = `https://api.kaleyra.io/v1/${process.env.KALEYRA_SID}/messages`;

    // ✅ CORRECT PAYLOAD: body is mandatory, template_params as string
    const payload = {
      to: toNumber,
      sender: process.env.KALEYRA_SENDER_ID,
      type: "TXN",
      template_id: process.env.KALEYRA_TEMPLATE_ID,
      body: `DriveGo OTP is booking confirmation or registration: ${otp}`,
      template_params: otp, // ✅ Just the string value, not object or array
    };

    // console.log("Payload sent to Kaleyra =>", JSON.stringify(payload, null, 2));

    // ✅ Send OTP via Kaleyra
    const response = await axios.post(apiUrl, payload, {
      headers: {
        "api-key": process.env.KALEYRA_API_KEY,
        "Content-Type": "application/json",
      },
    });

    // ✅ Respond success
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

//kaleyra integration
router.post("/verify-otp", async (req, res) => {
  try {
    const { mobile, otp, playerId } = req.body;

    // ✅ Validate input
    if (!mobile || !otp) {
      return res.status(400).json({ message: "Mobile & OTP required" });
    }

    // ✅ Convert mobile to string
    const mobileStr = String(mobile).trim();

    // ✅ Find the latest OTP session for this mobile
    const otpSession = await OtpSession.findOne({
      mobile: mobileStr,
      isVerified: false
    }).sort({ createdAt: -1 });

    // ✅ Check if OTP session exists
    if (!otpSession) {
      return res.status(400).json({
        success: false,
        message: "No OTP found. Please request a new OTP."
      });
    }

    // ✅ Check if OTP has expired
    if (new Date() > otpSession.otpExpiresAt) {
      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new OTP."
      });
    }

    // console.log(`Verifying OTP: entered=${otp}, expected=${otpSession.otp}`);

    // ✅ Verify OTP matches
    if (otpSession.otp != otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP"
      });
    }

    // ✅ Mark OTP session as verified
    otpSession.isVerified = true;
    await otpSession.save();

    // ✅ Ensure Rider exists
    let rider = await Rider.findOne({ mobile: mobileStr });
    if (!rider) {
      rider = new Rider({ mobile: mobileStr });
      await rider.save();
    }

    // Store OneSignal playerId if provided
    if (playerId) {
      rider.oneSignalPlayerId = playerId;
      await rider.save();
    }

    const isNew = !rider.name;

    // ✅ Generate JWT
    const token = jwt.sign(
      { riderId: rider._id, mobile: rider.mobile },
      process.env.JWT_SECRET_USER,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );

    // ✅ Use helper to enforce max 2 sessions
    await createSession(mobileStr, token);

    res.json({
      success: true,
      token,
      isNew,
      rider: {
        _id: rider._id,
        mobile: rider.mobile,
        name: rider.name,
        email: rider.email,
      }
    });
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

router.post("/save-profile", upload.single('profilePhoto'), authMiddleware, async (req, res) => {
  try {
    const riderId = req.rider.riderId;

    const { name, gender, email, referralCodeUsed } = req.body;

    if (!name || !gender) {
      return res.status(400).json({ success: false, message: "Name and gender are required" });
    }

    let rider = await Rider.findById(riderId);
    if (!rider) return res.status(404).json({ message: "Rider not found" });

    rider.name = name;
    rider.gender = gender;
    rider.email = email;

    // Handle profile photo upload
    if (req.file) {
      const uploadPath = path.join(__dirname, '../cloud/images');
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }

      const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(req.file.originalname || '.jpg');
      const filePath = path.join(uploadPath, uniqueName);
      fs.writeFileSync(filePath, req.file.buffer);

      rider.profilePhoto = `https://adminbackend.hire4drive.com/app/cloud/images/${uniqueName}`;
    }

    // 🔹 If referralCodeUsed is provided and rider has no referredBy yet
    if (referralCodeUsed && !rider.referredBy) {
      const referrer = await Rider.findOne({ referralCode: referralCodeUsed });

      if (!referrer) {
        return res.status(400).json({ success: false, message: "Invalid referral code" });
      }

      rider.referredBy = referrer._id; // link who referred
      await rider.save();

      // update referrer’s list
      referrer.referrals.push({ riderId: rider._id, totalEarned: 0 });
      await referrer.save();
    } else {
      await rider.save();
    }

    // Initialize empty wallet for the rider
    const existingWallet = await Wallet.findOne({ riderId: rider._id });
    if (!existingWallet) {
      await Wallet.create({
        riderId: rider._id,
        balance: 0,
        totalDeposited: 0,
        totalSpent: 0,
        transactions: []
      });
    }

    res.json({ success: true, message: "Profile saved", rider });
  } catch (error) {
    console.error("Save profile error:", error);
    res.status(500).json({ success: false, message: "Failed to save profile" });
  }
});

router.post("/userApp/save-profile", upload.single('profilePhoto'), authMiddleware, async (req, res) => {

  const riderId = req.rider.riderId;

  try {
    const { name, gender, email, referralCodeUsed } = req.body;

    if (!name || !gender) {
      return res.status(400).json({ success: false, message: "Name and gender are required" });
    }

    let rider = await Rider.findById(riderId);
    if (!rider) return res.status(404).json({ message: "Rider not found" });

    rider.name = name;
    rider.gender = gender;
    rider.email = email;

    // Handle profile photo upload
    if (req.file) {
      const uploadPath = path.join(__dirname, '../cloud/images');
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }

      const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(req.file.originalname || '.jpg');
      const filePath = path.join(uploadPath, uniqueName);
      fs.writeFileSync(filePath, req.file.buffer);

      rider.profilePhoto = `https://adminbackend.hire4drive.com/app/cloud/images/${uniqueName}`;
    }

    // 🔹 If referralCodeUsed is provided and rider has no referredBy yet
    if (referralCodeUsed && !rider.referredBy) {
      const referrer = await Rider.findOne({ referralCode: referralCodeUsed });

      if (!referrer) {
        return res.status(400).json({ success: false, message: "Invalid referral code" });
      }

      rider.referredBy = referrer._id; // link who referred
      await rider.save();

      // update referrer’s list
      referrer.referrals.push({ riderId: rider._id, totalEarned: 0 });
      await referrer.save();
    } else {
      await rider.save();
    }

    // Initialize empty wallet for the rider
    const existingWallet = await Wallet.findOne({ riderId: rider._id.toString() });
    if (!existingWallet) {
      await Wallet.create({
        riderId: rider._id,
        balance: 0,
        totalDeposited: 0,
        totalSpent: 0,
        transactions: []
      });
    }

    res.json({ success: true, message: "Profile saved", rider });
  } catch (error) {
    console.error("Save profile error:", error);
    res.status(500).json({ success: false, message: "Failed to save profile" });
  }
});

router.get("/rider-info", authMiddleware, async (req, res) => {
  try {
    const riderId = req.rider.riderId;

    const rider = await Rider.findById(riderId);
    if (!rider) return res.status(404).json({ message: "Rider not found" });

    // Get wallet configuration amounts
    const RiderWalletConfig = require('../models/RiderWalletConfig');
    const config = await RiderWalletConfig.findOne().sort({ createdAt: -1 });
    const minDepositAmount = config?.minDepositAmount || 0;
    const minWithdrawAmount = config?.minWithdrawAmount || 0;

    // Get notification counts
    const RiderNotification = require('../models/RiderNotification');
    const totalNotifications = await RiderNotification.countDocuments({ riderId });
    const unreadCount = await RiderNotification.countDocuments({ riderId, isRead: false });

    const isNew = !rider.name || !rider.gender;

    res.json({
      success: true,
      isNew,
      minDepositAmount,
      minWithdrawAmount,
      totalNotifications,
      unreadCount,
      rider: {
        _id: rider._id,
        mobile: rider.mobile,
        name: rider.name,
        gender: rider.gender,
        email: rider.email,
        profilePhoto: rider.profilePhoto,
        referralCode: rider.referralCode
      }
    });
  } catch (error) {
    console.error("Get rider info error:", error);
    res.status(500).json({ success: false, message: "Failed to get rider info" });
  }
});

// Web logout - clears all cookies
router.post("/web/logout", authMiddleware, async (req, res) => {
  try {
    const { mobile } = req.rider;
    
    // Remove session from database
    await Session.deleteMany({ mobileNumber: mobile });
    
    // Clear all cookies
    res.clearCookie('authToken');
    
    res.json({
      success: true,
      message: "Logged out successfully"
    });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ success: false, message: "Logout failed" });
  }
});

module.exports = router;