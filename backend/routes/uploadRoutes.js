const express = require('express');
const router = express.Router();
const cloudinary = require('cloudinary').v2;
const multer = require('multer');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Upload image route
router.post('/image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Check if server storage is requested
    if (req.query.storage === 'server') {
      const path = require('path');
      const fs = require('fs');
      
      // Create testing directory if it doesn't exist
      const uploadPath = path.join(__dirname, '../testing/images');
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }
      
      // Save file to server
      const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(req.file.originalname || '.jpg');
      const filePath = path.join(uploadPath, uniqueName);
      fs.writeFileSync(filePath, req.file.buffer);
      
      return res.json({ 
        message: 'Image uploaded successfully to server',
        url: `/app/uploads/testing/images/${uniqueName}`,
        filename: uniqueName,
        size: req.file.size
      });
    }

    // Upload to Cloudinary (default)
    const result = await new Promise((resolve, reject) => {
      cloudinary.uploader.upload_stream(
        { resource_type: 'image' },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      ).end(req.file.buffer);
    });

    res.json({ url: result.secure_url });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Upload failed', error: error.message });
  }
});

// Test upload routes for server storage
const multer2 = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for server storage
const serverStorage = multer2.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../testing/images');
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

const serverUpload = multer2({ storage: serverStorage });

// Test route
router.get('/test-server', (req, res) => {
  res.json({ message: 'Server upload route is working!', timestamp: new Date().toISOString() });
});

// Server upload route
router.post('/server-image', serverUpload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image uploaded' });
    }

    res.json({ 
      message: 'Image uploaded successfully to server',
      url: `/app/uploads/testing/images/${req.file.filename}`,
      filename: req.file.filename,
      size: req.file.size
    });
  } catch (error) {
    console.error('Server upload error:', error);
    res.status(500).json({ message: 'Upload failed', error: error.message });
  }
});

module.exports = router;