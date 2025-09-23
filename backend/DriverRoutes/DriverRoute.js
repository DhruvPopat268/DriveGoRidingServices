const express =  require("express");
const Driver = require("../DriverModel/DriverModel");
const router = express.Router();
const DriverOtpSession = require("../DriverModel/DriverOtpSession");
const twilio = require("twilio");
const jwt = require("jsonwebtoken");
const { createSession } = require("../Services/DriversessionService");
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

router.post("/send-otp", async (req, res) => {
  try {
    const { mobile } = req.body;
    if (!mobile) return res.status(400).json({ message: "Mobile number is required" });

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);

    // Ensure Driver exists
    let driver = await Driver.findOne({ mobile });
    if (!driver) {
      driver = new Driver({ mobile });
      await driver.save();
    }

    // Save OTP session
    const otpSession = new DriverOtpSession({
      driver: driver._id,
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

    const otpSession = await DriverOtpSession.findOne({ mobile, otp }).sort({ createdAt: -1 });
    if (!otpSession) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    if (new Date() > otpSession.otpExpiresAt) {
      return res.status(400).json({ message: "OTP expired" });
    }

    otpSession.isVerified = true;
    await otpSession.save();

    const driver = await Driver.findOne({ mobile });
    const isNew = !driver.name;

    // Generate JWT
    const token = jwt.sign(
      { driverId: driver._id, mobile: driver.mobile },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // ✅ Use service helper to enforce max 2 sessions
    await createSession(mobile, token);

    // ✅ Send token in response instead of cookie
    res.json({ success: true, token, isNew, driver });
  } catch (error) {
    console.error("Verify OTP error:", error);
    res.status(500).json({ success: false, message: "OTP verification failed" });
  }
});

module.exports = router;