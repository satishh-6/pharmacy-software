const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// ⚠️ PATCH route PEHLE register karo
const Purchase = require('./models/Purchase');
app.patch('/api/purchases/:id/payment', async (req, res) => {
  try {
    const { amount, note } = req.body;
    const purchase = await Purchase.findById(req.params.id);
    if (!purchase) return res.status(404).json({ message: 'Purchase not found' });

    const newPaid = (purchase.paidAmount || 0) + parseFloat(amount);
    const total = purchase.totalAmount || 0;
    purchase.paymentStatus = newPaid >= total ? 'paid' : newPaid > 0 ? 'partial' : 'unpaid';
    purchase.paidAmount = newPaid;
    if (!purchase.paymentHistory) purchase.paymentHistory = [];
    purchase.paymentHistory.push({
      amount: parseFloat(amount),
      date: new Date(),
      note: note || ''
    });
    purchase.markModified('paymentHistory');
    await purchase.save();
    console.log('✅ Payment saved:', req.params.id, amount);
    res.json({ success: true, purchase });
  } catch(err) {
    console.log('❌ Payment error:', err.message);
    res.status(400).json({ success: false, message: err.message });
  }
});

// Customer payment route
const Sale = require('./models/Sale');
app.patch('/api/sales/:id/payment', async (req, res) => {
  try {
    const { amount, paymentMode, note } = req.body;
    const sale = await Sale.findById(req.params.id);
    if (!sale) return res.status(404).json({ message: 'Sale not found' });

    const newPaid = (sale.paidAmount || 0) + parseFloat(amount);
    sale.paidAmount = newPaid;
    sale.paymentMode = paymentMode || sale.paymentMode;
    sale.paymentStatus = newPaid >= sale.totalAmount ? 'paid' : 'partial';
    if (!sale.paymentHistory) sale.paymentHistory = [];
    sale.paymentHistory.push({
      amount: parseFloat(amount),
      date: new Date(),
      note: note || '',
      mode: paymentMode || 'cash'
    });
    sale.markModified('paymentHistory');
    await sale.save();
    console.log('✅ Customer payment saved:', req.params.id);
    res.json({ success: true, sale });
  } catch(err) {
    console.log('❌ Error:', err.message);
    res.status(400).json({ success: false, message: err.message });
  }
});

// Sales edit and delete
const SaleModel = require('./models/Sale');
const ProductModel = require('./models/Product');

app.put('/api/sales/:id', async (req, res) => {
  try {
    const oldSale = await SaleModel.findById(req.params.id);
    if (!oldSale) return res.status(404).json({ message: 'Not found' });

    // Reverse old stock
    for (const item of oldSale.items) {
      const p = await ProductModel.findById(item.product);
      if (!p) continue;
      if (p.sellType === 'loose') await ProductModel.findByIdAndUpdate(item.product, { $inc: { looseStock: item.qty } });
      else await ProductModel.findByIdAndUpdate(item.product, { $inc: { stock: item.qty } });
    }

    // Apply new stock
    for (const item of req.body.items) {
      const p = await ProductModel.findById(item.product);
      if (!p) continue;
      if (p.sellType === 'loose') {
        let qtr = item.qty, nl = p.looseStock||0, ns = p.stripStock||0, ups = p.unitsPerStrip||10;
        if (nl >= qtr) { nl -= qtr; }
        else { qtr -= nl; nl = 0; const sn = Math.ceil(qtr/ups); ns = Math.max(0,ns-sn); nl = (sn*ups)-qtr; }
        await ProductModel.findByIdAndUpdate(item.product, { stripStock: ns, looseStock: nl });
      } else {
        await ProductModel.findByIdAndUpdate(item.product, { $inc: { stock: -item.qty } });
      }
    }

    const updated = await SaleModel.findByIdAndUpdate(req.params.id, { ...req.body, billNo: oldSale.billNo }, { new: true });
    res.json({ success: true, sale: updated });
  } catch(e) { res.status(400).json({ success: false, message: e.message }); }
});

app.delete('/api/sales/:id', async (req, res) => {
  try {
    const sale = await SaleModel.findById(req.params.id);
    if (!sale) return res.status(404).json({ message: 'Not found' });
    for (const item of sale.items) {
      const p = await ProductModel.findById(item.product);
      if (!p) continue;
      if (p.sellType === 'loose') await ProductModel.findByIdAndUpdate(item.product, { $inc: { looseStock: item.qty } });
      else await ProductModel.findByIdAndUpdate(item.product, { $inc: { stock: item.qty } });
    }
    await SaleModel.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ success: false, message: e.message }); }
});

// Routes BAAD mein
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/purchases', require('./routes/purchases'));
app.use('/api/sales', require('./routes/sales'));
app.use('/api/customers', require('./routes/customers'));

mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 45000,
})
.then(() => console.log('✅ MongoDB Connected!'))
.catch(err => console.log('❌ Error:', err));



const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Server running on port ${PORT}`));