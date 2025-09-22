const express =  require("express");
const Driver = require("../DriverModel/DriverModel");

const router = express.Router();

// Register Driver
router.post("/register", async (req, res) => {
  try {
    const driver = new Driver(req.body);
    await driver.save();
    res.status(201).json({ success: true, message: "Driver registered successfully", driver });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Get All Drivers
router.get("/", async (req, res) => {
  try {
    const drivers = await Driver.find();
    res.status(200).json(drivers);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get Driver by ID
router.get("/:id", async (req, res) => {
  try {
    const driver = await Driver.findById(req.params.id);
    if (!driver) return res.status(404).json({ success: false, message: "Driver not found" });
    res.status(200).json(driver);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update Driver
router.put("/:id", async (req, res) => {
  try {
    const driver = await Driver.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!driver) return res.status(404).json({ success: false, message: "Driver not found" });
    res.status(200).json({ success: true, message: "Driver updated successfully", driver });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Delete Driver
router.delete("/:id", async (req, res) => {
  try {
    const driver = await Driver.findByIdAndDelete(req.params.id);
    if (!driver) return res.status(404).json({ success: false, message: "Driver not found" });
    res.status(200).json({ success: true, message: "Driver deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;