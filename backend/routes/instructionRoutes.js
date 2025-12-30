const express = require('express');
const router = express.Router();
const Instruction = require('../models/Instruction');
const SubCategory = require('../models/SubCategory');
const Category = require('../models/Category');
const axios = require('axios'); // Add this if not already imported
const adminAuthMiddleware = require('../middleware/adminAuthMiddleware');
const { combinedAuthMiddleware } = require('../Services/authService');

// Create instruction
router.post('/', adminAuthMiddleware, async (req, res) => {
  try {
    const { categoryId, subCategoryId, subSubCategoryId, instructions, driverCategoryId, carCategoryId, carId, parcelCategoryId, vehicleTypeId } = req.body;

    // Validate required fields
    if (!categoryId || !subCategoryId || !instructions) {
      return res.status(400).json({
        success: false,
        message: 'categoryId, subCategoryId, and instructions are required'
      });
    }

    // Find category and subcategory names by their IDs
    const category = await Category.findById(categoryId);
    const subCategory = await SubCategory.findById(subCategoryId);

    if (!category || !subCategory) {
      return res.status(404).json({
        success: false,
        message: 'Category or SubCategory not found'
      });
    }

    const instructionData = {
      categoryId,
      categoryName: category.name,
      subCategoryId,
      subCategoryName: subCategory.name,
      instructions,
    };

    // Add subSubCategory if provided
    if (subSubCategoryId) {
      instructionData.subSubCategoryId = subSubCategoryId;
      instructionData.subSubCategoryName = req.body.subSubCategoryName;
    }

    // Handle driver category
    if (driverCategoryId) {
      try {
        const response = await axios.get('https://adminbackend.hire4drive.com/api/price-categories');
        const driverCategory = response.data.find(cat => cat._id === driverCategoryId);
        if (driverCategory) {
          instructionData.driverCategoryId = driverCategoryId;
          instructionData.driverCategoryName = driverCategory.priceCategoryName;
        }
      } catch (error) {
        console.error('Failed to fetch driver category:', error);
      }
    }

    // Handle cab category
    if (carCategoryId && carId) {
      try {
        const [carCatResponse, carResponse] = await Promise.all([
          axios.get('https://adminbackend.hire4drive.com/api/car-categories'),
          axios.get('https://adminbackend.hire4drive.com/api/cars')
        ]);
        const carCategory = carCatResponse.data.find(cat => cat._id === carCategoryId);
        const car = carResponse.data.find(c => c._id === carId);
        if (carCategory && car) {
          instructionData.carCategoryId = carCategoryId;
          instructionData.carCategoryName = carCategory.name;
          instructionData.carId = carId;
          instructionData.carName = car.name;
        }
      } catch (error) {
        console.error('Failed to fetch car details:', error);
      }
    }

    // Handle parcel category - check if it's parcel category by categoryName
    if (category.name.toLowerCase() === 'parcel' && driverCategoryId && vehicleTypeId) {
      instructionData.parcelCategoryId = driverCategoryId;
      instructionData.parcelCategoryName = req.body.driverCategoryName;
      instructionData.vehicleTypeId = vehicleTypeId;
      instructionData.vehicleTypeName = req.body.vehicleTypeName;
    }

    // Handle parcel category with explicit parcelCategoryId
    if (parcelCategoryId && vehicleTypeId) {
      try {
        const response = await axios.get('https://adminbackend.hire4drive.com/api/parcelVehicles');
        const vehicleType = response.data.find(vt => vt._id === vehicleTypeId);
        if (vehicleType) {
          instructionData.parcelCategoryId = parcelCategoryId;
          instructionData.parcelCategoryName = vehicleType.parcelCategory.categoryName;
          instructionData.vehicleTypeId = vehicleTypeId;
          instructionData.vehicleTypeName = vehicleType.name;
        }
      } catch (error) {
        console.error('Failed to fetch parcel vehicle type:', error);
      }
    }

    const instruction = new Instruction(instructionData);
    await instruction.save();
    res.status(201).json({ success: true, data: instruction });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get all instructions
router.get('/', adminAuthMiddleware, async (req, res) => {
  try {
    const instructions = await Instruction.find().sort({ createdAt: -1 });
    res.json({ success: true, data: instructions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post("/getInstructions", combinedAuthMiddleware, async (req, res) => {
  try {
    const {
      categoryId,
      subCategoryId,
      subSubCategoryId,
      driverCategoryId,
      carCategoryId,
      parcelCategoryId,
      vehicleTypeId,
      carId
    } = req.body;

    // categoryId & subCategoryId are minimum required
    if (!categoryId || !subCategoryId) {
      return res.status(400).json({
        success: false,
        message: "categoryId and subCategoryId are required",
      });
    }

    // Build dynamic query object
    const query = { categoryId, subCategoryId };

    if (subSubCategoryId) query.subSubCategoryId = subSubCategoryId;
    if (driverCategoryId) query.driverCategoryId = driverCategoryId;
    if (carCategoryId) query.carCategoryId = carCategoryId;
    if (carId) query.carId = carId;
    if (parcelCategoryId) query.parcelCategoryId = parcelCategoryId;
    if (vehicleTypeId) query.vehicleTypeId = vehicleTypeId;

    // console.log("Instruction Query =>", query);

    // Fetch all instructions matching the given IDs
    const instructions = await Instruction.find(query);

    // Map only instruction text array
    const instructionTexts = instructions.map((item) => item.instructions);

    return res.json({
      success: true,
      data: instructionTexts,
    });
  } catch (err) {
    console.error("Error fetching instructions:", err);
    return res.status(500).json({
      success: false,
      message: "Server error: " + err.message,
    });
  }
});

// Update instruction
router.put('/:id', adminAuthMiddleware, async (req, res) => {
  try {
    const { categoryId, subCategoryId, driverCategoryId, instructions } = req.body;

    // If driverCategoryId is being updated, fetch the new driver category name
    if (driverCategoryId) {
      try {
        const response = await axios.get(`${process.env.API_URL}/api/price-categories`);
        const priceCategories = response.data;
        const driverCategory = priceCategories.find(cat => cat._id === driverCategoryId);

        if (driverCategory) {
          req.body.driverCategoryName = driverCategory.priceCategoryName;
        }
      } catch (error) {
        console.error('Failed to fetch driver category details during update:', error);
      }
    }

    // If categoryId is being updated, fetch the new category name
    if (categoryId) {
      const category = await Category.findById(categoryId);
      if (category) {
        req.body.categoryName = category.name;
      }
    }

    // If subCategoryId is being updated, fetch the new subcategory name
    if (subCategoryId) {
      const subCategory = await SubCategory.findById(subCategoryId);
      if (subCategory) {
        req.body.subCategoryName = subCategory.name;
      }
    }

    const instruction = await Instruction.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!instruction) {
      return res.status(404).json({ success: false, message: 'Instruction not found' });
    }

    res.json({ success: true, data: instruction });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Delete instruction
router.delete('/:id', adminAuthMiddleware, async (req, res) => {
  try {
    const instruction = await Instruction.findByIdAndDelete(req.params.id);
    if (!instruction) {
      return res.status(404).json({ success: false, message: 'Instruction not found' });
    }
    res.json({ success: true, message: 'Instruction deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;