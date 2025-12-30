const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Role = require('../models/Role');
const { createAdminSession, removeAdminSession } = require('../Services/AdminSessionService');
const adminAuthMiddleware = require('../middleware/adminAuthMiddleware');

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).populate('role');
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (user.status !== 'Active') {
      return res.status(401).json({ error: 'Account is inactive' });
    }

    const token = jwt.sign(
      { 
        userId: user._id, 
        email: user.email,
        role: user.role.name 
      },
      process.env.JWT_SECRET_ADMIN,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    // Create admin session (removes old sessions if any)
    await createAdminSession(user.email, token);

    user.lastLogin = new Date();
    await user.save();

    // Set token as httpOnly cookie
    res.cookie('adminToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      domain: process.env.NODE_ENV === 'production' ? '.hire4drive.com' : undefined,
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role.name
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/permissions', adminAuthMiddleware, async (req, res) => {
  try {
    const role = await Role.findOne({ name: req.admin.role }).populate('permissions');
    
    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }

    const permissions = role.permissions.map(permission => permission.name);
    res.json({ permissions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/logout', adminAuthMiddleware, async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '') || req.cookies?.adminToken;
    await removeAdminSession(token);
    
    // Clear the cookie
    res.clearCookie('adminToken');
    
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;