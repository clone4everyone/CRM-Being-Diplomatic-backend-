const express = require('express');
const router = express.Router();
const ActivityLog = require('../models/ActivityLog');
const { authenticate, authorize } = require('../middleware/auth');

// Record login
router.post('/login', authenticate, async (req, res) => {
  try {
    const { userId, userName, userRole, ipAddress, userAgent } = req.body;
    
    const log = await ActivityLog.create({
      userId,
      userName,
      userRole,
      action: 'login',
      loginTime: new Date(),
      ipAddress,
      userAgent
    });

    res.status(201).json({ success: true, logId: log._id });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Record logout - No authentication needed for sendBeacon to work
// router.put('/logout/:logId', async (req, res) => {
//   try {
//     const { logId } = req.params;
//     const logoutTime = new Date();
    
//     const log = await ActivityLog.findById(logId);
//     if (!log) {
//       return res.status(404).json({ success: false, message: 'Log not found' });
//     }

//     const duration = Math.floor((logoutTime - log.loginTime) / 1000 / 60); // minutes
    
//     log.logoutTime = logoutTime;
//     log.sessionDuration = duration;
//     await log.save();

//     res.json({ success: true, log });
//   } catch (error) {
//     res.status(500).json({ success: false, message: error.message });
//   }
// });

// Record logout - Accept token in URL for sendBeacon compatibility
router.post('/logout/:logId/:token', async (req, res) => {
  try {
    const { logId, token } = req.params;
    const logoutTime = new Date();
    console.log("loggedout")
    // Verify token
    const jwt = require('jsonwebtoken');
    try {
      jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    } catch (error) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }
    
    const log = await ActivityLog.findById(logId);
    if (!log) {
      return res.status(404).json({ success: false, message: 'Log not found' });
    }

    const duration = Math.floor((logoutTime - log.loginTime) / 1000 / 60); // minutes
    
    log.logoutTime = logoutTime;
    log.sessionDuration = duration;
    await log.save();

    res.json({ success: true, log });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get all logs (admin only)
// Get all logs (admin only)
router.get('/', authenticate, authorize('super_admin'), async (req, res) => {
  try {
    const { startDate, endDate, role, userId } = req.query;
    
    let query = {};
    
    if (startDate && endDate) {
      // Set start date to beginning of day
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      
      // Set end date to end of day (23:59:59.999)
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      
      query.createdAt = {
        $gte: start,
        $lte: end
      };
    }
    
    if (role) query.userRole = role;
    if (userId) query.userId = userId;

    const logs = await ActivityLog.find(query)
      .sort({ createdAt: -1 })
      .populate('userId', 'name email')
      .lean();

    res.json({ success: true, logs });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;