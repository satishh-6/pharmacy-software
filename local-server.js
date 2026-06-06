const express = require('express');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('./local-db');
const { addToQueue, getStatus } = require('./sync-manager');

const app = express();
const JWT_SECRET = 'pharmacy_secret_key_2024';

app.use(express.json({ limit: '10mb' }));
const PUBLIC_DIR = path.join(process.cwd(), 'public');
app.use(express.static(PUBLIC_DIR));
app.use('/superadmin', express.static(path.join(PUBLIC_DIR, 'superadmin')));
// ── HELPER ──
function getToken(req) {
  return req.headers.authorization?.split(' ')[1];
}
function verifyToken(req) {
  return jwt.verify(getToken(req), JWT_SECRET);
}

// ── STATUS ──
app.get('/api/status', (req, res) => {
  res.json({
    online: getStatus(),
    mode: getStatus() ? '🟢 Online — Cloud sync active' : '🔴 Offline — Local mode'
  });
});

// ── REGISTER ──
app.post('/api/tenant-auth/register', async (req, res) => {
  try {
    const { pharmacyName, ownerName, email, phone, password } = req.body;
    const exists = await db.tenants.findOne({ email });
    if (exists) return res.status(400).json({ message: 'Email already registered' });

    const hashedPwd = await bcrypt.hash(password, 10);
    const slug = pharmacyName.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 20);
    const tenantId = slug + '-' + Date.now().toString().slice(-6);
    const trialEnds = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

    const tenant = await db.tenants.insert({
      pharmacyName, ownerName, email, phone,
      password: hashedPwd, tenantId,
      plan: 'trial', trialEnds,
      isActive: true, createdAt: new Date()
    });

    const token = jwt.sign({ tenantId, email }, JWT_SECRET, { expiresIn: '30d' });
    res.json({
      success: true, token,
      user: { name: ownerName, email, tenantId, plan: 'trial', pharmacyName }
    });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// ── LOGIN ──
app.post('/api/tenant-auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const tenant = await db.tenants.findOne({ email });
    if (!tenant) return res.status(401).json({ message: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, tenant.password);
    if (!valid) return res.status(401).json({ message: 'Invalid credentials' });

    const now = new Date();
    const daysLeft = Math.max(0, Math.ceil((new Date(tenant.trialEnds) - now) / (1000*60*60*24)));
    const isTrialExpired = tenant.plan === 'trial' && new Date(tenant.trialEnds) < now;

    const token = jwt.sign({ tenantId: tenant.tenantId, email }, JWT_SECRET, { expiresIn: '30d' });
    res.json({
      success: true, token,
      user: {
        name: tenant.ownerName, email, role: 'owner',
        tenantId: tenant.tenantId, plan: tenant.plan,
        pharmacyName: tenant.pharmacyName,
        trialDaysLeft: daysLeft, isTrialExpired
      }
    });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// ── PROFILE ──
app.get('/api/tenant-auth/profile', async (req, res) => {
  try {
    const { tenantId } = verifyToken(req);
    const tenant = await db.tenants.findOne({ tenantId });
    res.json(tenant);
  } catch(e) { res.status(401).json({ message: 'Unauthorized' }); }
});

// ── TRIAL STATUS ──
app.get('/api/tenant-auth/trial-status', async (req, res) => {
  try {
    const { tenantId } = verifyToken(req);
    const tenant = await db.tenants.findOne({ tenantId });
    const daysLeft = Math.max(0, Math.ceil((new Date(tenant.trialEnds) - new Date()) / (1000*60*60*24)));
    res.json({ plan: tenant.plan, daysLeft, isActive: tenant.isActive });
  } catch(e) { res.status(401).json({ message: 'Unauthorized' }); }
});

// ── SETTINGS ──
app.put('/api/tenant-auth/settings', async (req, res) => {
  try {
    const { tenantId } = verifyToken(req);
    await db.tenants.update({ tenantId }, { $set: { settings: req.body } });
    res.json({ success: true });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// ── LOGO ──
app.get('/api/tenant-auth/logo', async (req, res) => {
  try {
    const { tenantId } = verifyToken(req);
    const tenant = await db.tenants.findOne({ tenantId });
    res.json({ logo: tenant?.settings?.logo || tenant?.logo || '' });
  } catch(e) { res.json({ logo: '' }); }
});

// ── PRODUCTS ──
app.get('/api/products', async (req, res) => {
  try {
    const { tenantId } = verifyToken(req);
    const products = await db.products.find({ tenantId, isDeleted: { $ne: true } });
    res.json(products);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.post('/api/products', async (req, res) => {
  try {
    const { tenantId } = verifyToken(req);
    const localId = 'prod_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
    const product = await db.products.insert({
      ...req.body, tenantId, localId, createdAt: new Date()
    });
    await addToQueue({ collection: 'products', action: 'insert', localId, tenantId, data: req.body });
    res.json(product);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.put('/api/products/:id', async (req, res) => {
  try {
    const { tenantId } = verifyToken(req);
    await db.products.update({ _id: req.params.id, tenantId }, { $set: req.body });
    const updated = await db.products.findOne({ _id: req.params.id });
    await addToQueue({ collection: 'products', action: 'update', localId: updated.localId, tenantId, data: req.body });
    res.json({ success: true });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.delete('/api/products/:id', async (req, res) => {
  try {
    const { tenantId } = verifyToken(req);
    const product = await db.products.findOne({ _id: req.params.id });
    await db.products.update({ _id: req.params.id }, { $set: { isDeleted: true } });
    await addToQueue({ collection: 'products', action: 'delete', localId: product.localId, tenantId, data: {} });
    res.json({ success: true });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// ── SALES ──
app.get('/api/sales', async (req, res) => {
  try {
    const { tenantId } = verifyToken(req);
    const sales = await db.sales.find({ tenantId }).sort({ createdAt: -1 });
    res.json(sales);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.post('/api/sales', async (req, res) => {
  try {
    const { tenantId } = verifyToken(req);
    const localId = 'sale_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
    const count = await db.sales.count({ tenantId });
    const billNo = 'BILL-' + String(count + 1).padStart(4, '0');
    const sale = await db.sales.insert({
      ...req.body, tenantId, localId, billNo, createdAt: new Date()
    });
    await addToQueue({ collection: 'sales', action: 'insert', localId, tenantId, data: { ...req.body, billNo } });
    res.json({ success: true, sale });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.put('/api/sales/:id', async (req, res) => {
  try {
    const { tenantId } = verifyToken(req);
    await db.sales.update({ _id: req.params.id, tenantId }, { $set: req.body });
    const updated = await db.sales.findOne({ _id: req.params.id });
    await addToQueue({ collection: 'sales', action: 'update', localId: updated.localId, tenantId, data: req.body });
    res.json({ success: true, sale: updated });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.delete('/api/sales/:id', async (req, res) => {
  try {
    const { tenantId } = verifyToken(req);
    const sale = await db.sales.findOne({ _id: req.params.id });
    await db.sales.remove({ _id: req.params.id });
    await addToQueue({ collection: 'sales', action: 'delete', localId: sale.localId, tenantId, data: {} });
    res.json({ success: true });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// ── PURCHASES ──
app.get('/api/purchases', async (req, res) => {
  try {
    const { tenantId } = verifyToken(req);
    const purchases = await db.purchases.find({ tenantId }).sort({ createdAt: -1 });
    res.json(purchases);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.post('/api/purchases', async (req, res) => {
  try {
    const { tenantId } = verifyToken(req);
    const localId = 'pur_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
    const purchase = await db.purchases.insert({
      ...req.body, tenantId, localId, createdAt: new Date()
    });
    await addToQueue({ collection: 'purchases', action: 'insert', localId, tenantId, data: req.body });
    res.json({ success: true, purchase });
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// ── CUSTOMERS ──
app.get('/api/customers', async (req, res) => {
  try {
    const { tenantId } = verifyToken(req);
    const customers = await db.customers.find({ tenantId });
    res.json(customers);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.get('/api/customers/search', async (req, res) => {
  try {
    const { tenantId } = verifyToken(req);
    const q = req.query.q || '';
    const customers = await db.customers.find({
      tenantId,
      $or: [
        { name: new RegExp(q, 'i') },
        { phone: new RegExp(q, 'i') }
      ]
    });
    res.json(customers);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

app.post('/api/customers', async (req, res) => {
  try {
    const { tenantId } = verifyToken(req);
    const localId = 'cust_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
    const customer = await db.customers.insert({
      ...req.body, tenantId, localId, createdAt: new Date()
    });
    await addToQueue({ collection: 'customers', action: 'insert', localId, tenantId, data: req.body });
    res.json(customer);
  } catch(e) { res.status(500).json({ message: e.message }); }
});

// ── GST VERIFY (offline — client side decode) ──
app.get('/api/gst/verify/:gstNo', (req, res) => {
  const gst = req.params.gstNo.toUpperCase();
  const STATES = {
    '01':'J&K','02':'HP','03':'Punjab','04':'Chandigarh','05':'Uttarakhand',
    '06':'Haryana','07':'Delhi','08':'Rajasthan','09':'UP','10':'Bihar',
    '18':'Assam','19':'WB','20':'Jharkhand','21':'Odisha','22':'CG',
    '23':'MP','24':'Gujarat','27':'Maharashtra','29':'Karnataka',
    '30':'Goa','32':'Kerala','33':'TN','36':'Telangana'
  };
  const regex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  if (!regex.test(gst)) return res.json({ valid: false });
  res.json({
    valid: true,
    state: STATES[gst.substring(0,2)] || 'State: '+gst.substring(0,2),
    pan: gst.substring(2,12),
    entityType: 'Business'
  });
});

module.exports = app;