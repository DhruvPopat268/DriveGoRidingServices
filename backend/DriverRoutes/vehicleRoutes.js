const express = require("express");
const Vehicle = require("../DriverModel/VehicleModel");
const Driver = require("../DriverModel/DriverModel");
const DriverAuthMiddleware = require("../middleware/driverAuthMiddleware");
const { evaluateDriverProgress } = require("../utils/driverSteps");
const router = express.Router();

// Create vehicle (Owner/Owner_With_Vehicle only)
router.post("/create", DriverAuthMiddleware, async (req, res) => {
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

    const { rcNumber, vehicleDetails } = req.body;

    const newVehicle = new Vehicle({
      owner: driverId,
      category: driver.selectedCategory.id,
      rcNumber,
      status: true,
      [vehicleDetails.type === "Cab" ? "cabVehicleDetails" : "parcelVehicleDetails"]: vehicleDetails
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
router.put("/update", DriverAuthMiddleware, async (req, res) => {
  try {
    const { vehicleId, ...updateData } = req.body;
    const ownerId = req.driver.driverId;

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

// Assign vehicle to driver
router.post("/assign", DriverAuthMiddleware, async (req, res) => {
  try {
    const { vehicleId, driverIdToAssign } = req.body;
    const ownerId = req.driver.driverId;

    // Check if vehicle belongs to owner
    const vehicle = await Vehicle.findOne({ _id: vehicleId, owner: ownerId });
    if (!vehicle) {
      return res.status(404).json({ success: false, message: "Vehicle not found or not owned by you" });
    }

    // Check if driver exists
    const driverToAssign = await Driver.findById(driverIdToAssign);
    if (!driverToAssign) {
      return res.status(404).json({ success: false, message: "Driver not found" });
    }

    // Remove from previous driver if assigned
    if (vehicle.assignedTo) {
      await Driver.findByIdAndUpdate(vehicle.assignedTo, {
        $pull: { vehiclesAssigned: vehicleId }
      });
    }

    // Update vehicle assignment
    vehicle.assignedTo = driverIdToAssign;
    await vehicle.save();

    // Add to assigned driver's vehiclesAssigned
    await Driver.findByIdAndUpdate(driverIdToAssign, {
      $addToSet: { vehiclesAssigned: vehicleId }
    });

    res.json({ success: true, message: "Vehicle assigned successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Remove vehicle from driver (unassign)
router.post("/remove-from-driver", DriverAuthMiddleware, async (req, res) => {
  try {
    const { vehicleId } = req.body;
    const ownerId = req.driver.driverId;

    const vehicle = await Vehicle.findOne({ _id: vehicleId, owner: ownerId });
    if (!vehicle) {
      return res.status(404).json({ success: false, message: "Vehicle not found or not owned by you" });
    }

    const previousAssignedTo = vehicle.assignedTo;
    
    // Remove assignment
    vehicle.assignedTo = null;
    await vehicle.save();

    // Remove from previous driver's vehiclesAssigned
    if (previousAssignedTo) {
      await Driver.findByIdAndUpdate(previousAssignedTo, {
        $pull: { vehiclesAssigned: vehicleId }
      });
    }

    res.json({ success: true, message: "Vehicle removed from driver successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get vehicles assigned to driver
router.get("/assigned-vehicles", DriverAuthMiddleware, async (req, res) => {
  try {
    const driverId = req.driver.driverId;
    
    const vehicles = await Vehicle.find({ assignedTo: driverId })
      .populate('category', 'name')
      .populate('owner', 'personalInformation.fullName mobile')
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
      $or: [{ owner: driverId }, { assignedTo: driverId }]
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

module.exports = router;