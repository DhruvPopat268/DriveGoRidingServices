const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const Permission = require('../models/Permission');
const Role = require('../models/Role');
const User = require('../models/User');
const { sendWelcomeEmail } = require('../Services/emailService');
const adminAuthMiddleware = require('../middleware/adminAuthMiddleware');

// Permission routes
router.get('/permissions', adminAuthMiddleware, async (req, res) => {
  try {
    const permissions = await Permission.find().sort({createdAt: -1});
    res.json(permissions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/permissions', adminAuthMiddleware, async (req, res) => {
  try {
    const permission = new Permission(req.body);
    await permission.save();
    res.status(201).json(permission);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/permissions/:id', adminAuthMiddleware, async (req, res) => {
  try {
    const permission = await Permission.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(permission);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/permissions/:id', adminAuthMiddleware, async (req, res) => {
  try {
    await Permission.findByIdAndDelete(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Role routes
router.get('/roles', adminAuthMiddleware, async (req, res) => {
  try {
    const roles = await Role.find().populate('permissions');
    const rolesWithUserCount = await Promise.all(
      roles.map(async (role) => {
        const userCount = await User.countDocuments({ role: role._id });
        return { ...role.toObject(), userCount };
      })
    );
    res.json(rolesWithUserCount);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/roles', adminAuthMiddleware, async (req, res) => {
  try {
    const role = new Role(req.body);
    await role.save();
    res.status(201).json(role);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/roles/:id', adminAuthMiddleware, async (req, res) => {
  try {
    const role = await Role.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate('permissions');
    res.json(role);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/roles/:id', adminAuthMiddleware, async (req, res) => {
  try {
    await Role.findByIdAndDelete(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// User routes
router.get('/users', adminAuthMiddleware, async (req, res) => {
  try {
    const users = await User.find().populate('role');
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/users', adminAuthMiddleware, async (req, res) => {
  try {
    const userData = req.body;
    const plainPassword = userData.password;
    
    const user = new User(userData);
    await user.save();
    
    const populatedUser = await User.findById(user._id).populate('role');
    
    try {
      await sendWelcomeEmail(
        populatedUser.email,
        populatedUser.name,
        plainPassword,
        populatedUser.role.name
      );
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
    }
    
    res.status(201).json(populatedUser);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.put('/users/:id', adminAuthMiddleware, async (req, res) => {
  try {
    const updateData = { ...req.body };
    if (updateData.password && updateData.password.trim() !== '') {
      updateData.password = await bcrypt.hash(updateData.password, 12);
    } else {
      delete updateData.password;
    }
    const user = await User.findByIdAndUpdate(req.params.id, updateData, { new: true }).populate('role');
    res.json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.delete('/users/:id', adminAuthMiddleware, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;