const express = require("express");
const RiderAddresses = require("../models/RiderAddresses");
const authMiddleware = require("../middleware/authMiddleware");
const router = express.Router();

// GET - Get all addresses for a rider
router.get("/", authMiddleware, async (req, res) => {
  try {
    const { riderId } = req.rider;

    const riderAddresses = await RiderAddresses.findOne({ riderId });

    if (!riderAddresses || !riderAddresses.addresses.length) {
      return res.status(200).json({
        success: true,
        message: "No addresses found",
        addresses: []
      });
    }

    res.status(200).json({
      success: true,
      addresses: riderAddresses.addresses
    });
  } catch (error) {
    console.error("Error fetching addresses:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
});

// POST - Add new address
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { riderId } = req.rider;
    const { name, address, lat, lng } = req.body;

    if (!name || !address || !lat || !lng) {
      return res.status(400).json({
        success: false,
        message: "Name, address, lat, and lng are required"
      });
    }

    let riderAddresses = await RiderAddresses.findOne({ riderId });

    if (!riderAddresses) {
      riderAddresses = new RiderAddresses({
        riderId,
        addresses: [{ name, address, lat, lng }]
      });
    } else {
      riderAddresses.addresses.push({ name, address, lat, lng });
    }

    await riderAddresses.save();

    res.status(201).json({
      success: true,
      message: "Address added successfully",
      address: riderAddresses.addresses[riderAddresses.addresses.length - 1]
    });
  } catch (error) {
    console.error("Error adding address:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
});

// PUT - Update address
router.put("/", authMiddleware, async (req, res) => {
  try {
    const { riderId } = req.rider;
    const { addressId, name, address, lat, lng } = req.body;

    if (!addressId || !name || !address || !lat || !lng) {
      return res.status(400).json({
        success: false,
        message: "AddressId, name, address, lat, and lng are required"
      });
    }

    const result = await RiderAddresses.findOneAndUpdate(
      { riderId, "addresses._id": addressId },
      {
        $set: {
          "addresses.$.name": name,
          "addresses.$.address": address,
          "addresses.$.lat": lat,
          "addresses.$.lng": lng
        }
      },
      { new: true }
    );

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "RiderId and AddressId are not matching"
      });
    }

    const updatedAddress = result.addresses.find(addr => addr._id.toString() === addressId);

    res.status(200).json({
      success: true,
      message: "Address updated successfully",
      address: updatedAddress
    });
  } catch (error) {
    console.error("Error updating address:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
});

// DELETE - Delete address
router.delete("/", authMiddleware, async (req, res) => {
  try {
    const { riderId } = req.rider;
    const { addressId } = req.body;

    if (!addressId) {
      return res.status(400).json({
        success: false,
        message: "AddressId is required"
      });
    }

    const result = await RiderAddresses.findOneAndUpdate(
      { riderId, "addresses._id": addressId },
      { $pull: { addresses: { _id: addressId } } },
      { new: true }
    );

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "RiderId and AddressId are not matching"
      });
    }

    res.status(200).json({
      success: true,
      message: "Address deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting address:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message
    });
  }
});

module.exports = router;