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
    const mobile = req.driver?.mobile;
    const data = JSON.parse(req.body.data || "{}");

    if (!mobile || !step) return res.status(400).json({ message: "Mobile & step are required" });

    const stepFieldMap = {
      1: "personalInformation",
      2: "drivingDetails",
      3: "paymentAndSubscription",
      4: "languageSkillsAndReferences",
      5: "declaration"
    };
    const field = stepFieldMap[step];
    if (!field) return res.status(400).json({ message: "Invalid step number" });

    // 🚀 Optimization: Enhanced Cloudinary upload with parallel processing
    const uploadToCloudinary = (fileBuffer, folder, filename) => {
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Upload timeout'));
        }, 8000);

        const stream = cloudinary.uploader.upload_stream({
          folder,
          public_id: filename,
          resource_type: "auto",
          quality: "auto:good",
          fetch_format: "auto",
          flags: "progressive",
          timeout: 60000
        }, (error, result) => {
          clearTimeout(timeout);
          if (error) return reject(error);
          resolve(result.secure_url);
        });
        stream.end(fileBuffer);
      });
    };

    // 🚀 PARALLEL OPERATION 1: Database fetch + File uploads simultaneously
    const parallelOperations = [];

    // Add database fetch
    parallelOperations.push(Driver.findOne({ mobile }));

    // Add file uploads if files exist
    let uploadPromises = [];
    if (req.files && req.files.length > 0) {
      uploadPromises = req.files.map(async (file) => {
        try {
          const filename = `${file.fieldname}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          const url = await uploadToCloudinary(file.buffer, `drivers/${mobile}/${field}`, filename);
          return { fieldname: file.fieldname, url, success: true };
        } catch (error) {
          console.error(`Upload failed for ${file.fieldname}:`, error.message);
          return { fieldname: file.fieldname, error: error.message, success: false };
        }
      });
      parallelOperations.push(Promise.all(uploadPromises));
    } else {
      parallelOperations.push(Promise.resolve([])); // Empty array for no files
    }

    // 🚀 EXECUTE ALL OPERATIONS IN PARALLEL
    const [driver, uploadResults] = await Promise.all(parallelOperations);

    if (!driver) return res.status(404).json({ message: "Driver not found" });

    // Process upload results
    const successfulUploads = {};
    if (Array.isArray(uploadResults)) {
      uploadResults.forEach(result => {
        if (result.success) {
          successfulUploads[result.fieldname] = result.url;
        }
      });
    }

    // 🚀 PARALLEL OPERATION 2: Prepare updates + Evaluate progress simultaneously
    const prepareUpdates = async () => {
      const updates = {};

      // Process uploaded file URLs
      Object.entries(successfulUploads).forEach(([fieldname, url]) => {
        if (fieldname === "aadharFront" || fieldname === "aadharBack") {
          if (!updates['personalInformation.aadhar']) {
            updates['personalInformation.aadhar'] = [...(driver.personalInformation.aadhar || [])];
          }
          updates['personalInformation.aadhar'].push(url);
        } else if (fieldname === "drivingLicenseFront" || fieldname === "drivingLicenseBack") {
          if (!updates['personalInformation.drivingLicense']) {
            updates['personalInformation.drivingLicense'] = [...(driver.personalInformation.drivingLicense || [])];
          }
          updates['personalInformation.drivingLicense'].push(url);
        } else {
          data[fieldname] = url;
        }
      });

      // Merge field data
      const fieldData = { ...driver[field].toObject?.(), ...data };
      updates[field] = fieldData;

      return updates;
    };

    const evaluateProgress = async () => {
      // Create a temporary driver object with updates for evaluation
      const tempDriver = {
        ...driver.toObject(),
        [field]: { ...driver[field].toObject?.(), ...data }
      };

      // Add uploaded URLs to temp driver
      Object.entries(successfulUploads).forEach(([fieldname, url]) => {
        if (fieldname === "aadharFront" || fieldname === "aadharBack") {
          tempDriver.personalInformation.aadhar = tempDriver.personalInformation.aadhar || [];
          tempDriver.personalInformation.aadhar.push(url);
        } else if (fieldname === "drivingLicenseFront" || fieldname === "drivingLicenseBack") {
          tempDriver.personalInformation.drivingLicense = tempDriver.personalInformation.drivingLicense || [];
          tempDriver.personalInformation.drivingLicense.push(url);
        }
      });

      return evaluateDriverProgress(tempDriver);
    };

    // 🚀 EXECUTE UPDATE PREPARATION AND PROGRESS EVALUATION IN PARALLEL
    const [updates, progressResult] = await Promise.all([
      prepareUpdates(),
      evaluateProgress()
    ]);

    // Add status to updates
    updates.status = progressResult.status;

    // 🚀 PARALLEL OPERATION 3: Database update + Response preparation
    const updateDatabase = async () => {
      return Driver.findOneAndUpdate(
        { mobile },
        { $set: updates },
        { new: true }
      );
    };

    const prepareResponse = async () => {
      return {
        success: true,
        message: `information updated successfully`,
        nextStep: progressResult.step,
        status: progressResult.status,
      };
    };

    // 🚀 FINAL PARALLEL EXECUTION
    const [updatedDriver, responseData] = await Promise.all([
      updateDatabase(),
      prepareResponse()
    ]);

    res.json({
      ...responseData,
      driver: updatedDriver
    });

  } catch (error) {
    console.error("Update step error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update step",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;