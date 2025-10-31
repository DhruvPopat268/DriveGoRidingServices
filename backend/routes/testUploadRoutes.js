const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Upload = require('../models/Upload');
const router = express.Router();

// Configure multer for images
const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../cloud/images');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueName + path.extname(file.originalname));
  }
});

// Configure multer for files
const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../cloud/documents');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueName + path.extname(file.originalname));
  }
});

const uploadImage = multer({ 
  storage: imageStorage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files allowed'), false);
    }
  }
});

const uploadFile = multer({ 
  storage: fileStorage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Upload image route
router.post('/image', uploadImage.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image uploaded' });
    }

    const upload = new Upload({
      filename: req.file.filename,
      originalName: req.file.originalname,
      path: `/cloud/images/${req.file.filename}`,
      type: 'image',
      size: req.file.size
    });

    await upload.save();

    res.json({ 
      message: 'Image uploaded successfully',
      url: `/cloud/images/${req.file.filename}`,
      upload
    });
  } catch (error) {
    console.error('Image upload error:', error);
    res.status(500).json({ message: 'Upload failed', error: error.message });
  }
});

// Upload file route
router.post('/file', uploadFile.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const upload = new Upload({
      filename: req.file.filename,
      originalName: req.file.originalname,
      path: `/cloud/documents/${req.file.filename}`,
      type: 'file',
      size: req.file.size
    });

    await upload.save();

    res.json({ 
      message: 'File uploaded successfully',
      url: `/cloud/documents/${req.file.filename}`,
      upload
    });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ message: 'Upload failed', error: error.message });
  }
});

// Get all uploads
router.get('/uploads', async (req, res) => {
  try {
    const uploads = await Upload.find().sort({ uploadedAt: -1 });
    res.json(uploads);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch uploads', error: error.message });
  }
});

// Test route
router.get('/test', (req, res) => {
  res.json({ message: 'Test upload routes working!' });
});

module.exports = router;