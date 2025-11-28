const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  userName: { type: String, required: true },
  userRole: { 
    type: String, 
    enum: ['super_admin', 'sales', 'designer', 'developer', 'client'],
    required: true 
  },
  action: { 
    type: String, 
    enum: ['login', 'logout'],
    required: true 
  },
  loginTime: { type: Date },
  logoutTime: { type: Date },
  sessionDuration: { type: Number }, // in minutes
  ipAddress: String,
  userAgent: String
}, { timestamps: true });

// Index for faster queries
activityLogSchema.index({ createdAt: -1 });
activityLogSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('ActivityLog', activityLogSchema);