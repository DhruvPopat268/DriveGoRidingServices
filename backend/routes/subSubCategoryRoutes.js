const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const SubSubCategory = require("../models/SubSubCategory");
const Category = require("../models/Category");
const SubCategory = require("../models/SubCategory");
const adminAuthMiddleware = require('../middleware/adminAuthMiddleware')
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

// ================= ROUTES ================= //

// ✅ Get all sub-subcategories
router.get("/", adminAuthMiddleware, async (req, res) => {
  try {
    const subSubCategories = await SubSubCategory.find()
      .populate("categoryId", "name")
      .populate("subCategoryId", "name");

    res.status(200).json(
      subSubCategories.map((subSub) => ({
        id: subSub._id,
        name: subSub.name,
        description: subSub.description,
        categoryId: subSub.categoryId ? subSub.categoryId._id : null,
        categoryName: subSub.categoryId ? subSub.categoryId.name : "Unassigned",
        subCategoryId: subSub.subCategoryId ? subSub.subCategoryId._id : null,
        subCategoryName: subSub.subCategoryId ? subSub.subCategoryId.name : "Unassigned",
        image: subSub.image || null,
      }))
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Get single sub-subcategory by id
router.get("/:id", adminAuthMiddleware, async (req, res) => {
  try {
    const subSubCategory = await SubSubCategory.findById(req.params.id)
      .populate("categoryId", "name")
      .populate("subCategoryId", "name");
    if (!subSubCategory) return res.status(404).json({ error: "Sub-subcategory not found" });
    res.json(subSubCategory);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ✅ Get subcategories by category ID
router.get("/subcategories/:categoryId", adminAuthMiddleware, async (req, res) => {
  try {
    const subcategories = await SubCategory.find({ categoryId: req.params.categoryId });
    res.json(subcategories);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});



// ✅ Create sub-subcategory with Cloudinary image upload
router.post("/", upload.single("image"), async (req, res) => {
  try {
    const { name, categoryId, subCategoryId, description } = req.body;

    let uploadedImage = null;
    if (req.file) {
      uploadedImage = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "subsubcategories" },
          (err, result) => {
            if (err) return reject(err);
            resolve(result.secure_url);
          }
        );
        stream.end(req.file.buffer);
      });
    }

    const subSubCategory = await SubSubCategory.create({
      name,
      categoryId,
      subCategoryId,
      description,
      image: uploadedImage,
    });

    res.status(201).json(subSubCategory);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ✅ Update sub-subcategory with optional Cloudinary image upload
router.put("/:id", upload.single("image"), async (req, res) => {
  try {
    const { name, categoryId, subCategoryId, description } = req.body;

    let uploadedImage = null;
    if (req.file) {
      uploadedImage = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "subsubcategories" },
          (err, result) => {
            if (err) return reject(err);
            resolve(result.secure_url);
          }
        );
        stream.end(req.file.buffer);
      });
    }

    const updated = await SubSubCategory.findByIdAndUpdate(
      req.params.id,
      {
        name,
        categoryId,
        subCategoryId,
        description,
        ...(uploadedImage && { image: uploadedImage }),
      },
      { new: true }
    );

    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ✅ Delete sub-subcategory
router.delete("/:id", async (req, res) => {
  try {
    await SubSubCategory.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>             User app                >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

// ✅ Get subsubcategories by subcategory ID
router.post("/userApp/by-subcategory", async (req, res) => {
  try {
    const { subcategoryId } = req.body;
    if (!subcategoryId) {
      return res.status(400).json({ error: "subcategoryId is required" });
    }
    const subSubCategories = await SubSubCategory.find({ subCategoryId: subcategoryId })
      .populate("categoryId", "name")
      .populate("subCategoryId", "name");
    res.json({ success: true, data: subSubCategories });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

module.exports = router;