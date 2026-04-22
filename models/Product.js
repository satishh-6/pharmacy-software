const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  category: { type: String, enum: ['medicine', 'fmcg', 'other'], default: 'medicine' },
  generic: { type: String },
  company: { type: String },
  batch: { type: String },
  expiry: { type: String },
  mrp: { type: Number, required: true },
  purchasePrice: { type: Number, required: true },
  salePrice: { type: Number, required: true },

  // Strip/Loose system
  sellType: { type: String, enum: ['strip', 'loose', 'piece'], default: 'strip' },
  unitsPerStrip: { type: Number, default: 10 },
  stripStock: { type: Number, default: 0 },
  looseStock: { type: Number, default: 0 },
  pricePerUnit: { type: Number, default: 0 },

  // FMCG / piece items
  stock: { type: Number, default: 0 },

  minStock: { type: Number, default: 10 },
  hsn: { type: String },
  gst: { type: Number, default: 12 },
  rack: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);