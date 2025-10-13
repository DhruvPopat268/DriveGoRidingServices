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
  const drivers = await Driver.find({ status: "Approved" })
    .populate('driverCategory')
    .populate('carCategory')
    .populate('parcelCategory')
    .populate('assignedCar')
    .sort({ createdAt: -1 })
  res.status(200).json(drivers)
})

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
router.get("/Onreview", async (req, res) => {
  const drivers = await Driver.find({ status: "Onreview" }).sort({ createdAt: -1 })
  res.status(200).json(drivers)
})

// Approve driver
router.post("/approve/:driverId", async (req, res) => {
  try {
    const { driverId } = req.params;
    const driver = await Driver.findByIdAndUpdate(
      driverId,
      { status: "Approved" },
      { new: true }
    );
    if (!driver) {
      return res.status(404).json({ message: "Driver not found" });
    }
    res.json({ success: true, message: "Driver approved successfully", driver });
  } catch (error) {
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

    // Find latest OTP session
    const otpSession = await DriverOtpSession.findOne({ mobile, otp }).sort({ createdAt: -1 });
    if (!otpSession) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    // Check expiry
    if (new Date() > otpSession.otpExpiresAt) {
      return res.status(400).json({ message: "OTP expired" });
    }

    otpSession.isVerified = true;
    await otpSession.save();

    const driver = await Driver.findOne({ mobile });
    const driverId = driver._id.toString()


    const isNew = ["Pending", "Rejected", "Onreview", "PendingForPayment"].includes(driver.status);

    // Generate JWT
    const token = jwt.sign(
      { driverId: driver._id, mobile: driver.mobile },
      process.env.JWT_SECRET_DRIVER,
      { expiresIn: "7d" }
    );

    await createSession(mobile, token);

    // Evaluate profile progress
    const { step, status: progressStatus } = evaluateDriverProgress(driver);

    // Update only if still pending or payment pending
    if (["Pending", "PendingForPayment"].includes(driver.status)) {
      driver.status = progressStatus;
      await driver.save();
    }

    // Prepare response
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
      }
    });

    const updates = { [field]: fieldData };

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

router.get('/planPayment', DriverAuthMiddleware, async (req, res) => {

  const mobile = req.driver?.mobile;
  const driver = await Driver.findOne({ mobile });
  const subscriptionPlan = driver.paymentAndSubscription?.subscriptionPlan

  const currentPlan = await DriverSubscriptionPlan.findById(subscriptionPlan)

  res.json({
    success: true,
    message: "Plan fetched successfully",
    plan: currentPlan
  });

})

router.post("/add-purchased-plan", DriverAuthMiddleware, async (req, res) => {
  try {
    const { paymentId, status } = req.body;
    const mobile = req.driver?.mobile;

    if (!mobile || !paymentId || !status) {
      return res.status(400).json({ message: "Mobile, paymentId, status, and plan are required" });
    }

    const driver = await Driver.findOne({ mobile });
    if (!driver) {
      return res.status(404).json({ message: "Driver not found" });
    }

    const subscriptionPlan = driver.paymentAndSubscription?.subscriptionPlan

    const currentPlan = await DriverSubscriptionPlan.findById(subscriptionPlan)

    const amount = currentPlan?.amount

    driver.purchasedPlans.push({ paymentId, status, plan: subscriptionPlan, amount });
    await driver.save();

    res.json({
      success: true,
      message: "Purchased plan added successfully",
      purchasedPlans: driver.purchasedPlans
    });
  } catch (error) {
    console.error("Add purchased plan error:", error);
    res.status(500).json({ success: false, message: "Failed to add purchased plan" });
  }
});

module.exports = router;