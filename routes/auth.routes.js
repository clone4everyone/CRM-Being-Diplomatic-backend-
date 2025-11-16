// routes/auth.routes.js
const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone, address } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');

    const user = new User({
      name,
      email,
      password,
      phone,
      address,
      verificationToken,
      role: 'client' // Default role
    });

    await user.save();

    // In production, send verification email here
    console.log(`Verification token for ${email}: ${verificationToken}`);

    res.status(201).json({ 
      success: true, 
      message: 'Registration successful. Please verify your email and wait for admin approval.',
      verificationToken // Remove in production
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Verify Email
router.get('/verify-email/:token', async (req, res) => {
  try {
    const user = await User.findOne({ verificationToken: req.params.token });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid verification token' });
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    await user.save();

    res.json({ 
      success: true, 
      message: 'Email verified successfully. Please wait for admin approval.' 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
console.log("login")
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (!user.isVerified) {
      return res.status(401).json({ success: false, message: 'Please verify your email first' });
    }

    if (!user.isApproved) {
      return res.status(401).json({ success: false, message: 'Your account is pending approval' });
    }

    if (!user.active) {
      return res.status(401).json({ success: false, message: 'Your account has been deactivated' });
    }

    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get Current User Profile
router.get('/me', authenticate, async (req, res) => {
  try {
    res.json({ success: true, user: req.user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update Profile
router.put('/profile', authenticate, async (req, res) => {
  try {
    const { name, phone, address, profileImage } = req.body;
    
    const user = await User.findById(req.user._id);
    
    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (address) user.address = address;
    if (profileImage) user.profileImage = profileImage;
    
    await user.save();
    
    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Change Password
router.put('/change-password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    const user = await User.findById(req.user._id);
    
    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }
    
    user.password = newPassword;
    await user.save();
    
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;