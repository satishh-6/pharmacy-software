const mongoose = require('mongoose');

const saleSchema = new mongoose.Schema({
  billNo: { type: String },
  customer: { type: String, default: 'Walk-in Customer' },
  customerPhone: { type: String },
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer' },
  items: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    productName: String,
    batch: String,
    qty: Number,
    mrp: Number,
    salePrice: Number,
    discount: Number,
    gst: Number,
    sellUnit: String,
    total: Number
  }],
  subtotal: Number,
  discount: Number,
  gstAmount: Number,
  totalAmount: Number,
  paidAmount: Number,
  paymentMode: { type: String, default: 'cash' },
  paymentStatus: { type: String, enum: ['paid','partial','unpaid'], default: 'paid' },
  paymentHistory: [{
    amount: Number,
    date: { type: Date, default: Date.now },
    note: String,
    mode: String
  }],
  date: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Sale', saleSchema);