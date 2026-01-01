const express = require("express");
const mongoose = require("mongoose");
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
const adminAuthMiddleware = require("../middleware/adminAuthMiddleware");

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
    //console.log('Received files:', req.files?.map(f => ({ fieldname: f.fieldname, mimetype: f.mimetype, size: f.size })));
    
    // Process uploaded files
    const uploadResults = req.files?.length ? await processAllFiles(req.files) : [];
    //console.log('Upload results:', uploadResults);
    
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

    //console.log('File groups:', fileGroups);
    //console.log('Single files:', singleFiles);

    // Merge file URLs with vehicle data
    Object.assign(vehicleData, singleFiles);
    Object.entries(fileGroups).forEach(([fieldName, urls]) => {
      if (urls.length > 0) {
        vehicleData[fieldName] = urls;
      }
    });
    
    //console.log('Final vehicle data:', vehicleData);

    // Determine vehicle type and prepare details
    const vehicleType = driver.selectedCategory.name; // "Cab" or "Parcel"
    const vehicleDetailsField = vehicleType === "Cab" ? "cabVehicleDetails" : "parcelVehicleDetails";
    
    const newVehicle = new Vehicle({
      owner: driverId,
      category: driver.selectedCategory.id,
      rcNumber,
      status: true,
      adminStatus: 'pending',
      [vehicleDetailsField]: vehicleData
    });

    const savedVehicle = await newVehicle.save();

    // Update driver's vehicle arrays based on ownership
    const driverUpdate = { $push: { vehiclesOwned: savedVehicle._id } };
    
    if (driver.ownership === "Owner_With_Vehicle") {
      driverUpdate.$push.vehiclesAssigned = savedVehicle._id;
      
      // Add driver to vehicle's assignedTo field
      await Vehicle.findByIdAndUpdate(savedVehicle._id, {
        $push: { assignedTo: driverId }
      });
    }
    
    await Driver.findByIdAndUpdate(driverId, driverUpdate);

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
    let vehicleData = {};
    try {
      vehicleData = JSON.parse(req.body.data || "{}");
    } catch (err) {
      return res.status(400).json({ success: false, message: "Invalid JSON in data field" });
    }

    const { vehicleId, cabVehicleDetails, parcelVehicleDetails } = vehicleData;
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

    // Define allowed fields (excluding vehicleType, modelType, seatCapacity, color)
    const allowedCabFields = ['fuelType', 'vehiclePhotos', 'insuranceValidUpto', 'pollutionValidUpto', 'taxValidUpto', 'fitnessValidUpto', 'permitValidUpto', 'rc', 'insurance', 'pollutionCertificate', 'taxReceipt', 'fitnessCertificate', 'permit'];
    const allowedParcelFields = ['length', 'width', 'height', 'weightCapacity', 'fuelType', 'vehiclePhotos', 'insuranceValidUpto', 'pollutionValidUpto', 'taxValidUpto', 'fitnessValidUpto', 'permitValidUpto', 'rc', 'insurance', 'pollutionCertificate', 'taxReceipt', 'fitnessCertificate', 'permit'];

    const updateData = { $set: {} };
    
    // Get existing vehicle to preserve old images
    const existingVehicle = await Vehicle.findOne({ _id: vehicleId, owner: ownerId });
    if (!existingVehicle) {
      return res.status(404).json({ success: false, message: "Vehicle not found or not owned by you" });
    }

    // Filter cabVehicleDetails
    if (cabVehicleDetails) {
      const filteredCabDetails = { ...cabVehicleDetails };
      
      // Merge uploaded files
      Object.assign(filteredCabDetails, singleFiles);
      Object.entries(fileGroups).forEach(([fieldName, urls]) => {
        if (urls.length > 0) {
          filteredCabDetails[fieldName] = urls;
        }
      });
      
      // Preserve existing files if no new files uploaded
      const fileFields = ['vehiclePhotos', 'rc', 'insurance', 'pollutionCertificate', 'taxReceipt', 'fitnessCertificate', 'permit'];
      fileFields.forEach(field => {
        if (!filteredCabDetails[field] && existingVehicle.cabVehicleDetails?.[field]) {
          filteredCabDetails[field] = existingVehicle.cabVehicleDetails[field];
        }
      });
      
      // Update only allowed fields using dot notation
      allowedCabFields.forEach(field => {
        if (filteredCabDetails[field] !== undefined) {
          updateData.$set[`cabVehicleDetails.${field}`] = filteredCabDetails[field];
        }
      });
    }

    // Filter parcelVehicleDetails
    if (parcelVehicleDetails) {
      const filteredParcelDetails = { ...parcelVehicleDetails };
      
      // Merge uploaded files
      Object.assign(filteredParcelDetails, singleFiles);
      Object.entries(fileGroups).forEach(([fieldName, urls]) => {
        if (urls.length > 0) {
          filteredParcelDetails[fieldName] = urls;
        }
      });
      
      // Preserve existing files if no new files uploaded
      const fileFields = ['vehiclePhotos', 'rc', 'insurance', 'pollutionCertificate', 'taxReceipt', 'fitnessCertificate', 'permit'];
      fileFields.forEach(field => {
        if (!filteredParcelDetails[field] && existingVehicle.parcelVehicleDetails?.[field]) {
          filteredParcelDetails[field] = existingVehicle.parcelVehicleDetails[field];
        }
      });
      
      // Update only allowed fields using dot notation
      allowedParcelFields.forEach(field => {
        if (filteredParcelDetails[field] !== undefined) {
          updateData.$set[`parcelVehicleDetails.${field}`] = filteredParcelDetails[field];
        }
      });
    }

    // Set adminStatus to pending when vehicle is updated
    updateData.$set.adminStatus = 'pending';

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

    // Validate driver ownership
    if (driverToAssign.ownership !== "Driver") {
      return res.status(400).json({ 
        success: false, 
        message: "Only drivers with ownership type 'Driver' can be assigned to vehicles" 
      });
    }

    // Handle null assignedTo field and add driver
    await Vehicle.findByIdAndUpdate(vehicleId, [
      {
        $set: {
          assignedTo: {
            $cond: {
              if: { $eq: ["$assignedTo", null] },
              then: [new mongoose.Types.ObjectId(driverIdToAssign)],
              else: { $setUnion: ["$assignedTo", [new mongoose.Types.ObjectId(driverIdToAssign)]] }
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
        select: 'personalInformation.fullName mobile uniqueId vehiclesAssigned personalInformation.passportPhoto rideStatus isOnline',
        populate: {
          path: 'vehiclesAssigned',
          select: 'rcNumber cabVehicleDetails.modelType parcelVehicleDetails.modelType',
          populate: [
            { path: 'cabVehicleDetails.modelType', select: 'name' },
                        { path: 'cabVehicleDetails.vehicleType', select: 'name' },
            { path: 'parcelVehicleDetails.modelType', select: 'name' },
            { path: 'parcelVehicleDetails.vehicleType', select: 'name' }

          ]
        }
      })

    if (!owner) {
      return res.status(404).json({ success: false, message: "Owner not found" });
    }

    // Add computed status to each driver
    const driversWithStatus = owner.assignedDrivers.map(assignment => {
      const driver = assignment.driverId;
      let status = 'online';
      
      if (!driver.isOnline) {
        status = 'offline';
      } else if (['ONGOING', 'CONFIRMED', 'EXTENDED', 'REACHED'].includes(driver.rideStatus)) {
        status = 'onTrip';
      }
      
      return {
        ...assignment.toObject(),
        driverId: {
          ...driver.toObject(),
          status
        }
      };
    });

    res.json({ success: true, data: driversWithStatus });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get all vehicles for a specific driver
router.post("/get-driver-vehicles",adminAuthMiddleware, async (req, res) => {
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
    const ownerId = req.driver?.driverId

    if (!driverId) {
      return res.status(400).json({ success: false, message: "driverId is required" });
    }


    const vehicles = await Vehicle.find({
      
         owner: ownerId ,
        assignedTo: { $in: [driverId]  }
      
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

// Admin: Get all pending vehicles (adminStatus: 'pending')
router.get("/admin/pending",adminAuthMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const [vehicles, totalRecords] = await Promise.all([
      Vehicle.find({ adminStatus: 'pending' })
        .populate('owner', 'personalInformation.fullName mobile uniqueId')
        .populate('category', 'name')
        .populate('assignedTo', 'personalInformation.fullName mobile')
        .populate('cabVehicleDetails.vehicleType')
        .populate('cabVehicleDetails.modelType')
        .populate('parcelVehicleDetails.vehicleType')
        .populate('parcelVehicleDetails.modelType')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Vehicle.countDocuments({ adminStatus: 'pending' })
    ]);

    const totalPages = Math.ceil(totalRecords / limit);

    res.json({ 
      success: true, 
      data: vehicles,
      totalRecords,
      totalPages,
      currentPage: page,
      limit
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Admin: Get all approved vehicles (adminStatus: 'approved')
router.get("/admin/approved",adminAuthMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const [vehicles, totalRecords] = await Promise.all([
      Vehicle.find({ adminStatus: 'approved' })
        .populate('owner', 'personalInformation.fullName mobile uniqueId')
        .populate('category', 'name')
        .populate('assignedTo', 'personalInformation.fullName mobile')
        .populate('cabVehicleDetails.vehicleType')
        .populate('cabVehicleDetails.modelType')
        .populate('parcelVehicleDetails.vehicleType')
        .populate('parcelVehicleDetails.modelType')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Vehicle.countDocuments({ adminStatus: 'approved' })
    ]);

    const totalPages = Math.ceil(totalRecords / limit);

    res.json({ 
      success: true, 
      data: vehicles,
      totalRecords,
      totalPages,
      currentPage: page,
      limit
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Admin: Get all rejected vehicles (adminStatus: 'rejected')
router.get("/admin/rejected",adminAuthMiddleware, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const [vehicles, totalRecords] = await Promise.all([
      Vehicle.find({ adminStatus: 'rejected' })
        .populate('owner', 'personalInformation.fullName mobile uniqueId')
        .populate('category', 'name')
        .populate('assignedTo', 'personalInformation.fullName mobile')
        .populate('cabVehicleDetails.vehicleType')
        .populate('cabVehicleDetails.modelType')
        .populate('parcelVehicleDetails.vehicleType')
        .populate('parcelVehicleDetails.modelType')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Vehicle.countDocuments({ adminStatus: 'rejected' })
    ]);

    const totalPages = Math.ceil(totalRecords / limit);

    res.json({ 
      success: true, 
      data: vehicles,
      totalRecords,
      totalPages,
      currentPage: page,
      limit
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Admin: Approve vehicle
router.post("/admin/approve/:vehicleId", adminAuthMiddleware, async (req, res) => {
  try {
    const { vehicleId } = req.params;

    const vehicle = await Vehicle.findByIdAndUpdate(
      vehicleId,
      { 
        adminStatus: 'approved',
        approvedDate: new Date()
      },
      { new: true }
    )
      .populate('owner', 'personalInformation.fullName mobile uniqueId')
      .populate('category', 'name');

    if (!vehicle) {
      return res.status(404).json({ success: false, message: "Vehicle not found" });
    }

    res.json({ success: true, data: vehicle, message: "Vehicle approved successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Admin: Reject vehicle
router.post("/admin/reject/:vehicleId", adminAuthMiddleware, async (req, res) => {
  try {
    const { vehicleId } = req.params;

    const vehicle = await Vehicle.findByIdAndUpdate(
      vehicleId,
      { 
        adminStatus: 'rejected',
        rejectedDate: new Date()
      },
      { new: true }
    )
      .populate('owner', 'personalInformation.fullName mobile uniqueId')
      .populate('category', 'name');

    if (!vehicle) {
      return res.status(404).json({ success: false, message: "Vehicle not found" });
    }

    res.json({ success: true, data: vehicle, message: "Vehicle rejected successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;