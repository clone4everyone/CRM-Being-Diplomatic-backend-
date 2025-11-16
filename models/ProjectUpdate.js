const mongoose = require('mongoose');

const projectUpdateSchema = new mongoose.Schema({
  project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  updateType: {
    type: String,
    enum: ['design_update', 'development_update', 'status_change', 'file_upload'],
    required: true
  },
  title: { type: String, required: true },
  description: String,
  files: [{
    name: String,
    url: String,
    fileType: String
  }],
  status: String,
  remarks: String,
  isVisibleToClient: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('ProjectUpdate', projectUpdateSchema);