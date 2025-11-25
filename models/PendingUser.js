const mongoose = require('mongoose');

const pendingUserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  phone: String,
  address: String,
  verificationToken: String,
  createdAt: { type: Date, default: Date.now, expires: '24h' } // auto delete after 24h
});

module.exports = mongoose.model('PendingUser', pendingUserSchema);
