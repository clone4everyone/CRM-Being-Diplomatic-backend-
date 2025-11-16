const mongoose = require('mongoose');

const salarySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  month: { type: Number, required: true, min: 1, max: 12 },
  year: { type: Number, required: true },
  baseSalary: { type: Number, required: true },
  bonus: { type: Number, default: 0 },
  deductions: { type: Number, default: 0 },
  projectEarnings: [{
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    amount: Number
  }],
  totalEarnings: Number,
  netSalary: Number,
  isPaid: { type: Boolean, default: false },
  paidDate: Date,
  remarks: String,
  processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

salarySchema.index({ user: 1, month: 1, year: 1 }, { unique: true });

salarySchema.pre('save', function(next) {
  const projectTotal = this.projectEarnings.reduce((sum, pe) => sum + (pe.amount || 0), 0);
  this.totalEarnings = this.baseSalary + this.bonus + projectTotal;
  this.netSalary = this.totalEarnings - this.deductions;
  next();
});

module.exports = mongoose.model('Salary', salarySchema);