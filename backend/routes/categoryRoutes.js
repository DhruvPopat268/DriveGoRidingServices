// routes/category.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const Category = require('../models/Category');
const driverAuthMiddleware = require('../middleware/driverAuthMiddleware')


// Multer for file upload
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

router.get("/", async (req, res) => {
  try {
    const categories = await Category.find().sort({ createdAt: -1 });
    res.status(200).json(categories);
  } catch (error) {
    res.status(500).json({ message: "Error fetching categories", error: error.message });
  }
});

// CREATE CATEGORY
router.post('/', upload.single('image'), async (req, res) => {
  try {
    console.log("➡️ Incoming request body:", req.body);
    console.log("➡️ Incoming file:", req.file);

    const { name, description } = req.body;

    if (!name || !name.trim()) {
      console.log("❌ Category name missing");
      return res.status(400).json({ success: false, message: 'Category name is required' });
    }

    const existingCategory = await Category.findOne({ name: name.trim() });
    if (existingCategory) {
      console.log("❌ Category already exists:", existingCategory);
      return res.status(400).json({ success: false, message: 'Category already exists' });
    }

    // ✅ Upload image to Cloudinary
    let uploadedImage = null;
    if (req.file) {
      console.log("📤 Uploading image to Cloudinary...");

      uploadedImage = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "categories" },
          (err, result) => {
            if (err) {
              console.error("❌ Cloudinary upload error:", err);
              return reject(err);
            }
            console.log("✅ Cloudinary upload success:", result);
            resolve({ public_id: result.public_id, url: result.secure_url });
          }
        );

        console.log("➡️ Writing buffer to Cloudinary stream...");
        stream.end(req.file.buffer);
      });
    } else {
      console.log("⚠️ No file received in request");
    }

    console.log("📦 Final uploadedImage object:", uploadedImage);

    // ✅ Save category
    const category = await Category.create({
      name: name.trim(),
      description: description || '',
      image: uploadedImage,
    });

    console.log("✅ Category created in DB:", category);

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: category,
    });
  } catch (error) {
    console.error('🔥 Error creating category:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
});

// UPDATE CATEGORY
router.put('/:id', upload.single('image'), async (req, res) => {
  try {
    const { name, description } = req.body;
    let updateData = { name, description };

    if (req.file) {
      let uploadedImage;
      await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'categories' },
          (err, result) => {
            if (err) reject(err);
            uploadedImage = { public_id: result.public_id, url: result.secure_url };
            resolve();
          }
        );
        stream.end(req.file.buffer);
      });
      updateData.image = uploadedImage;
    }

    const category = await Category.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });

    res.json({ success: true, message: 'Category updated successfully', data: category });
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
});

// DELETE CATEGORY
router.delete('/:id', async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });

    if (category.image?.public_id) {
      await cloudinary.uploader.destroy(category.image.public_id);
    }

    await category.deleteOne();
    res.json({ success: true, message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ success: false, message: 'Server Error', error: error.message });
  }
});

// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>           Driver                >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>

router.get("/all",driverAuthMiddleware, async (req, res) => {
  try {
    const categories = await Category.find().sort({ createdAt: -1 });
    res.status(200).json({success:true,data:categories});
  } catch (error) {
    res.status(500).json({ success:false,message: "Error fetching categories", error: error.message });
  }
});

module.exports = router;