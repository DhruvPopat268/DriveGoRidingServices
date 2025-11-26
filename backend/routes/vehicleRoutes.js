const express = require("express");
const Vehicle = require("../DriverModel/VehicleModel");
const Driver = require("../DriverModel/DriverModel");
const DriverAuthMiddleware = require("../middleware/driverAuthMiddleware");
const router = express.Router();

// Get all vehicles owned by driver
router.get("/my-vehicles", DriverAuthMiddleware, async (req, res) => {
  try {
    const driverId = req.driver.driverId;
    
    const vehicles = await Vehicle.find({ owner: driverId })
      .populate('category', 'name')
      .populate('assignedTo', 'personalInformation.fullName mobile')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: vehicles });
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
      .sort({ createdAt: -1 });

    res.json({ success: true, data: vehicles });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Add new vehicle (Owner/Owner_With_Vehicle only)
router.post("/add", DriverAuthMiddleware, async (req, res) => {
  try {
    const driverId = req.driver.driverId;
    
    // Check if driver is Owner or Owner_With_Vehicle
    const driver = await Driver.findById(driverId).select('ownership');
    if (!driver || (driver.ownership !== "Owner" && driver.ownership !== "Owner_With_Vehicle")) {
      return res.status(403).json({ success: false, message: "Only owners can add vehicles" });
    }

    const { categoryId, rcNumber, vehicleDetails } = req.body;

    const newVehicle = new Vehicle({
      owner: driverId,
      category: categoryId,
      rcNumber,
      status: true,
      [vehicleDetails.type === "Cab" ? "cabVehicleDetails" : "parcelVehicleDetails"]: vehicleDetails
    });

    const savedVehicle = await newVehicle.save();

    // Add to driver's vehiclesOwned
    await Driver.findByIdAndUpdate(driverId, {
      $push: { vehiclesOwned: savedVehicle._id }
    });

    res.json({ success: true, data: savedVehicle, message: "Vehicle added successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Assign vehicle to driver
router.post("/assign/:vehicleId", DriverAuthMiddleware, async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const { driverIdToAssign } = req.body;
    const ownerId = req.driver.driverId;

    // Check if vehicle belongs to owner
    const vehicle = await Vehicle.findOne({ _id: vehicleId, owner: ownerId });
    if (!vehicle) {
      return res.status(404).json({ success: false, message: "Vehicle not found or not owned by you" });
    }

    // Update vehicle assignment
    vehicle.assignedTo = driverIdToAssign;
    await vehicle.save();

    // Add to assigned driver's vehiclesAssigned
    await Driver.findByIdAndUpdate(driverIdToAssign, {
      $push: { vehiclesAssigned: vehicleId }
    });

    res.json({ success: true, message: "Vehicle assigned successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Unassign vehicle
router.post("/unassign/:vehicleId", DriverAuthMiddleware, async (req, res) => {
  try {
    const { vehicleId } = req.params;
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

    res.json({ success: true, message: "Vehicle unassigned successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update vehicle status
router.patch("/status/:vehicleId", DriverAuthMiddleware, async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const { status } = req.body;
    const ownerId = req.driver.driverId;

    const vehicle = await Vehicle.findOneAndUpdate(
      { _id: vehicleId, owner: ownerId },
      { status },
      { new: true }
    );

    if (!vehicle) {
      return res.status(404).json({ success: false, message: "Vehicle not found or not owned by you" });
    }

    res.json({ success: true, data: vehicle, message: "Vehicle status updated" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get vehicle by ID
router.get("/:vehicleId", DriverAuthMiddleware, async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const driverId = req.driver.driverId;

    const vehicle = await Vehicle.findOne({
      _id: vehicleId,
      $or: [{ owner: driverId }, { assignedTo: driverId }]
    })
    .populate('category', 'name')
    .populate('owner', 'personalInformation.fullName mobile')
    .populate('assignedTo', 'personalInformation.fullName mobile');

    if (!vehicle) {
      return res.status(404).json({ success: false, message: "Vehicle not found" });
    }

    res.json({ success: true, data: vehicle });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;