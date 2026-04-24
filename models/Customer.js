const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, unique: true, sparse: true },
  email: { type: String },
  address: { type: String },
  dob: { type: String }, // Birthday for wishes
  gender: { type: String, enum: ['male', 'female', 'other'] },

  // Medical info
  doctor: { type: String },
  bloodGroup: { type: String },
  allergies: { type: String },
  chronicConditions: { type: String }, // BP, Diabetes etc

  // Loyalty
  loyaltyPoints: { type: Number, default: 0 },
  totalPurchases: { type: Number, default: 0 },
  totalSpent: { type: Number, default: 0 },
  lastVisit: { type: Date },

  // Notes
  notes: { type: String },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Customer', customerSchema);