const express = require("express");
const Vehicle = require("../DriverModel/VehicleModel");
const Driver = require("../DriverModel/DriverModel");
const DriverAuthMiddleware = require("../middleware/driverAuthMiddleware");
const { evaluateDriverProgress } = require("../utils/driverSteps");
const multer = require("multer");
const path = require("path");
const fs = require("fs").promises;
const sharp = require("sharp");
const upload = multer({ storage: multer.memoryStorage() });
const router = express.Router();

// Helper function for file upload
const uploadToServerFast = async (fileBuffer, filename, isImage = true) => {
  const folder = isImage ? "images" : "documents";
  const uploadPath = path.join(__dirname, `../cloud/${folder}`);
  
  await fs.mkdir(uploadPath, { recursive: true });
  const filePath = path.join(uploadPath, filename);
  
  if (isImage) {
    await sharp(fileBuffer)
      .resize({ width: 800, withoutEnlargement: true })
      .webp({ quality: 70, effort: 1, smartSubsample: true })
      .toFile(filePath);
  } else {
    await fs.writeFile(filePath, fileBuffer);
  }
  
  return `https://adminbackend.hire4drive.com/app/cloud/${folder}/${filename}`;
};

// Process files function
const processAllFiles = async (files) => {
  return Promise.all(
    files.map(async (file) => {
      try {
        const isImage = file.mimetype.startsWith("image/");
        const ext = path.extname(file.originalname) || (isImage ? ".webp" : ".pdf");
        const filename = `${file.fieldname}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}${ext}`;
        
        const url = await uploadToServerFast(file.buffer, filename, isImage);
        return { fieldname: file.fieldname, url, success: true };
      } catch (error) {
        return { fieldname: file.fieldname, error: error.message, success: false };
      }
    })
  );
};

