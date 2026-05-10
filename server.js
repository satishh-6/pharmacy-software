const path = require('path');
const fs = require('fs');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();
process.env.TZ = 'Asia/Kolkata';

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/superadmin', express.static(path.join(__dirname, 'public', 'superadmin')));
app.use('/api/gst', require('./routes/gst'));

// ── MODELS (direct use ke liye) ──
const Sale = require('./models/Sale');
const Purchase = require('./models/Purchase');
const ProductModel = require('./models/Product');

// ── MIDDLEWARE ──
const tenantAuth = require('./middleware/tenantAuth');

// ── SaaS PAGES ──
app.get('/signup', (req, res) => res.sendFile(path.join(__dirname, 'public', 'signup.html')));
app.get('/superadmin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'superadmin', 'index.html')));

// ── BRAND API ──
app.get('/api/brand', (req, res) => {
  res.json({
    saasName: process.env.SAAS_NAME || 'Dawa Hisaab',
    tagline: process.env.SAAS_TAGLINE || 'Smart Pharmacy Management',
    domain: process.env.SAAS_DOMAIN || 'dawahisaab.com',
    supportEmail: process.env.SUPER_ADMIN_EMAIL || 'support@dawahisaab.com'
  });
});

app.get('/onboarding', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'onboarding.html'));
});

// ── LOGO API ──
app.get('/api/logo', (req, res) => {
  try {
    const b64Path = path.join(__dirname, 'assets', 'logo_b64.txt');
    if (fs.existsSync(b64Path)) {
      const b64 = fs.readFileSync(b64Path, 'utf8').trim();
      return res.json({ logo: b64.startsWith('data:') ? b64 : 'data:image/jpeg;base64,' + b64 });
    }
    const jpgPath = path.join(__dirname, 'assets', 'logo.jpg');
    if (fs.existsSync(jpgPath)) {
      const b64 = 'data:image/jpeg;base64,' + fs.readFileSync(jpgPath).toString('base64');
      fs.writeFileSync(b64Path, b64);
      return res.json({ logo: b64 });
    }
    res.json({ logo: '' });
  } catch(e) {
    console.log('Logo error:', e.message);
    res.json({ logo: '' });
  }
});

// ── SETTINGS API ──
app.get('/api/settings', (req, res) => {
  try {
    const settings = JSON.parse(fs.readFileSync(path.join(__dirname, 'assets', 'settings.json'), 'utf8'));
    res.json(settings);
  } catch(e) {
    res.json({ pharmacyName: 'MedXpert Pharmacy', address: '', phone: '', gstNo: '', licenseNo: '', billType: 'Retail Invoice' });
  }
});

app.post('/api/settings', (req, res) => {
  try {
    fs.writeFileSync(path.join(__dirname, 'assets', 'settings.json'), JSON.stringify(req.body, null, 2));
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ success: false });
  }
});

// ── PURCHASE PAYMENT (PATCH — pehle register karo) ──
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
    purchase.paymentHistory.push({ amount: parseFloat(amount), date: new Date(), note: note || '' });
    purchase.markModified('paymentHistory');
    await purchase.save();
    res.json({ success: true, purchase });
  } catch(err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ── SALE PAYMENT (PATCH) ──
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
    sale.paymentHistory.push({ amount: parseFloat(amount), date: new Date(), note: note || '', mode: paymentMode || 'cash' });
    sale.markModified('paymentHistory');
    await sale.save();
    res.json({ success: true, sale });
  } catch(err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ── SALE EDIT (PUT) ──
app.put('/api/sales/:id', async (req, res) => {
  try {
    const oldSale = await Sale.findById(req.params.id);
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
        else { qtr -= nl; nl = 0; const sn = Math.ceil(qtr/ups); ns = Math.max(0, ns-sn); nl = (sn*ups) - qtr; }
        await ProductModel.findByIdAndUpdate(item.product, { stripStock: ns, looseStock: nl });
      } else {
        await ProductModel.findByIdAndUpdate(item.product, { $inc: { stock: -item.qty } });
      }
    }

    const updated = await Sale.findByIdAndUpdate(req.params.id, { ...req.body, billNo: oldSale.billNo }, { new: true });
    res.json({ success: true, sale: updated });
  } catch(e) {
    res.status(400).json({ success: false, message: e.message });
  }
});

// ── SALE DELETE ──
app.delete('/api/sales/:id', async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id);
    if (!sale) return res.status(404).json({ message: 'Not found' });
    for (const item of sale.items) {
      const p = await ProductModel.findById(item.product);
      if (!p) continue;
      if (p.sellType === 'loose') await ProductModel.findByIdAndUpdate(item.product, { $inc: { looseStock: item.qty } });
      else await ProductModel.findByIdAndUpdate(item.product, { $inc: { stock: item.qty } });
    }
    await Sale.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// ── AUTH ROUTES (no tenantAuth) ──
app.use('/api/auth', require('./routes/auth'));
app.use('/api/tenant-auth', require('./routes/tenant-auth').router);
app.use('/api/superadmin', require('./routes/superadmin').router);
app.use('/api/branches', require('./routes/branches'));

// ── PROTECTED ROUTES (tenantAuth middleware) ──
app.use('/api/products', tenantAuth, require('./routes/products'));
app.use('/api/sales', tenantAuth, require('./routes/sales'));
app.use('/api/purchases', tenantAuth, require('./routes/purchases'));
app.use('/api/customers', tenantAuth, require('./routes/customers'));
app.use('/api/prescriptions', tenantAuth, require('./routes/prescriptions'));

// ── MONGODB ──
mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 10000,
  socketTimeoutMS: 45000,
})
.then(() => console.log('✅ MongoDB Connected!'))
.catch(err => console.log('❌ MongoDB Error:', err.message));

// ── START SERVER ──
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Server running on port ${PORT}`));