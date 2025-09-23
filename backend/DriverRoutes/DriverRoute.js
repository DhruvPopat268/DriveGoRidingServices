const express = require("express");
const Driver = require("../DriverModel/DriverModel");
const router = express.Router();
const DriverOtpSession = require("../DriverModel/DriverOtpSession");
const twilio = require("twilio");
const jwt = require("jsonwebtoken");
const { createSession } = require("../Services/DriversessionService");
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

// ✅ Helper to check if all fields in an object have values
function isObjectComplete(obj) {
  if (!obj) return false;
  return Object.values(obj).every((value) => {
    if (value === null || value === undefined || value === "") return false;

    // If array, check non-empty
    if (Array.isArray(value)) return value.length > 0;

    // If object, recursively check
    if (typeof value === "object" && !(value instanceof Date)) {
      return isObjectComplete(value);
    }
    return true;
  });
}

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

    const isNew = !driver?.personalInformation?.mobileNumber;

    // Generate JWT
    const token = jwt.sign(
      { driverId: driver._id, mobile: driver.mobile },
      process.env.JWT_SECRET_DRIVER,
      { expiresIn: "7d" }
    );

    await createSession(mobile, token);

    // ✅ Step validation (check each object deeply)
    let step = 0;

    if (!isObjectComplete(driver.personalInformation)) {
      step = 1;
    } else if (!isObjectComplete(driver.drivingDetails)) {
      step = 2;
    } else if (!isObjectComplete(driver.paymentAndSubscription)) {
      step = 3;
    } else if (
      !isObjectComplete(driver.languageSkillsAndReferences) ||
      !driver.languageSkillsAndReferences?.references?.length
    ) {
      step = 4;
    } else if (!isObjectComplete(driver.declaration) || !driver.declaration.agreement) {
      step = 5;
    }

    // ✅ Update driver status
    let newStatus = "Pending";
    if (step === 0) {
      newStatus = "Onreview";
    }

    driver.status = newStatus;
    await driver.save();

    res.json({
      success: true,
      token,
      isNew,
      step,
      status: newStatus
    });
  } catch (error) {
    console.error("Verify OTP error:", error);
    res.status(500).json({ success: false, message: "OTP verification failed" });
  }
});

module.exports = router;