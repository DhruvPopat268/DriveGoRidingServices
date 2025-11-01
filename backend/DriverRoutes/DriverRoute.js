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
const DriverSubscriptionPlan = require('../DriverModel/SubscriptionPlan')
const driverWallet = require("../DriverModel/driverWallet");
const withdrawalRequest = require("../DriverModel/withdrawalRequest");
const adminAuthMiddleware = require("../middleware/authMiddleware");
const axios = require("axios");
const fs = require("fs").promises;
const path = require("path");
const sharp = require("sharp");

// dummy otp generation
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

//approve drivers

router.get("/", async (req, res) => {
  try {
    const drivers = await Driver.find({ status: "Approved" })
      .populate('driverCategory')
      .populate('parcelCategory')
      .populate('assignedCar')
      .sort({ createdAt: -1 });

    res.status(200).json(drivers);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Assign drivers to price category
router.put("/assign-category", async (req, res) => {
  try {
    const { categoryId, driverIds } = req.body;

    if (!categoryId || !Array.isArray(driverIds)) {
      return res.status(400).json({ message: "Category ID and driver IDs array are required" });
    }

    // Update selected drivers with the category
    await Driver.updateMany(
      { _id: { $in: driverIds } },
      { driverCategory: categoryId }
    );

    // Remove category from drivers not in the selection for this category
    await Driver.updateMany(
      {
        _id: { $nin: driverIds },
        driverCategory: categoryId
      },
      { $unset: { driverCategory: 1 } }
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

// Assign drivers to car category
router.put("/assign-car-category", async (req, res) => {
  try {
    const { categoryId, driverIds } = req.body;

    if (!categoryId || !Array.isArray(driverIds)) {
      return res.status(400).json({ message: "Category ID and driver IDs array are required" });
    }

    // Update selected drivers with the car category
    await Driver.updateMany(
      { _id: { $in: driverIds } },
      { carCategory: categoryId }
    );

    // Remove car category from drivers not in the selection for this category
    await Driver.updateMany(
      {
        _id: { $nin: driverIds },
        carCategory: categoryId
      },
      { $unset: { carCategory: 1 } }
    );

    res.json({
      success: true,
      message: "Car categories updated successfully",
      updatedCount: driverIds.length
    });
  } catch (error) {
    console.error("Assign car category error:", error);
    res.status(500).json({ success: false, message: "Failed to assign car categories" });
  }
});

// Assign drivers to parcel category
router.put("/assign-parcel-category", async (req, res) => {
  try {
    const { categoryId, driverIds } = req.body;

    if (!categoryId || !Array.isArray(driverIds)) {
      return res.status(400).json({ message: "Category ID and driver IDs array are required" });
    }

    // Update selected drivers with the parcel category
    await Driver.updateMany(
      { _id: { $in: driverIds } },
      { parcelCategory: categoryId }
    );

    // Remove parcel category from drivers not in the selection for this category
    await Driver.updateMany(
      {
        _id: { $nin: driverIds },
        parcelCategory: categoryId
      },
      { $unset: { parcelCategory: 1 } }
    );

    res.json({
      success: true,
      message: "Parcel categories updated successfully",
      updatedCount: driverIds.length
    });
  } catch (error) {
    console.error("Assign parcel category error:", error);
    res.status(500).json({ success: false, message: "Failed to assign parcel categories" });
  }
});

// Assign drivers to specific car
router.put("/assign-car", async (req, res) => {
  try {
    const { carId, driverIds } = req.body;

    if (!carId || !Array.isArray(driverIds)) {
      return res.status(400).json({ message: "Car ID and driver IDs array are required" });
    }

    // Update selected drivers with the car
    await Driver.updateMany(
      { _id: { $in: driverIds } },
      { assignedCar: carId }
    );

    // Remove car from drivers not in the selection for this car
    await Driver.updateMany(
      {
        _id: { $nin: driverIds },
        assignedCar: carId
      },
      { $unset: { assignedCar: 1 } }
    );

    res.json({
      success: true,
      message: "Car assignments updated successfully",
      updatedCount: driverIds.length
    });
  } catch (error) {
    console.error("Assign car error:", error);
    res.status(500).json({ success: false, message: "Failed to assign car" });
  }
});

//Onreview drivers
router.get("/Pending", async (req, res) => {
  try {
    const drivers = await Driver.find({ status: "Pending" }).sort({ createdAt: -1 });

    if (!drivers || drivers.length === 0) {
      return res.status(200).json({ success: true, data: [] });
    }

    res.status(200).json({ success: true, data: drivers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/Onreview", async (req, res) => {
  try {
    const drivers = await Driver.find({ status: "Onreview" }).sort({ createdAt: -1 });

    if (!drivers || drivers.length === 0) {
      return res.status(200).json({ success: true, data: [] });

    }

    res.status(200).json({ success: true, data: drivers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/Approved", async (req, res) => {
  try {
    const drivers = await Driver.find({ status: "Approved" }).sort({ createdAt: -1 });

    if (!drivers || drivers.length === 0) {
      return res.status(200).json({ success: true, data: [] });

    }

    res.status(200).json({ success: true, data: drivers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/Rejected", async (req, res) => {
  try {
    const drivers = await Driver.find({ status: "Rejected" }).sort({ createdAt: -1 });

    if (!drivers || drivers.length === 0) {
      return res.status(200).json({ success: true, data: [] });

    }

    res.status(200).json({ success: true, data: drivers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get("/PendingForPayment", async (req, res) => {
  try {
    const drivers = await Driver.find({ status: "PendingForPayment" }).sort({ createdAt: -1 });

    if (!drivers || drivers.length === 0) {
      return res.status(200).json({ success: true, data: [] });
    }
    res.status(200).json({ success: true, data: drivers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Approve driver
router.post("/approve/:driverId", async (req, res) => {
  try {
    const { driverId } = req.params;

    // Find driver
    const driver = await Driver.findById(driverId);
    if (!driver) {
      return res.status(404).json({ message: "Driver not found" });
    }

    let currentPlanUpdate = {};

    // Check if driver has subscriptionPlan in paymentAndSubscription
    if (driver.paymentAndSubscription?.subscriptionPlan) {
      const subscriptionPlan = await DriverSubscriptionPlan.findById(driver.paymentAndSubscription.subscriptionPlan);
      if (subscriptionPlan) {
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + subscriptionPlan.days); // Add plan days to today
        currentPlanUpdate = {
          currentPlan: {
            planId: subscriptionPlan._id,
            expiryDate
          }
        };
      }
    }

    // Update driver status to Approved and set currentPlan
    const updatedDriver = await Driver.findByIdAndUpdate(
      driverId,
      {
        status: "Approved",
        ...currentPlanUpdate
      },
      { new: true }
    );

    res.json({ success: true, message: "Driver approved successfully", driver: updatedDriver });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to approve driver" });
  }
});

// Reject driver
router.post("/reject/:driverId", async (req, res) => {
  try {
    const { driverId } = req.params;
    const driver = await Driver.findByIdAndUpdate(
      driverId,
      { status: "Rejected" },
      { new: true }
    );
    if (!driver) {
      return res.status(404).json({ message: "Driver not found" });
    }
    res.json({ success: true, message: "Driver rejected successfully", driver });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to reject driver" });
  }
});

// Get driver by ID
router.get("/:driverId", async (req, res) => {
  try {
    const { driverId } = req.params;
    const driver = await Driver.findById(driverId);
    if (!driver) {
      return res.status(404).json({ message: "Driver not found" });
    }
    res.json(driver);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch driver" });
  }
});

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

    // ✅ Ensure Driver exists
    let driver = await Driver.findOne({ mobile: mobileStr });
    if (!driver) {
      driver = new Driver({ mobile: mobileStr });
      await driver.save();
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

    console.log("Payload sent to Kaleyra =>", JSON.stringify(payload, null, 2));

    // ✅ Send OTP via Kaleyra
    const response = await axios.post(apiUrl, payload, {
      headers: {
        "api-key": process.env.KALEYRA_API_KEY,
        "Content-Type": "application/json",
      },
    });

    console.log("Kaleyra response:", response.data);

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
    const { mobile, otp } = req.body;

    // ✅ Validate input
    if (!mobile || !otp) {
      return res.status(400).json({ message: "Mobile & OTP required" });
    }

    // ✅ Convert mobile to string
    const mobileStr = String(mobile).trim();

    // ✅ Find the latest OTP session for this mobile
    const otpSession = await DriverOtpSession.findOne({ 
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

    // ✅ Get driver
    const driver = await Driver.findOne({ mobile: mobileStr });
    if (!driver) {
      return res.status(404).json({ 
        success: false,
        message: "Driver not found" 
      });
    }

    const driverId = driver._id.toString();

    const isNew = ["Pending", "Rejected", "Onreview", "PendingForPayment"].includes(driver.status);

    // ✅ Generate JWT
    const token = jwt.sign(
      { driverId: driver._id, mobile: driver.mobile },
      process.env.JWT_SECRET_DRIVER,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );

    // ✅ Create session
    await createSession(mobileStr, token);

    // ✅ Evaluate profile progress
    const { step, status: progressStatus } = evaluateDriverProgress(driver);

    // ✅ Update status only if still pending or payment pending
    if (["Pending", "PendingForPayment"].includes(driver.status)) {
      driver.status = progressStatus;
      await driver.save();
    }

    // ✅ Ensure wallet exists (create empty if missing)
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
      console.log(`✅ Empty wallet created for driver: ${driverId}`);
    }

    // ✅ Prepare response
    const response = {
      success: true,
      driverId,
      token,
      isNew,
      status: driver.status
    };

    // ✅ Add step ONLY if status is Pending or PendingForPayment
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

// dummy otp generation
// router.post("/send-otp", async (req, res) => {
//   try {
//     const { mobile } = req.body;
//     if (!mobile) {
//       return res.status(400).json({ message: "Mobile number is required" });
//     }

//     // 🔒 Always fixed OTP for testing
//     const otp = "123456";
//     const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);

//     // Ensure Driver exists
//     let driver = await Driver.findOne({ mobile });
//     if (!driver) {
//       driver = new Driver({ mobile });
//       await driver.save();
//     }

//     // Save OTP session
//     const otpSession = new DriverOtpSession({
//       driver: driver._id,
//       mobile,
//       otp,
//       otpExpiresAt
//     });
//     await otpSession.save();

//     res.json({
//       success: true,
//       message: "OTP generated successfully",
//       otp // 🔥 Return OTP in response for testing
//     });
//   } catch (error) {
//     console.error("Send OTP error:", error.message);
//     res.status(500).json({ success: false, message: "Failed to generate OTP" });
//   }
// });

// router.post("/verify-otp", async (req, res) => {
//   try {
//     const { mobile, otp } = req.body;
//     if (!mobile || !otp) {
//       return res.status(400).json({ message: "Mobile & OTP required" });
//     }

//     // Find latest OTP session
//     const otpSession = await DriverOtpSession.findOne({ mobile, otp }).sort({ createdAt: -1 });
//     if (!otpSession) {
//       return res.status(400).json({ message: "Invalid OTP" });
//     }

//     // Check expiry
//     if (new Date() > otpSession.otpExpiresAt) {
//       return res.status(400).json({ message: "OTP expired" });
//     }

//     otpSession.isVerified = true;
//     await otpSession.save();

//     const driver = await Driver.findOne({ mobile });
//     const driverId = driver._id.toString()

//     const isNew = ["Pending", "Rejected", "Onreview", "PendingForPayment"].includes(driver.status);

//     // Generate JWT
//     const token = jwt.sign(
//       { driverId: driver._id, mobile: driver.mobile },
//       process.env.JWT_SECRET_DRIVER,
//       { expiresIn: "7d" }
//     );

//     await createSession(mobile, token);

//     // Evaluate profile progress
//     const { step, status: progressStatus } = evaluateDriverProgress(driver);

//     // Update only if still pending or payment pending
//     if (["Pending", "PendingForPayment"].includes(driver.status)) {
//       driver.status = progressStatus;
//       await driver.save();
//     }

//     // ✅ Ensure wallet exists (create empty if missing)
//     let wallet = await driverWallet.findOne({ driverId });
//     if (!wallet) {
//       await driverWallet.create({
//         driverId,
//         balance: 0,
//         totalEarnings: 0,
//         totalWithdrawn: 0,
//         totalDeductions: 0,
//         transactions: [],
//       });
//       // console.log(`✅ Empty wallet created for driver: ${driverId}`);
//     }

//     // Prepare response
//     const response = {
//       success: true,
//       driverId,
//       token,
//       isNew,
//       status: driver.status
//     };

//     // ✅ Add step ONLY if status is Pending or PendingForPayment
//     if (["Pending", "PendingForPayment"].includes(driver.status)) {
//       response.step = step;
//     }

//     res.json(response);
//   } catch (error) {
//     console.error("Verify OTP error:", error);
//     res.status(500).json({ success: false, message: "OTP verification failed" });
//   }
// });

router.get("/application/driverDeatils",DriverAuthMiddleware,async (req, res) => {
  try {
    const driverId = req.driver.driverId;

    const driver = await Driver.findById(driverId);
    if (!driver) {
      return res.status(404).json({ success: false, message: "Driver not found" });
    }

    const isNew = ["Pending", "Rejected", "Onreview", "PendingForPayment"].includes(driver.status);



    // Evaluate driver profile progress
    const { step, status: progressStatus } = evaluateDriverProgress(driver);

    if (["Pending", "PendingForPayment"].includes(driver.status)) {
      driver.status = progressStatus;
      await driver.save();
    }

    // Prepare response
    const response = {
      success: true,
      driverId,
      isNew,
      status: driver.status,
    };

    if (["Pending", "PendingForPayment"].includes(driver.status)) {
      response.step = step;
    }

    res.json(response);
  } catch (error) {
    console.error("Verify OTP error:", error);
    res.status(500).json({ success: false, message: "OTP verification failed" });
  }
});

router.post("/update-step", DriverAuthMiddleware, upload.any(), async (req, res) => {
  try {
    const step = parseInt(req.body.step, 10);
    const mobile = req.driver?.mobile;

    // ✅ Safe JSON parsing
    let data = {};
    try {
      data = JSON.parse(req.body.data || "{}");
    } catch (err) {
      console.error("JSON parse error:", err.message);
      return res.status(400).json({
        success: false,
        message: "Invalid JSON in data field",
        error: err.message,
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
      5: "declaration",
    };

    const field = stepFieldMap[step];
    if (!field) return res.status(400).json({ message: "Invalid step number" });

    // ✅ Async upload helper (Cloud folder storage)
    const uploadToServer = async (fileBuffer, filename, isImage = true) => {
      const folder = isImage ? "images" : "documents";
      const uploadPath = path.join(__dirname, `../cloud/${folder}`);
      await fs.mkdir(uploadPath, { recursive: true });

      // Compress image before saving
      let bufferToSave = fileBuffer;
      if (isImage) {
        bufferToSave = await sharp(fileBuffer)
          .resize({ width: 1000 })
          .jpeg({ quality: 80 })
          .toBuffer();
      }

      const filePath = path.join(uploadPath, filename);
      await fs.writeFile(filePath, bufferToSave);

      return `https://adminbackend.hire4drive.com/app/cloud/${folder}/${filename}`;
    };

    // 🚀 Parallel file upload + driver fetch
    const [driver, uploadResults] = await Promise.all([
      Driver.findOne({ mobile }),
      req.files?.length
        ? Promise.all(
            req.files.map(async (file) => {
              try {
                const isImage = file.mimetype.startsWith("image/");
                const ext =
                  path.extname(file.originalname) || (isImage ? ".jpg" : ".pdf");
                const filename = `${file.fieldname}_${Date.now()}_${Math.random()
                  .toString(36)
                  .substr(2, 9)}${ext}`;
                const url = await uploadToServer(file.buffer, filename, isImage);
                return { fieldname: file.fieldname, url, success: true };
              } catch (error) {
                console.error(`Upload failed for ${file.fieldname}:`, error.message);
                return {
                  fieldname: file.fieldname,
                  error: error.message,
                  success: false,
                };
              }
            })
          )
        : [],
    ]);

    if (!driver) return res.status(404).json({ message: "Driver not found" });

    // 🚀 Process uploaded files
    const fileGroups = {};
    const singleFiles = {};
    const arrayFields = ["aadhar", "drivingLicense"];

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

    // Add single file fields
    Object.entries(singleFiles).forEach(([fieldname, url]) => {
      data[fieldname] = url;
    });

    // Merge with existing step data
    const fieldData = { ...driver[field]?.toObject?.(), ...data };

    // Merge array fields (for multiple docs)
    Object.entries(fileGroups).forEach(([fieldName, urls]) => {
      if (urls.length > 0) {
        const existingUrls = driver[field]?.[fieldName] || [];
        fieldData[fieldName] = [...new Set([...existingUrls, ...urls])];
      }
    });

    const updates = { [field]: fieldData };

    // 🚀 Evaluate progress
    const tempDriver = { ...driver.toObject(), [field]: fieldData };
    const progressResult = evaluateDriverProgress(tempDriver);
    updates.status = progressResult.status;

    // 🚀 Save driver update
    const updatedDriver = await Driver.findOneAndUpdate(
      { mobile },
      { $set: updates },
      { new: true, runValidators: true }
    );

    // 🚀 Response
    res.json({
      success: true,
      message: "Information updated successfully",
      nextStep: progressResult.step,
      status: progressResult.status,
      driver: updatedDriver,
    });
  } catch (error) {
    console.error("Update step error:", error);

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

router.post("/admin/withdrawal/complete", async (req, res) => {
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

router.post("/admin/withdrawal/reject", async (req, res) => {
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
      wallet.balance += withdrawal.amount; // refund

      // Update original withdrawal transaction as failed
      const txn = wallet.transactions.find(
        (t) => t.withdrawalRequestId?.toString() === requestId
      );
      if (txn) txn.status = "failed";

      // Add a new transaction for the refunded amount
      wallet.transactions.push({
        type: "refunded",
        amount: withdrawal.amount,
        status: "completed",
        description: "Refund for rejected withdrawal",
      });

      await wallet.save();
    }

    // Update withdrawal request status
    withdrawal.status = "rejected";
    withdrawal.adminRemarks = adminRemarks || "";
    await withdrawal.save();

    res.json({ success: true, message: "Withdrawal rejected and refunded", withdrawal });
  } catch (error) {
    console.error("Reject withdrawal error:", error);
    res.status(500).json({ success: false, message: "Server error", error: error.message });
  }
});

router.get("/transactions/pending", DriverAuthMiddleware, async (req, res) => {
  try {
    const driverId = req.driver?.driverId;
    // console.log("Driver ID:", driverId);

    const wallet = await driverWallet.findOne({ driverId });
    if (!wallet) return res.status(200).json({ success: true, balance: 0, data: [] });

    const transactions = wallet.transactions.filter(txn => txn.status === "pending");
    res.json({ success: true, balance: wallet.balance, data: transactions });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 2️⃣ Get all COMPLETED transactions
router.get("/transactions/completed", DriverAuthMiddleware, async (req, res) => {
  try {
    const driverId = req.driver?.driverId;

    const wallet = await driverWallet.findOne({ driverId });
    if (!wallet) return res.status(200).json({ success: true, balance: 0, data: [] });



    const transactions = wallet.transactions.filter(txn => txn.status === "completed");
    res.json({ success: true, balance: wallet.balance, data: transactions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 3️⃣ Get all FAILED transactions
router.get("/transactions/failed", DriverAuthMiddleware, async (req, res) => {
  try {
    const driverId = req.driver?.driverId;

    const wallet = await driverWallet.findOne({ driverId });
    if (!wallet) return res.status(200).json({ success: true, balance: 0, data: [] });

    const transactions = wallet.transactions.filter(txn => txn.status === "failed");
    res.json({ success: true, balance: wallet.balance, data: transactions });

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>> Admin >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

// Get all transactions across all drivers (admin)
router.get("/transactions/all", async (req, res) => {
  try {
    // Fetch all wallets and populate driver info
    const wallets = await driverWallet.find()
      .populate("driverId", "personalInformation.fullName mobile")
      .sort({ createdAt: -1 });

    // Extract all transactions from all driver wallets
    const allTransactions = wallets.flatMap(wallet =>
      wallet.transactions.map(tx => ({
        ...tx.toObject(),
        driver: wallet.driverId,
      }))
    );

    // Sort transactions by creation date (latest first)
    allTransactions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.status(200).json({ success: true, data: allTransactions });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});
module.exports = router;