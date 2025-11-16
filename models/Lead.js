const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
  salesPerson: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  clientName: { type: String, required: true },
  clientEmail: { type: String, required: true },
  clientPhone: { type: String, required: true },
  company: String,
  category: { 
    type: String, 
    enum: ['hot_deal', 'warm', 'cold', 'not_important', 'follow_up'],
    default: 'warm'
  },
  status: { 
    type: String, 
    enum: ['pending', 'confirmed', 'rejected', 'converted'],
    default: 'pending'
  },
  estimatedValue: Number,
  description: String,
  remarks: [{
    text: String,
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    addedAt: { type: Date, default: Date.now }
  }],
  convertedToProject: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' }
}, { timestamps: true });

module.exports = mongoose.model('Lead', leadSchema);