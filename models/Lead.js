// models/Lead.js
const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
  // Assignment
  salesPerson: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  assignedDate: {
    type: Date,
    default: Date.now
  },

  // Client Information
  clientName: {
    type: String,
    required: true,
    trim: true
  },
  clientEmail: {
    type: String,
    trim: true,
    lowercase: true
  },
  clientPhone: {
    type: String,
    trim: true
  },
  company: {
    type: String,
    trim: true
  },

  // Lead Details
  category: {
    type: String,
    enum: ['hot_deal', 'warm', 'cold', 'follow_up'],
    default: 'warm'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['new', 'contacted', 'qualified', 'negotiation', 'converted', 'lost', 'rejected'],
    default: 'new'
  },
  source: {
    type: String,
    enum: ['website', 'referral', 'cold_call', 'email', 'social_media', 'event', 'other'],
    default: 'other'
  },

  // Financial
  estimatedValue: {
    type: Number,
    default: 0
  },
  actualValue: {
    type: Number
  },

  // Description
  description: {
    type: String
  },

  // Dates
  nextFollowUpDate: {
    type: Date
  },
  lastContactedDate: {
    type: Date
  },
  targetCloseDate: {
    type: Date
  },
  actualCloseDate: {
    type: Date
  },
  conversionDate: {
    type: Date
  },

  // Conversion
  convertedToProject: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  },
  lostReason: {
    type: String
  },

  // Activities
  activities: [{
    type: {
      type: String,
      enum: ['call', 'email', 'meeting', 'note', 'status_change', 'other'],
      required: true
    },
    description: {
      type: String,
      required: true
    },
    notes: String,
    outcome: String,
    nextAction: String,
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    performedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Remarks/Notes
  remarks: [{
    text: {
      type: String,
      required: true
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Status
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for better query performance
leadSchema.index({ salesPerson: 1, status: 1 });
leadSchema.index({ nextFollowUpDate: 1 });
leadSchema.index({ status: 1 });
leadSchema.index({ category: 1 });
leadSchema.index({ createdAt: -1 });
leadSchema.index({ conversionDate: 1 });

// Virtual for days since creation
leadSchema.virtual('daysSinceCreation').get(function() {
  const now = new Date();
  const diffTime = Math.abs(now - this.createdAt);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

// Virtual for days until follow-up
leadSchema.virtual('daysUntilFollowUp').get(function() {
  if (!this.nextFollowUpDate) return null;
  const now = new Date();
  const diffTime = this.nextFollowUpDate - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

// Middleware to set conversionDate when status changes to 'converted'
leadSchema.pre('save', function(next) {
  // If status is being changed to 'converted' and conversionDate is not set
  if (this.isModified('status') && this.status === 'converted' && !this.conversionDate) {
    this.conversionDate = new Date();
    
    // Also set actualCloseDate if not set
    if (!this.actualCloseDate) {
      this.actualCloseDate = new Date();
    }
  }
  next();
});

const Lead = mongoose.model('Lead', leadSchema);

module.exports = Lead;