const express = require('express');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const OfflineStaff = require('../offline&agentBookingModels/offlineStaffModel');
const OfflineStaffSession = require('../offline&agentBookingModels/offlineStaffSessionModel');
const { sendOfflineStaffWelcomeEmail } = require('../Services/emailService');
const router = express.Router();

// POST - Create new staff
router.post('/', async (req, res) => {
  try {
    const { email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const staff = new OfflineStaff({
      email,
      password: hashedPassword
    });
    
    await staff.save();
    
    // Send welcome email
    try {
      await sendOfflineStaffWelcomeEmail(email, password);
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
    }
    
    res.status(201).json({ success: true, data: staff });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST - Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const staff = await OfflineStaff.findOne({ email, status: true });
    if (!staff || !await bcrypt.compare(password, staff.password)) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    const session = new OfflineStaffSession({
      staffId: staff._id,
      token,
      expiresAt
    });
    
    await session.save();
    res.json({ success: true, token, staff: { id: staff._id, email: staff.email } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET - Get all staff
router.get('/', async (req, res) => {
  try {
    const staff = await OfflineStaff.find().select('-password');
    res.json({ success: true, data: staff });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET - Get staff by ID
router.get('/:id', async (req, res) => {
  try {
    const staff = await OfflineStaff.findById(req.params.id).select('-password');
    if (!staff) {
      return res.status(404).json({ success: false, message: 'Staff not found' });
    }
    res.json({ success: true, data: staff });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PUT - Update staff
router.put('/:id', async (req, res) => {
  try {
    const { email, password } = req.body;
    const updateData = { email };
    
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }
    
    const staff = await OfflineStaff.findByIdAndUpdate(req.params.id, updateData, { new: true }).select('-password');
    if (!staff) {
      return res.status(404).json({ success: false, message: 'Staff not found' });
    }
    res.json({ success: true, data: staff });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// PATCH - Change status
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const staff = await OfflineStaff.findByIdAndUpdate(req.params.id, { status }, { new: true }).select('-password');
    if (!staff) {
      return res.status(404).json({ success: false, message: 'Staff not found' });
    }
    res.json({ success: true, data: staff });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;