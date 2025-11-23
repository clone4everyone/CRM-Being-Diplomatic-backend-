const mongoose = require('mongoose');

const salesTargetSchema = new mongoose.Schema({
  salesPerson: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  
  // Target Period
  targetType: {
    type: String,
    enum: ['monthly', 'weekly', 'quarterly', 'yearly'],
    required: true
  },
  year: { 
    type: Number, 
    required: true 
  },
  month: { 
    type: Number, 
    min: 1, 
    max: 12 
  }, // for monthly targets
  week: { 
    type: Number, 
    min: 1, 
    max: 53 
  }, // for weekly targets
  quarter: { 
    type: Number, 
    min: 1, 
    max: 4 
  }, // for quarterly targets

  // Targets
  leadsTarget: { 
    type: Number, 
    default: 0 
  },
  conversionsTarget: { 
    type: Number, 
    default: 0 
  },
  revenueTarget: { 
    type: Number, 
    default: 0 
  },

  // Achievements
  leadsAchieved: { 
    type: Number, 
    default: 0 
  },
  conversionsAchieved: { 
    type: Number, 
    default: 0 
  },
  revenueAchieved: { 
    type: Number, 
    default: 0 
  },

  // Metadata
  setBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  notes: String,
  isActive: { 
    type: Boolean, 
    default: true 
  }
}, { 
  timestamps: true 
});

// Compound index for uniqueness
salesTargetSchema.index({ 
  salesPerson: 1, 
  targetType: 1, 
  year: 1, 
  month: 1, 
  week: 1 
}, { 
  unique: true 
});

// Virtual for achievement percentage
salesTargetSchema.virtual('leadsPercentage').get(function() {
  return this.leadsTarget > 0 
    ? ((this.leadsAchieved / this.leadsTarget) * 100).toFixed(2) 
    : 0;
});

salesTargetSchema.virtual('conversionsPercentage').get(function() {
  return this.conversionsTarget > 0 
    ? ((this.conversionsAchieved / this.conversionsTarget) * 100).toFixed(2) 
    : 0;
});

salesTargetSchema.virtual('revenuePercentage').get(function() {
  return this.revenueTarget > 0 
    ? ((this.revenueAchieved / this.revenueTarget) * 100).toFixed(2) 
    : 0;
});

module.exports = mongoose.model('SalesTarget', salesTargetSchema);