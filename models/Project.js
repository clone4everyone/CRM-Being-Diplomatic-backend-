const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: String,
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  designers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  developers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  status: { 
    type: String, 
    enum: ['pending', 'in_progress', 'review', 'completed', 'on_hold', 'cancelled'],
    default: 'pending'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  startDate: Date,
  deadline: Date,
  completedDate: Date,
  budget: Number,
  actualCost: Number,
  paid:Number,// payment done by client till now.
  progress: { type: Number, default: 0, min: 0, max: 100 },
  remarks: [{
    text: String,
    addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    addedAt: { type: Date, default: Date.now }
  }],
  files: [{
    name: String,
    url: String,
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    uploadedAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

module.exports = mongoose.model('Project', projectSchema);
