const mongoose = require('mongoose');

const purchaseSchema = new mongoose.Schema({
  invoiceNo: { type: String },
  supplier: { type: String, required: true },
  date: { type: Date, default: Date.now },
  items: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    productName: String,
    batch: String,
    expiry: String,
    qty: Number,
    purchasePrice: Number,
    mrp: Number,
    gst: Number
  }],
  totalAmount: { type: Number, default: 0 },
  paidAmount: { type: Number, default: 0 },
  paymentMode: { type: String, default: 'credit' },
  paymentStatus: { 
    type: String, 
    enum: ['paid', 'partial', 'unpaid'], 
    default: 'unpaid' 
  },
  paymentHistory: [{
    amount: { type: Number },
    date: { type: Date, default: Date.now },
    note: { type: String, default: '' }
  }]
}, { timestamps: true });

module.exports = mongoose.model('Purchase', purchaseSchema);