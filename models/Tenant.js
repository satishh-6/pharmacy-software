const mongoose = require('mongoose');

const tenantSchema = new mongoose.Schema({
  pharmacyName: { type: String, required: true },
  ownerName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  password: { type: String, required: true },
  tenantId: { type: String, unique: true },
  logo: { type: String, default: '' },

  // Subscription
  plan: { type: String, enum: ['trial','basic','pro','enterprise'], default: 'trial' },
  planPrice: { type: Number, default: 0 },
  trialEnds: {
    type: Date,
    default: () => new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
  },                                       
  subscriptionStart: { type: Date },
  subscriptionEnd: { type: Date },
  isActive: { type: Boolean, default: true },
  isSuspended: { type: Boolean, default: false },

  // Staff — max 5
  staff: [{
    name: { type: String, required: true },
    username: { type: String, required: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['owner','manager','staff'], default: 'staff' },
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
  }],

  // Business Settings — editable by tenant
  settings: {
    pharmacyName: String,
    address1: String,
    address2: String,
    phone: String,
    email: String,
    gstNo: String,
    licenseNo: String,
    signatory: String,
    billType: { type: String, default: 'Retail Invoice' },
    footer: String,
    logo: String
  },

  // Locked fields — only super admin change kar sakta hai
  lockedFields: {
    pharmacyName: { type: Boolean, default: false },
    ownerName: { type: Boolean, default: false }
  },

  // Stats
  totalBills: { type: Number, default: 0 },
  totalRevenue: { type: Number, default: 0 },
  lastLogin: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

tenantSchema.pre('save', function(next) {
  if (!this.tenantId) {
    const slug = this.pharmacyName.toLowerCase().replace(/[^a-z0-9]/g,'-').replace(/-+/g,'-').slice(0,20);
    this.tenantId = slug + '-' + Date.now().toString().slice(-6);
  }
  if (!this.trialEnds) {
    const trial = new Date();
    trial.setDate(trial.getDate() + 3);
  this.trialEnds = trial;
  }
  next();
});

module.exports = mongoose.model('Tenant', tenantSchema);