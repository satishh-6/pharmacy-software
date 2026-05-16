const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  tenantId:      { type: String, required: true, index: true },
  name:          { type: String, required: true },
  generic:       { type: String, default: '' },
  company:       { type: String, default: '' },
  category:      { type: String, default: 'medicine' },
  sellType:      { type: String, enum: ['piece','strip','loose'], default: 'piece' },
  mrp:           { type: Number, default: 0 },
  salePrice:     { type: Number, default: 0 },
  purchasePrice: { type: Number, default: 0 },
  stock:         { type: Number, default: 0 },
  stripStock:    { type: Number, default: 0 },
  looseStock:    { type: Number, default: 0 },
  unitsPerStrip: { type: Number, default: 10 },
  pricePerUnit:  { type: Number, default: 0 },
  minStock:      { type: Number, default: 10 },
  batch:         { type: String, default: '' },
  expiry:        { type: String, default: '' },
  gst:           { type: Number, default: 0 },
  hsnCode:       { type: String, default: '' },
  composition: [{ type: String }],
  isActive:      { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);
