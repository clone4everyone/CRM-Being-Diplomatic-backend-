import mongoose from 'mongoose';

const pendingUserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  phone: String,
  address: String,
  verificationToken: String,
  createdAt: { type: Date, default: Date.now, expires: '24h' } // auto delete after 24h
});

export default mongoose.model('PendingUser', pendingUserSchema);
