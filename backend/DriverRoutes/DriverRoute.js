const express = require("express");
const Driver = require("../DriverModel/DriverModel");
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


// router.post("/send-otp", async (req, res) => {
//   try {
//     const { mobile } = req.body;
//     if (!mobile) return res.status(400).json({ message: "Mobile number is required" });

//     // Generate 6-digit OTP
//     const otp = Math.floor(100000 + Math.random() * 900000).toString();
//     const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);

//     // Ensure Driver exists
//     let driver = await Driver.findOne({ mobile });
//     if (!driver) {
//       driver = new Driver({ mobile });
//       await driver.save();
//     }

//     //  OTSaveP session
//     const otpSession = new DriverOtpSession({
//       driver: driver._id,
//       mobile,
//       otp,
//       otpExpiresAt
//     });
//     await otpSession.save();

//     let toNumber = mobile.startsWith("+") ? mobile : `+91${mobile}`;

//     // ✅ Send OTP via Twilio SMS
//     const resp = await client.messages.create({
//       body: `Your OTP is ${otp}. It will expire in 5 minutes.`,
//       from: process.env.TWILIO_PHONE_NUMBER,  // +17744269453
//       to: toNumber
//     });
//     console.log("Twilio response:", resp.sid);

//     res.json({ success: true, message: "OTP sent successfully" });
//   } catch (error) {
//     console.error("Send OTP error:", error.message);
//     res.status(500).json({ success: false, message: "Failed to send OTP" });
//   }
// });

router.post("/send-otp", async (req, res) => {
  try {
    const { mobile } = req.body;
    if (!mobile) {
      return res.status(400).json({ message: "Mobile number is required" });
    }

    // 🔒 Always fixed OTP for testing
    const otp = "123456";
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

    // ✅ No Twilio SMS sending
    console.log(`OTP for ${mobile}: ${otp}`);

    res.json({
      success: true,
      message: "OTP generated successfully",
      otp // 🔥 Return OTP in response for testing
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

    // ✅ Use helper function
    const { step, status } = evaluateDriverProgress(driver);

    driver.status = status;
    await driver.save();

    res.json({
      success: true,
      token,
      isNew,
      step,
      status
    });
  } catch (error) {
    console.error("Verify OTP error:", error);
    res.status(500).json({ success: false, message: "OTP verification failed" });
  }
});

router.post("/update-step", DriverAuthMiddleware, upload.any(), async (req, res) => {
  try {
    const { step } = req.body;
    const mobile = req.driver.mobile;
    const data = JSON.parse(req.body.data || "{}"); // parse JSON fields from frontend

    if (!mobile || !step) {
      return res.status(400).json({ message: "Mobile & step are required" });
    }

    const driver = await Driver.findOne({ mobile });
    if (!driver) {
      return res.status(404).json({ message: "Driver not found" });
    }

    const stepFieldMap = {
      1: "personalInformation",
      2: "drivingDetails",
      3: "paymentAndSubscription",
      4: "languageSkillsAndReferences",
      5: "declaration"
    };

    const field = stepFieldMap[step];
    if (!field) {
      return res.status(400).json({ message: "Invalid step number" });
    }

    // ✅ Handle file uploads (if any)
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const result = await cloudinary.uploader.upload_stream(
          { folder: `drivers/${mobile}/${field}` },
          (error, uploadResult) => {
            if (error) throw error;
            // save Cloudinary URL in the correct field
            data[file.fieldname] = uploadResult.secure_url;
          }
        );

        // Write file buffer into stream
        const stream = result;
        stream.end(file.buffer);
      }
    }

    // ✅ Update only that step field
    driver[field] = { ...driver[field].toObject?.(), ...data };
    await driver.save();

    // Re-evaluate step & status
    const { step: nextStep, status } = evaluateDriverProgress(driver);
    driver.status = status;
    await driver.save();

    res.json({
      success: true,
      message: `${field} updated successfully`,
      step: nextStep,
      status,
      driver
    });
  } catch (error) {
    console.error("Update step error:", error);
    res.status(500).json({ success: false, message: "Failed to update step" });
  }
});

module.exports = router;