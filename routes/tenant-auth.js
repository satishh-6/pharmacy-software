const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Tenant = require('../models/Tenant');

// ── REGISTER ──
router.post('/register', async (req, res) => {
  try {
    const { pharmacyName, ownerName, email, phone, password, gstNo, city } = req.body;
    if (!pharmacyName||!ownerName||!email||!phone||!password)
      return res.status(400).json({ success:false, message:'Sab fields required hain!' });

    const existing = await Tenant.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(400).json({ success:false, message:'Email already registered!' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const tenant = new Tenant({
      pharmacyName, ownerName,
      email: email.toLowerCase(), phone, password: hashedPassword,
      plan: 'trial',
      settings: {
        pharmacyName,
        phone, email,
        gstNo: gstNo || '',
        address2: city || '',
        billType: 'Retail Invoice',
        footer: 'Thank you! Get well soon.'
      }
    });

    // Owner ko staff mein add karo
    const ownerPass = await bcrypt.hash(password, 10);
    tenant.staff.push({
      name: ownerName,
      username: email.toLowerCase(),
      password: ownerPass,
      role: 'owner',
      isActive: true
    });

    await tenant.save();
    const token = jwt.sign(
      { tenantId: tenant.tenantId, email: tenant.email, type: 'tenant', role: 'owner' },
      process.env.JWT_SECRET, { expiresIn: '30d' }
    );
    res.json({ success:true, token, tenant: {
      tenantId: tenant.tenantId, pharmacyName: tenant.pharmacyName,
      ownerName: tenant.ownerName, email: tenant.email,
      plan: tenant.plan, trialEnds: tenant.trialEnds
    }});
  } catch(err) { res.status(500).json({ success:false, message:err.message }); }
});

// ── LOGIN (tenant ya staff) ──
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const loginId = (email || '').trim().toLowerCase();

    // ✅ Email OR Phone OR TenantId se dhundho
    let tenant = await Tenant.findOne({
      $or: [
        { email: loginId },
        { phone: loginId },
        { tenantId: loginId }
      ]
    });
    let role = 'owner', staffMember = null;

    if (!tenant) {
      // Staff login — email se dhundho
      tenant = await Tenant.findOne({ 'staff.username': loginId });
      if (!tenant) return res.status(401).json({ success:false, message:'Email not found!' });
      staffMember = tenant.staff.find(s => s.username === email.toLowerCase());
      if (!staffMember || !staffMember.isActive)
        return res.status(403).json({ success:false, message:'Account inactive!' });
      role = staffMember.role;
      const validPass = await bcrypt.compare(password, staffMember.password);
      if (!validPass) return res.status(401).json({ success:false, message:'Wrong password!' });
    } else {
      const validPass = await bcrypt.compare(password, tenant.password);
      if (!validPass) return res.status(401).json({ success:false, message:'Wrong password!' });
    }

    if (!tenant.isActive)
      return res.status(403).json({ success:false, message:'Account suspended!' });

    // Trial check
    const now = new Date();
    if (tenant.plan === 'trial' && tenant.trialEnds < now)
      return res.status(403).json({ success:false, message:'Trial expired!', trialExpired:true });

    await Tenant.findByIdAndUpdate(tenant._id, { lastLogin: now });

    const token = jwt.sign(
      { tenantId: tenant.tenantId, email: tenant.email, type:'tenant', role },
      process.env.JWT_SECRET, { expiresIn:'30d' }
    );

    res.json({ success:true, token, tenant: {
      tenantId: tenant.tenantId,
      pharmacyName: tenant.pharmacyName,
      ownerName: staffMember ? staffMember.name : tenant.ownerName,
      email: tenant.email, plan: tenant.plan,
      trialEnds: tenant.trialEnds,
      subscriptionEnd: tenant.subscriptionEnd,
      settings: tenant.settings,
      role, logo: tenant.logo || tenant.settings?.logo || ''
    }});
  } catch(err) { res.status(500).json({ success:false, message:err.message }); }
});

// ── MIDDLEWARE ──
function verifyTenant(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message:'No token!' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.type === 'tenant') {
      req.tenantId = decoded.tenantId;
      req.tenantRole = decoded.role || 'staff';
    } else {
      req.tenantId = 'medxpert-pharmacy-872200';
      req.tenantRole = decoded.role || 'owner';
    }
    next();
  } catch(err) { res.status(401).json({ message:'Invalid token!' }); }
}
// ── GET PROFILE ──
router.get('/profile', verifyTenant, async (req, res) => {
  try {
    const tenant = await Tenant.findOne({ tenantId: req.tenantId }).select('-password -staff.password');
    res.json(tenant);
  } catch(err) { res.status(500).json({ message:err.message }); }
});

// ── UPDATE SETTINGS (tenant editable) ──
router.put('/settings', verifyTenant, async (req, res) => {
  try {
    const { logo, ...settings } = req.body;
    const update = { settings };
    if (logo !== undefined) update.logo = logo;
    await Tenant.findOneAndUpdate({ tenantId: req.tenantId }, update, { new:true });
    res.json({ success:true });
  } catch(err) { res.status(500).json({ success:false, message:err.message }); }
});

