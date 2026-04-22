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

// Routes BAAD mein
app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/purchases', require('./routes/purchases'));
app.use('/api/sales', require('./routes/sales'));

mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 45000,
})
.then(() => console.log('✅ MongoDB Connected!'))
.catch(err => console.log('❌ Error:', err));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));