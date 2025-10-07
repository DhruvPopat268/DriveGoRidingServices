const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Role = require('../models/Role');

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

    user.lastLogin = new Date();
    await user.save();

    res.json({
      token,
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

router.get('/permissions', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET_ADMIN);
    const role = await Role.findOne({ name: decoded.role }).populate('permissions');
    
    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }

    const permissions = role.permissions.map(permission => permission.name);
    res.json({ permissions });
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

module.exports = router;