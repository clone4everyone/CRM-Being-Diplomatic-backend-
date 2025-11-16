const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true },
  checkIn: Date,
  checkOut: Date,
  status: {
    type: String,
    enum: ['present', 'absent', 'half_day', 'leave', 'work_from_home'],
    default: 'absent'
  },
  totalHours: Number,
  remarks: String,
  markedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

attendanceSchema.index({ user: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', attendanceSchema);