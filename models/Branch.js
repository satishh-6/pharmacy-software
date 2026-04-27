const mongoose = require('mongoose');

const branchSchema = new mongoose.Schema({
  name: { type: String, required: true },
  address: { type: String },
  phone: { type: String },
  gstNo: { type: String },
  isMain: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  managerName: { type: String },
  openTime: { type: String, default: '09:00' },
  closeTime: { type: String, default: '21:00' }
}, { timestamps: true });

module.exports = mongoose.model('Branch', branchSchema);