// Create vehicle (Owner/Owner_With_Vehicle only)
router.post("/create", DriverAuthMiddleware, upload.any(), async (req, res) => {
  try {
    const driverId = req.driver.driverId;
    
    // Get driver with selectedCategory and ownership
    const driver = await Driver.findById(driverId).select('ownership selectedCategory');
    if (!driver || (driver.ownership !== "Owner" && driver.ownership !== "Owner_With_Vehicle")) {
      return res.status(403).json({ success: false, message: "Only owners can create vehicles" });
    }

    if (!driver.selectedCategory?.id) {
      return res.status(400).json({ success: false, message: "Driver must have a selected category" });
    }

    // Parse JSON data from form
    let vehicleData = {};
    try {
      vehicleData = JSON.parse(req.body.data || "{}");
    } catch (err) {
      return res.status(400).json({ success: false, message: "Invalid JSON in data field" });
    }

    const { rcNumber } = vehicleData;
    if (!rcNumber) {
      return res.status(400).json({ success: false, message: "RC Number is required" });
    }

    // Debug: Log received files
    console.log('Received files:', req.files?.map(f => ({ fieldname: f.fieldname, mimetype: f.mimetype, size: f.size })));
    
    // Process uploaded files
    const uploadResults = req.files?.length ? await processAllFiles(req.files) : [];
    console.log('Upload results:', uploadResults);
    
    // Organize files
    const fileGroups = {};
    const singleFiles = {};
    const arrayFields = ["vehiclePhotos"];
    
    uploadResults.forEach((result) => {
      if (result.success) {
        const fieldname = result.fieldname.trim(); // Trim whitespace
        if (arrayFields.includes(fieldname)) {
          if (!fileGroups[fieldname]) fileGroups[fieldname] = [];
          fileGroups[fieldname].push(result.url);
        } else {
          singleFiles[fieldname] = result.url;
        }
      }
    });

    console.log('File groups:', fileGroups);
    console.log('Single files:', singleFiles);

    // Merge file URLs with vehicle data
    Object.assign(vehicleData, singleFiles);
    Object.entries(fileGroups).forEach(([fieldName, urls]) => {
      if (urls.length > 0) {
        vehicleData[fieldName] = urls;
      }
    });
    
    console.log('Final vehicle data:', vehicleData);

    // Determine vehicle type and prepare details
    const vehicleType = driver.selectedCategory.name; // "Cab" or "Parcel"
    const vehicleDetailsField = vehicleType === "Cab" ? "cabVehicleDetails" : "parcelVehicleDetails";
    
    const newVehicle = new Vehicle({
      owner: driverId,
      category: driver.selectedCategory.id,
      rcNumber,
      status: true,
      [vehicleDetailsField]: vehicleData
    });

    const savedVehicle = await newVehicle.save();

    // Add to driver's vehiclesOwned
    await Driver.findByIdAndUpdate(driverId, {
      $push: { vehiclesOwned: savedVehicle._id }
    });

    res.json({ success: true, data: savedVehicle, message: "Vehicle created successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get all vehicles owned by driver (owner wise)
router.get("/owner-vehicles", DriverAuthMiddleware, async (req, res) => {
  try {
    const driverId = req.driver.driverId;
    
    const vehicles = await Vehicle.find({ owner: driverId })
    .populate('owner', 'personalInformation.fullName mobile')
      .populate('category', 'name')
      .populate('assignedTo', 'personalInformation.fullName mobile')
      .populate('cabVehicleDetails.vehicleType')
      .populate('cabVehicleDetails.modelType')
      .populate('parcelVehicleDetails.vehicleType')
      .populate('parcelVehicleDetails.modelType')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: vehicles });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update vehicle status using PATCH
router.patch("/update-status", DriverAuthMiddleware, async (req, res) => {
  try {
    const { vehicleId } = req.body;
    const ownerId = req.driver.driverId;

    // First find the vehicle to get current status
    const currentVehicle = await Vehicle.findOne({ _id: vehicleId, owner: ownerId });
    if (!currentVehicle) {
      return res.status(404).json({ success: false, message: "Vehicle not found or not owned by you" });
    }

    // Toggle the status
    const newStatus = !currentVehicle.status;

    const vehicle = await Vehicle.findOneAndUpdate(
      { _id: vehicleId, owner: ownerId },
      { status: newStatus },
      { new: true }
    );

    res.json({ success: true, data: vehicle, message: "Vehicle status updated" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update vehicle details
router.put("/update", DriverAuthMiddleware, upload.any(), async (req, res) => {
  try {
    const ownerId = req.driver.driverId;
    
    // Parse JSON data from form
    let updateData = {};
    try {
      updateData = JSON.parse(req.body.data || "{}");
    } catch (err) {
      return res.status(400).json({ success: false, message: "Invalid JSON in data field" });
    }

    const { vehicleId } = updateData;
    if (!vehicleId) {
      return res.status(400).json({ success: false, message: "Vehicle ID is required" });
    }

    // Process uploaded files
    const uploadResults = req.files?.length ? await processAllFiles(req.files) : [];
    
    // Organize files
    const fileGroups = {};
    const singleFiles = {};
    const arrayFields = ["vehiclePhotos"];
    
    uploadResults.forEach((result) => {
      if (result.success) {
        const fieldname = result.fieldname.trim();
        if (arrayFields.includes(fieldname)) {
          if (!fileGroups[fieldname]) fileGroups[fieldname] = [];
          fileGroups[fieldname].push(result.url);
        } else {
          singleFiles[fieldname] = result.url;
        }
      }
    });

    // Merge file URLs with update data
    Object.assign(updateData, singleFiles);
    Object.entries(fileGroups).forEach(([fieldName, urls]) => {
      if (urls.length > 0) {
        updateData[fieldName] = urls;
      }
    });

    // Remove vehicleId from updateData to avoid updating it
    delete updateData.vehicleId;

    const vehicle = await Vehicle.findOneAndUpdate(
      { _id: vehicleId, owner: ownerId },
      updateData,
      { new: true, runValidators: true }
    ).populate('category', 'name')
     .populate('cabVehicleDetails.vehicleType')
     .populate('cabVehicleDetails.modelType')
     .populate('parcelVehicleDetails.vehicleType')
     .populate('parcelVehicleDetails.modelType');

    if (!vehicle) {
      return res.status(404).json({ success: false, message: "Vehicle not found or not owned by you" });
    }

    // After updating vehicle, return all drivers of that owner
    const drivers = await Driver.find({
      $or: [
        { _id: ownerId }, // Owner himself
        { vehiclesAssigned: { $in: [vehicleId] } }, // Drivers assigned to this vehicle
        { ownership: "Owner_With_Vehicle", vehiclesOwned: { $exists: true, $ne: [] } } // Other Owner_With_Vehicle drivers
      ]
    }).select('personalInformation.fullName mobile ownership vehiclesAssigned vehiclesOwned');

    res.json({ 
      success: true, 
      data: { 
        vehicle, 
        relatedDrivers: drivers 
      }, 
      message: "Vehicle updated successfully" 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Assign vehicle to driver (supports multiple assignments)
router.post("/assign", DriverAuthMiddleware, async (req, res) => {
  try {
    const { vehicleId, driverIdToAssign } = req.body;
    const ownerId = req.driver.driverId;

    // Check if vehicle belongs to owner
    const vehicle = await Vehicle.findOne({ _id: vehicleId, owner: ownerId });
    if (!vehicle) {
      return res.status(404).json({ success: false, message: "Vehicle not found or not owned by you" });
    }

    // Check if vehicle status is true (active)
    if (!vehicle.status) {
      return res.status(400).json({ success: false, message: "Cannot assign inactive vehicle. Please activate the vehicle first." });
    }

    // Check if driver exists
    const driverToAssign = await Driver.findById(driverIdToAssign);
    if (!driverToAssign) {
      return res.status(404).json({ success: false, message: "Driver not found" });
    }

    // Handle null assignedTo field and add driver
    await Vehicle.findByIdAndUpdate(vehicleId, [
      {
        $set: {
          assignedTo: {
            $cond: {
              if: { $eq: ["$assignedTo", null] },
              then: [driverIdToAssign],
              else: { $setUnion: ["$assignedTo", [driverIdToAssign]] }
            }
          }
        }
      }
    ]);

    // Add to owner's assignedDrivers array
    const existingAssignment = await Driver.findOne({
      _id: ownerId,
      "assignedDrivers.driverId": driverIdToAssign
    });

    if (existingAssignment) {
      // Driver already exists, add vehicle to their vehicleIds array
      await Driver.findOneAndUpdate(
        { _id: ownerId, "assignedDrivers.driverId": driverIdToAssign },
        { $addToSet: { "assignedDrivers.$.vehicleIds": vehicleId } }
      );
    } else {
      // New driver assignment
      await Driver.findByIdAndUpdate(ownerId, {
        $addToSet: { assignedDrivers: { vehicleIds: [vehicleId], driverId: driverIdToAssign } }
      });
    }

    // Add to assigned driver's vehiclesAssigned
    await Driver.findByIdAndUpdate(driverIdToAssign, {
      $addToSet: { vehiclesAssigned: vehicleId }
    });

    // Also add to owner's vehiclesAssigned
    await Driver.findByIdAndUpdate(ownerId, {
      $addToSet: { vehiclesAssigned: vehicleId }
    });

    res.json({ success: true, message: "Vehicle assigned successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Remove vehicle from specific driver (unassign)
router.post("/remove-from-driver", DriverAuthMiddleware, async (req, res) => {
  try {
    const { vehicleId, driverIdToRemove } = req.body;
    const ownerId = req.driver.driverId;

    const vehicle = await Vehicle.findOne({ _id: vehicleId, owner: ownerId });
    if (!vehicle) {
      return res.status(404).json({ success: false, message: "Vehicle not found or not owned by you" });
    }

    // Filter out the driver from assignedTo array manually
    const updatedAssignedTo = vehicle.assignedTo.filter(id => id.toString() !== driverIdToRemove);

    // Update the vehicle with the filtered array
    await Vehicle.findByIdAndUpdate(vehicleId, {
      assignedTo: updatedAssignedTo
    });

    // Remove from driver's vehiclesAssigned
    await Driver.findByIdAndUpdate(driverIdToRemove, {
      $pull: { vehiclesAssigned: vehicleId }
    });

    // Remove vehicle from owner's assignedDrivers
    await Driver.findOneAndUpdate(
      { _id: ownerId, "assignedDrivers.driverId": driverIdToRemove },
      { $pull: { "assignedDrivers.$.vehicleIds": vehicleId } }
    );

    // Remove driver entry if no vehicles left
    await Driver.findByIdAndUpdate(ownerId, {
      $pull: { assignedDrivers: { driverId: driverIdToRemove, vehicleIds: { $size: 0 } } }
    });

    res.json({ success: true, message: "Vehicle removed from driver successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get assigned drivers for owner
router.get("/get-all-drivers", DriverAuthMiddleware, async (req, res) => {
  try {
    const ownerId = req.driver.driverId;

    const owner = await Driver.findById(ownerId)
      .populate({
        path: 'assignedDrivers.driverId',
        select: 'personalInformation.fullName mobile uniqueId vehiclesOwned vehiclesAssigned status'
      })
      .populate({
        path: 'assignedDrivers.vehicleIds',
        select: 'vehicleNumber category'
      });

    if (!owner) {
      return res.status(404).json({ success: false, message: "Owner not found" });
    }

    res.json({ success: true, data: owner.assignedDrivers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get all vehicles for a specific driver
router.post("/get-driver-vehicles", async (req, res) => {
  try {
    const { driverId } = req.body;

    if (!driverId) {
      return res.status(400).json({ success: false, message: "driverId is required" });
    }

    const vehicles = await Vehicle.find({
      $or: [
        { owner: driverId },
        { assignedTo: { $in: [driverId] } }
      ]
    })
    .populate('category', 'name')
    .populate('owner', 'personalInformation.fullName mobile uniqueId')
    .populate('assignedTo', 'personalInformation.fullName mobile uniqueId')

    .populate('cabVehicleDetails.vehicleType')
    .populate('cabVehicleDetails.modelType')
    .populate('parcelVehicleDetails.vehicleType')
    .populate('parcelVehicleDetails.modelType')
    .sort({ createdAt: -1 });

    res.json({ success: true, data: vehicles });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get vehicle by ID
router.post("/get-vehicle", DriverAuthMiddleware, async (req, res) => {
  try {
    const { vehicleId } = req.body;
    const driverId = req.driver.driverId;

    const vehicle = await Vehicle.findOne({
      _id: vehicleId,
      $or: [{ owner: driverId }, { assignedTo: { $in: [driverId] } }]
    })
    .populate('category', 'name')
    .populate('owner', 'personalInformation.fullName mobile')
    .populate('assignedTo', 'personalInformation.fullName mobile')
    .populate('cabVehicleDetails.vehicleType')
    .populate('cabVehicleDetails.modelType')
    .populate('parcelVehicleDetails.vehicleType')
    .populate('parcelVehicleDetails.modelType');

    if (!vehicle) {
      return res.status(404).json({ success: false, message: "Vehicle not found" });
    }

    res.json({ success: true, data: vehicle });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get driver by uniqueId
router.post("/get-driver-by-uniqueid", DriverAuthMiddleware, async (req, res) => {
  try {
    const { uniqueId } = req.body;
    const searcherId = req.driver.driverId;

    if (!uniqueId) {
      return res.status(400).json({ success: false, message: "uniqueId is required" });
    }

    // Get the searcher (owner/owner with vehicle) details
    const searcher = await Driver.findById(searcherId).populate('selectedCategory');
    if (!searcher || !searcher.selectedCategory) {
      return res.status(400).json({ success: false, message: "Searcher category not found" });
    }

    // Find driver by uniqueId and check category match
    const driver = await Driver.findOne({ 
      uniqueId,
      'selectedCategory.id': searcher.selectedCategory.id
    })
      .populate('vehiclesOwned')
      .populate('vehiclesAssigned')
      .populate('selectedCategory');

    if (!driver) {
      return res.status(404).json({ success: false, message: "Driver not found or category mismatch" });
    }

    res.json({ success: true, data: driver });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get vehicles assigned to driver
router.post("/assign-vehicles-to-driver", DriverAuthMiddleware, async (req, res) => {
  try {
    const { driverId } = req.body;

    if (!driverId) {
      return res.status(400).json({ success: false, message: "driverId is required" });
    }

    const vehicles = await Vehicle.find({
      $or: [
        { owner: driverId },
        { assignedTo: { $in: [driverId] } }
      ]
    })
    .populate('category', 'name')
    .populate('cabVehicleDetails.vehicleType')
    .populate('cabVehicleDetails.modelType')
    .populate('parcelVehicleDetails.vehicleType')
    .populate('parcelVehicleDetails.modelType');

    res.json({ success: true, data: vehicles });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;