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
    const step = parseInt(req.body.step, 10);
    const mobile = req.driver?.mobile;
    
    // ✅ Safe JSON parsing with better error handling
    let data = {};
    try {
      data = JSON.parse(req.body.data || "{}");
    } catch (parseError) {
      console.error("JSON parse error:", parseError.message);
      console.error("Received data:", req.body.data);
      return res.status(400).json({ 
        success: false,
        message: "Invalid JSON format in data field",
        error: parseError.message 
      });
    }

    if (!mobile || !step) {
      return res.status(400).json({ message: "Mobile & step are required" });
    }

    const stepFieldMap = {
      1: "personalInformation",
      2: "drivingDetails",
      3: "paymentAndSubscription",
      4: "languageSkillsAndReferences",
      5: "declaration"
    };
    const field = stepFieldMap[step];
    if (!field) return res.status(400).json({ message: "Invalid step number" });

    // ✅ Cloudinary upload helper
    const uploadToCloudinary = (fileBuffer, folder, filename) => {
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("Upload timeout")), 8000);

        const stream = cloudinary.uploader.upload_stream(
          {
            folder,
            public_id: filename,
            resource_type: "auto",
            quality: "auto:good",
            fetch_format: "auto",
            flags: "progressive",
            timeout: 60000
          },
          (error, result) => {
            clearTimeout(timeout);
            if (error) return reject(error);
            resolve(result.secure_url);
          }
        );
        stream.end(fileBuffer);
      });
    };

    // 🚀 Step 1: Fetch driver + upload files in parallel
    const [driver, uploadResults] = await Promise.all([
      Driver.findOne({ mobile }),
      req.files?.length
        ? Promise.all(
          req.files.map(async (file) => {
            try {
              const filename = `${file.fieldname}_${Date.now()}_${Math.random()
                .toString(36)
                .substr(2, 9)}`;
              const url = await uploadToCloudinary(file.buffer, `drivers/${mobile}/${field}`, filename);
              return { fieldname: file.fieldname, url, success: true };
            } catch (error) {
              console.error(`Upload failed for ${file.fieldname}:`, error.message);
              return { fieldname: file.fieldname, error: error.message, success: false };
            }
          })
        )
        : []
    ]);

    if (!driver) return res.status(404).json({ message: "Driver not found" });

    console.log("Request files:", req.files?.map(f => ({ fieldname: f.fieldname, size: f.size })));
    console.log("Upload results:", uploadResults);

    // 🚀 Step 2: Process uploads - Group by fieldname for array fields
    const fileGroups = {};
    const singleFiles = {};

    // Array fields that can have multiple files
    const arrayFields = ["aadhar", "drivingLicense"];

    uploadResults.forEach((result) => {
      if (result.success) {
        if (arrayFields.includes(result.fieldname)) {
          // Group multiple files with same fieldname
          if (!fileGroups[result.fieldname]) {
            fileGroups[result.fieldname] = [];
          }
          fileGroups[result.fieldname].push(result.url);
        } else {
          // Single file fields
          singleFiles[result.fieldname] = result.url;
        }
      }
    });

    console.log("File groups (arrays):", fileGroups);
    console.log("Single files:", singleFiles);

    // Handle single file uploads (panCard, passportPhoto, etc.)
    Object.entries(singleFiles).forEach(([fieldname, url]) => {
      data[fieldname] = url;
    });

    // Merge existing + new data for the step field
    const fieldData = { ...driver[field]?.toObject?.(), ...data };

    // Handle array field uploads - merge into fieldData instead of separate updates
    Object.entries(fileGroups).forEach(([fieldName, urls]) => {
      if (urls.length > 0) {
        const existingUrls = driver[field]?.[fieldName] || [];
        const allUrls = [...existingUrls, ...urls];
        const uniqueUrls = [...new Set(allUrls)];
        fieldData[fieldName] = uniqueUrls;
        console.log(`Updated ${fieldName} with URLs:`, uniqueUrls);
      }
    });

    const updates = { [field]: fieldData };

    console.log("Final updates object:", updates);

    // 🚀 Step 3: Evaluate progress (keep your existing evaluateDriverProgress logic)
    const tempDriver = {
      ...driver.toObject(),
      [field]: fieldData
    };

    // tempDriver already has the updated fieldData with array fields

    const progressResult = evaluateDriverProgress(tempDriver);

    // Add status
    updates.status = progressResult.status;

    // 🚀 Step 4: Save updates
    const updatedDriver = await Driver.findOneAndUpdate(
      { mobile },
      { $set: updates },
      { new: true, runValidators: true }
    );

    console.log("Final aadhar array:", updatedDriver.personalInformation.aadhar);
    console.log("Final drivingLicense array:", updatedDriver.personalInformation.drivingLicense);

    // 🚀 Step 5: Send response
    res.json({
      success: true,
      message: "information updated successfully",
      nextStep: progressResult.step,
      status: progressResult.status,
      driver: updatedDriver
    });
  } catch (error) {
    console.error("Update step error:", error);

    // ✅ Handle Mongoose Validation Errors
    if (error.name === "ValidationError") {
      const validationErrors = {};
      
      // Extract all validation error messages
      Object.keys(error.errors).forEach((key) => {
        validationErrors[key] = error.errors[key].message;
      });

      return res.status(400).json({
        success: false,
        message: "Validation failed",
        errors: validationErrors
      });
    }

    // Handle other errors
    res.status(500).json({
      success: false,
      message: "Failed to update step",
      error: process.env.NODE_ENV === "development" ? error.message : undefined
    });
  }
});

module.exports = router;