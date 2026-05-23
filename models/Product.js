const mongoose = require('mongoose');

const BatchSchema = new mongoose.Schema({
  batchNo:       { type: String, default: '' },
  supplier:      { type: String, default: '' },
  mrp:           { type: Number, default: 0 },
  purchasePrice: { type: Number, default: 0 },
  salePrice:     { type: Number, default: 0 },
  qty:           { type: Number, default: 0 },
  expiry:        { type: String, default: '' },
  gst:           { type: Number, default: 0 },
  hsnCode:       { type: String, default: '' },
  discount:      { type: Number, default: 0 },
  addedDate:     { type: Date, default: Date.now }
}, { _id: false });

const ProductSchema = new mongoose.Schema({
  tenantId:      { type: String, required: true, index: true },
  name:          { type: String, required: true },
  generic:       { type: String, default: '' },
  composition:   [{ type: String }],
  company:       { type: String, default: '' },
  category:      { type: String, default: 'medicine', enum: ['medicine','fmcg','cosmetic','surgical','other'] },
  
  // Current / Latest values (for billing default)
  mrp:           { type: Number, default: 0 },
  salePrice:     { type: Number, default: 0 },
  purchasePrice: { type: Number, default: 0 },
  
  // Batch-wise stock tracking
  batches:       [BatchSchema],
  
  // Total stock (sum of all batch quantities)
  stock:         { type: Number, default: 0 },
  
  // Legacy fields (kept for backward compatibility)
  batch:         { type: String, default: '' },
  expiry:        { type: String, default: '' },
  
  // Selling type
  sellType:      { type: String, default: 'piece', enum: ['piece','strip','loose','both','bottle','box','unit'] },
  unitsPerStrip: { type: Number, default: 10 },
  pricePerUnit:  { type: Number, default: 0 },
  stripStock:    { type: Number, default: 0 },
  looseStock:    { type: Number, default: 0 },
  
  // GST & HSN
  gst:           { type: Number, default: 0 },
  hsnCode:       { type: String, default: '' },
  
  // Stock alerts
  minStock:      { type: Number, default: 10 },
  
  // Location
  rack:          { type: String, default: '' },

}, { timestamps: true });

module.exports = mongoose.models.Product || mongoose.model('Product', ProductSchema);