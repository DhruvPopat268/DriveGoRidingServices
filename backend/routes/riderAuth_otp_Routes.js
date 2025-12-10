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

// Twilio credentials from env
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

const MAX_SESSIONS = 2;

// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>             User app                >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

// Update rider profile data (multiple fields at once)
router.put("/userApp/update", authMiddleware, async (req, res) => {
  try {
    const updates = req.body; // expect full object { name, email, mobile, gender, referralCode }

    // console.log("Update request body:", updates);

    // Allowed fields to protect against unwanted updates (e.g., password, _id)
    const allowedFields = ["name", "mobile", "gender", "email", "referralCode"];
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

    if (updates.referralCode) {
      if (updates.referralCode.length < 3 || updates.referralCode.length > 20) {
        return res.status(400).json({ success: false, message: "Referral code must be between 3 and 20 characters" });
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

// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>             User Web            >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

// Get all riders with non-empty names
router.get("/completeProfile", async (req, res) => {
  try {
    const riders = await Rider.find({
      name: { $ne: "" },
      gender: { $ne: "" }   // <-- added gender filter
    }).sort({ createdAt: -1 });

    const ridersWithWallet = await Promise.all(riders.map(async (rider) => {
      const wallet = await Wallet.findOne({ riderId: rider._id.toString() });
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
    const riders = await Rider.find({ name: "" , gender: "" }).sort({ createdAt: -1 });
    
    const ridersWithWallet = await Promise.all(riders.map(async (rider) => {
      const wallet = await Wallet.findOne({ riderId: rider._id.toString() });
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
      const wallet = await Wallet.findOne({ riderId: rider._id.toString() });
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
router.post("/find-rider", authMiddleware, async (req, res) => {
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
        currentBalance: rider.referralEarning?.currentBalance || 0,
        referralHistory: rider.referralEarning?.history || []
      },
    });
  } catch (error) {
    console.error("Error finding rider:", error.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

//update rider profile data
router.put("/update", authMiddleware, async (req, res) => {
  try {
    const { field, value } = req.body;

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

    // Field-specific validation
    if (field === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmedValue)) {
        return res.status(400).json({ success: false, message: "Invalid email format" });
      }

      // Check if email already exists
      const existingEmail = await Rider.findOne({
        email: trimmedValue,
        _id: { $ne: req.rider.riderId }
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
        _id: { $ne: req.rider.riderId }
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

    // Find and update
    const updatedRider = await Rider.findByIdAndUpdate(
      req.rider.riderId,
      { [field]: trimmedValue },
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

    // Find and delete
    const deletedRider = await Rider.findOneAndDelete({ mobile });

    if (!deletedRider) {
      return res.status(404).json({ success: false, message: "Rider not found" });
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
    const { mobile, otp } = req.body;
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
    let rider = await Rider.findOne({ mobile });
    if (!rider) {
      rider = new Rider({ mobile });
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
    const { mobile, otp } = req.body;

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


router.post("/save-profile", async (req, res) => {
  try {
    const { mobile, name, gender, email, referralCodeUsed } = req.body;

    // console.log("Save profile request body:", req.body);


    if (!name || !gender) {
      return res.status(400).json({ success: false, message: "Name and gender are required" });
    }

    let rider = await Rider.findOne({ mobile });
    if (!rider) return res.status(404).json({ message: "Rider not found" });

    rider.name = name;
    rider.gender = gender;
    rider.email = email;

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
        riderId: rider._id.toString(),
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

module.exports = router;