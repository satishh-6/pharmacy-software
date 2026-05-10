const mongoose = require('mongoose');

const prescriptionSchema = new mongoose.Schema({
  tenantId: { type: String, required: true, index: true },
  // Patient
  patient: { type: String, required: true },
  patientPhone: { type: String },
  patientAge: { type: String },
  patientGender: { type: String, enum: ['male','female','other'] },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },

  // Doctor
  doctorName: { type: String, required: true },
  doctorPhone: { type: String },
  clinic: { type: String },
  diagnosis: { type: String },

  // Medicines prescribed
  medicines: [{
    name: { type: String },
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    dosage: { type: String },      // e.g. "1-0-1"
    duration: { type: String },    // e.g. "7 days"
    timing: { type: String },      // e.g. "After food"
    qty: { type: Number },
    dispensed: { type: Boolean, default: false },
    dispensedQty: { type: Number, default: 0 }
  }],

  // Status
  status: {
    type: String,
    enum: ['pending', 'partial', 'dispensed', 'cancelled'],
    default: 'pending'
  },

  // Billing
  billId: { type: mongoose.Schema.Types.ObjectId, ref: 'Sale' },
  billNo: { type: String },

  // Validity
  prescriptionDate: { type: Date, default: Date.now },
  validTill: { type: Date },
  refillCount: { type: Number, default: 0 },
  maxRefills: { type: Number, default: 0 },

  notes: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Prescription', prescriptionSchema);