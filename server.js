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

// ── MIDDLEWARE ──
const tenantAuth = require('./middleware/tenantAuth');

// ── SaaS PAGES ──
app.get('/signup', (req, res) => res.sendFile(path.join(__dirname, 'public', 'signup.html')));
app.get('/superadmin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'superadmin', 'index.html')));

// ── BRAND API ──
app.get('/api/brand', (req, res) => {
  res.json({
    saasName:     process.env.SAAS_NAME         || 'Dawa Hisaab',
    tagline:      process.env.SAAS_TAGLINE       || 'Smart Pharmacy Management',
    domain:       process.env.SAAS_DOMAIN        || 'dawahisaab.com',
    supportEmail: process.env.SUPER_ADMIN_EMAIL   || 'support@dawahisaab.com'
  });
});

app.get('/onboarding', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'onboarding.html'));
});

// ── LOGO API (MedXpert default — file se) ──
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
    res.json({ logo: '' });
  }
});

// ── PLATFORM LOGO (Dawa Hisaab brand) ──
app.get('/api/platform-logo', (req, res) => {
  try {
    const p = path.join(__dirname, 'assets', 'dh-logo.png');
    if (fs.existsSync(p)) {
      const b64 = 'data:image/png;base64,' + fs.readFileSync(p).toString('base64');
      return res.json({ logo: b64 });
    }
    res.json({ logo: '' });
  } catch(e) { res.json({ logo: '' }); }
});

// ── SETTINGS API (MedXpert default — file se) ──
app.get('/api/settings', (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] || 'default';
    const settingsPath = path.join(__dirname, 'assets', `settings_${tenantId}.json`);
    const defaultPath = path.join(__dirname, 'assets', 'settings.json');
    const filePath = fs.existsSync(settingsPath) ? settingsPath : defaultPath;
    const settings = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    res.json(settings);
  } catch(e) {
    res.json({ pharmacyName: 'My Pharmacy', address: '', phone: '', gstNo: '' });
  }
});

app.put('/api/settings', (req, res) => {
  try {
    const tenantId = req.headers['x-tenant-id'] || 'default';
    const settingsPath = path.join(__dirname, 'assets', `settings_${tenantId}.json`);
    if (!fs.existsSync(path.join(__dirname, 'assets'))) {
      fs.mkdirSync(path.join(__dirname, 'assets'), { recursive: true });
    }
    fs.writeFileSync(settingsPath, JSON.stringify(req.body, null, 2));
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

app.post('/api/settings', (req, res) => {
  try {
    const settingsPath = path.join(__dirname, 'assets', 'settings.json');
    if (!fs.existsSync(path.join(__dirname, 'assets'))) {
      fs.mkdirSync(path.join(__dirname, 'assets'), { recursive: true });
    }
    fs.writeFileSync(settingsPath, JSON.stringify(req.body, null, 2));
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ success: false });
  }
});

// ── GST VERIFY ──
app.use('/api/gst', require('./routes/gst'));

// ── AUTH ROUTES (no tenantAuth) ──
app.use('/api/auth',        require('./routes/auth'));
app.use('/api/tenant-auth', require('./routes/tenant-auth').router);
app.use('/api/superadmin',  require('./routes/superadmin').router);
app.use('/api/branches',    require('./routes/branches'));

// ── PROTECTED ROUTES (tenantAuth middleware) ──
// NOTE: Sab routes yahan register hain — server.js mein alag se koi route nahi
app.use('/api/products',      tenantAuth, require('./routes/products'));
app.use('/api/sales',         tenantAuth, require('./routes/sales'));
app.use('/api/purchases',     tenantAuth, require('./routes/purchases'));
app.use('/api/customers',     tenantAuth, require('./routes/customers'));
app.use('/api/prescriptions', tenantAuth, require('./routes/prescriptions'));

// ── 404 JSON (HTML 404 se bachao — browser ko confuse karta tha) ──
app.use('/api/*', (req, res) => {
  res.status(404).json({ success: false, message: 'API route not found: ' + req.originalUrl });
});

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