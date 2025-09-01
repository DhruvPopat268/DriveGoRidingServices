const express = require("express");
const router = express.Router();
const Rider = require("../models/Rider");
const OtpSession = require("../models/OtpSession");
const twilio = require("twilio");
const jwt = require("jsonwebtoken");
const Session = require("../models/Session");
const authMiddleware = require("../middleware/authMiddleware");
const { createSession } = require("../Services/sessionService");

// Twilio credentials from env
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

const MAX_SESSIONS = 2;

router.get("/auth/check", (req, res) => {
  // Get token from "Authorization: Bearer <token>"
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  console.log("Checking auth token from headers:", token);

  if (!token) return res.json({ loggedIn: false });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    res.json({ loggedIn: true, user: decoded });
  } catch (err) {
    console.error("Invalid or expired token:", err.message);
    res.json({ loggedIn: false });
  }
});

// ✅ Find rider by ID from token
router.post("/find-rider", authMiddleware, async (req, res) => {
  try {
    // riderId is in the decoded token (middleware attaches it)
    const riderId = req.rider.riderId;

    if (!riderId) {
      return res.status(400).json({ success: false, message: "RiderId missing in token" });
    }

    // Find rider by Mongo _id
    const rider = await Rider.findById(riderId);

    if (!rider) {
      return res.status(200).json({ success: false, message: "Rider not found" });
    }

    res.status(200).json({
      success: true,
      rider,
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

// 🔹 Send OTP
router.post("/send-otp", async (req, res) => {
  try {
    const { mobile } = req.body;
    if (!mobile) return res.status(400).json({ message: "Mobile number is required" });

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
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

    let toNumber = mobile.startsWith("+") ? mobile : `+91${mobile}`;

    // ✅ Send OTP via Twilio SMS
    const resp = await client.messages.create({
      body: `Your OTP is ${otp}. It will expire in 5 minutes.`,
      from: process.env.TWILIO_PHONE_NUMBER,  // +17744269453
      to: toNumber
    });
    console.log("Twilio response:", resp.sid);

    res.json({ success: true, message: "OTP sent successfully" });
  } catch (error) {
    console.error("Send OTP error:", error.message);
    res.status(500).json({ success: false, message: "Failed to send OTP" });
  }
});

router.post("/verify-otp", async (req, res) => {
  try {
    const { mobile, otp } = req.body;
    if (!mobile || !otp) {
      return res.status(400).json({ message: "Mobile & OTP required" });
    }

    const otpSession = await OtpSession.findOne({ mobile, otp }).sort({ createdAt: -1 });
    if (!otpSession) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    if (new Date() > otpSession.otpExpiresAt) {
      return res.status(400).json({ message: "OTP expired" });
    }

    otpSession.isVerified = true;
    await otpSession.save();

    const rider = await Rider.findOne({ mobile });
    const isNew = !rider.name;

    // Generate JWT
    const token = jwt.sign(
      { riderId: rider._id, mobile: rider.mobile },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // ✅ Use service helper to enforce max 2 sessions
    await createSession(mobile, token);

    // ✅ Send token in response instead of cookie
    res.json({ success: true, token, isNew, rider });
  } catch (error) {
    console.error("Verify OTP error:", error);
    res.status(500).json({ success: false, message: "OTP verification failed" });
  }
});

// 🔹 Save Rider Profile
router.post("/save-profile", async (req, res) => {
  try {
    const { mobile, name, gender, email } = req.body;
    let rider = await Rider.findOne({ mobile });
    if (!rider) return res.status(404).json({ message: "Rider not found" });

    rider.name = name;
    rider.gender = gender;
    rider.email = email;
    await rider.save();

    res.json({ success: true, message: "Profile saved", rider });
  } catch (error) {
    console.error("Save profile error:", error);
    res.status(500).json({ success: false, message: "Failed to save profile" });
  }
});

module.exports = router;