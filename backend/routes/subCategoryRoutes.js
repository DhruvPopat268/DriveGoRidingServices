const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const SubCategory = require("../models/SubCategory");
const Category = require("../models/Category");
const { ObjectId } = mongoose.Types;
const driverAuthMiddleware = require('../middleware/driverAuthMiddleware')

const multer = require("multer");
const cloudinary = require("cloudinary").v2;

// Multer setup (store in memory)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ✅ Get all subcategories
router.get("/", async (req, res) => {
  try {
    const subcategories = await SubCategory.find().populate("categoryId", "name");

    res.status(200).json(
      subcategories.map((sub) => ({
        id: sub._id,
        name: sub.name,
        description: sub.description,
        categoryId: sub.categoryId ? sub.categoryId._id : null,
        categoryName: sub.categoryId ? sub.categoryId.name : "Unassigned",
        image: sub.image || null,
      }))
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Get single subcategory by id
router.get("/:id", async (req, res) => {
  try {
    const subcategory = await SubCategory.findById(req.params.id).populate("categoryId", "name");
    if (!subcategory) return res.status(404).json({ error: "Subcategory not found" });
    res.json(subcategory);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ✅ Create subcategory with Cloudinary image upload
router.post("/", upload.single("image"), async (req, res) => {
  try {
    const { name, categoryId, description } = req.body;

    let uploadedImage = null;
    if (req.file) {
      uploadedImage = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "subcategories" },
          (err, result) => {
            if (err) return reject(err);
            resolve(result.secure_url); // only save URL
          }
        );
        stream.end(req.file.buffer);
      });
    }

    const subCategory = await SubCategory.create({
      name,
      categoryId,
      description,
      image: uploadedImage,
    });

    res.status(201).json(subCategory);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ✅ Update subcategory with optional Cloudinary image upload
router.put("/:id", upload.single("image"), async (req, res) => {
  try {
    const { name, categoryId, description } = req.body;

    let uploadedImage = null;
    if (req.file) {
      uploadedImage = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "subcategories" },
          (err, result) => {
            if (err) return reject(err);
            resolve(result.secure_url);
          }
        );
        stream.end(req.file.buffer);
      });
    }

    const updated = await SubCategory.findByIdAndUpdate(
      req.params.id,
      {
        name,
        categoryId,
        description,
        ...(uploadedImage && { image: uploadedImage }), // only update if new image
      },
      { new: true }
    );

    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ✅ Delete subcategory
router.delete("/:id", async (req, res) => {
  try {
    await SubCategory.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>           Driver                >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

// ✅ Get subcategories by categoryId
router.post("/by-category", driverAuthMiddleware, async (req, res) => {
  try {
    const { categoryId } = req.body;
    const subcategories = await SubCategory.find({ categoryId }).populate("categoryId", "name");
    res.status(200).json({
      success: true,
      data:subcategories
    }
    );
  } catch (err) {
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
});

module.exports = router;

// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>           User app                >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

// ✅ Get subcategories by categoryId
router.post("/by-category",  async (req, res) => {
  try {
    const { categoryId } = req.body;
    const subcategories = await SubCategory.find({ categoryId }).populate("categoryId", "name");
    res.status(200).json({
      success: true,
      data:subcategories
    }
    );
  } catch (err) {
    res.status(500).json({ 
      success: false,
      error: err.message 
    });
  }
});

module.exports = router;