// ── GET LOGO ──
router.get('/logo', verifyTenant, async (req, res) => {
  try {
    const tenant = await Tenant.findOne({ tenantId: req.tenantId }).select('logo settings pharmacyName');
    const logo = tenant?.logo || tenant?.settings?.logo || '';
    res.json({ logo, pharmacyName: tenant?.settings?.pharmacyName || tenant?.pharmacyName || '' });
  } catch(err) { res.json({ logo:'', pharmacyName:'' }); }
});

// ── STAFF MANAGEMENT ──

// Get all staff
router.get('/staff', verifyTenant, async (req, res) => {
  try {
    const tenant = await Tenant.findOne({ tenantId: req.tenantId }).select('staff');
    const staff = (tenant?.staff || []).map(s => ({
      _id: s._id, name: s.name, username: s.username,
      role: s.role, isActive: s.isActive, createdAt: s.createdAt
    }));
    res.json(staff);
  } catch(err) { res.status(500).json({ message:err.message }); }
});

// Add staff
router.post('/staff', verifyTenant, async (req, res) => {
  try {
    if (req.tenantRole !== 'owner' && req.tenantRole !== 'manager')
      return res.status(403).json({ message:'Only owner/manager can add staff!' });

    const tenant = await Tenant.findOne({ tenantId: req.tenantId });
    if ((tenant?.staff?.length || 0) >= 5)
      return res.status(400).json({ success:false, message:'Max 5 staff allowed in this plan!' });

    const { name, username, password, role } = req.body;
    if (!name||!username||!password) return res.status(400).json({ message:'Name, username, password required!' });

    // Check duplicate username
    const exists = tenant.staff.find(s => s.username === username.toLowerCase());
    if (exists) return res.status(400).json({ message:'Username already exists!' });

    const hashedPass = await bcrypt.hash(password, 10);
    tenant.staff.push({ name, username: username.toLowerCase(), password: hashedPass, role: role||'staff' });
    await tenant.save();
    res.json({ success:true, message:'Staff added!' });
  } catch(err) { res.status(500).json({ success:false, message:err.message }); }
});

// Update staff
router.put('/staff/:staffId', verifyTenant, async (req, res) => {
  try {
    if (req.tenantRole !== 'owner')
      return res.status(403).json({ message:'Only owner can update staff!' });

    const tenant = await Tenant.findOne({ tenantId: req.tenantId });
    const member = tenant.staff.id(req.params.staffId);
    if (!member) return res.status(404).json({ message:'Staff not found!' });

    const { name, role, isActive, password } = req.body;
    if (name) member.name = name;
    if (role) member.role = role;
    if (isActive !== undefined) member.isActive = isActive;
    if (password) member.password = await bcrypt.hash(password, 10);

    await tenant.save();
    res.json({ success:true, message:'Staff updated!' });
  } catch(err) { res.status(500).json({ success:false, message:err.message }); }
});

// Delete staff
router.delete('/staff/:staffId', verifyTenant, async (req, res) => {
  try {
    if (req.tenantRole !== 'owner')
      return res.status(403).json({ message:'Only owner can delete staff!' });

    const tenant = await Tenant.findOne({ tenantId: req.tenantId });
    const member = tenant.staff.id(req.params.staffId);
    if (!member) return res.status(404).json({ message:'Not found!' });
    if (member.role === 'owner') return res.status(400).json({ message:'Owner cannot be deleted!' });

    member.deleteOne();
    await tenant.save();
    res.json({ success:true });
  } catch(err) { res.status(500).json({ success:false, message:err.message }); }
});

// ── RESET PASSWORD (Forgot Password) ──
router.post('/reset-password', async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    if (!email || !newPassword)
      return res.status(400).json({ success:false, message:'Email aur new password required!' });
    if (newPassword.length < 8)
      return res.status(400).json({ success:false, message:'Password kam se kam 8 characters!' });

    const tenant = await Tenant.findOne({ email: email.toLowerCase() });
    if (!tenant)
      return res.status(404).json({ success:false, message:'Email registered nahi hai!' });

    const hashed = await bcrypt.hash(newPassword, 10);
    tenant.password = hashed;

    // Staff owner ka bhi update karo
    const ownerStaff = tenant.staff.find(s => s.role === 'owner' && s.username === email.toLowerCase());
    if (ownerStaff) ownerStaff.password = hashed;

    await tenant.save();
    res.json({ success:true, message:'Password reset ho gaya!' });
  } catch(err) { res.status(500).json({ success:false, message:err.message }); }
});

// ── CHECK EMAIL (Forgot password step 1) ──
router.post('/check-email', async (req, res) => {
  try {
    const { email } = req.body;
    const tenant = await Tenant.findOne({ email: email.toLowerCase() });
    if (!tenant)
      return res.status(404).json({ success:false, message:'Email registered nahi hai!' });
    res.json({ success:true, message:'Email verified!' });
  } catch(err) { res.status(500).json({ success:false, message:err.message }); }
});

// ── TRIAL STATUS CHECK ──
router.get('/trial-status', verifyTenant, async (req, res) => {
  try {
    const tenant = await Tenant.findOne({ tenantId: req.tenantId }).select('plan trialEnds subscriptionEnd isActive');
    const now = new Date();
    const daysLeft = tenant?.trialEnds ? Math.ceil((new Date(tenant.trialEnds) - now) / (1000*60*60*24)) : 0;
    res.json({ plan: tenant?.plan, daysLeft: Math.max(0, daysLeft), isActive: tenant?.isActive });
  } catch(err) { res.status(500).json({ message:err.message }); }
});

module.exports = { router, verifyTenant };