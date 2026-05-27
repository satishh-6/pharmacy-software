const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Tenant = require('../models/Tenant');
const SuperAdmin = require('../models/SuperAdmin');
const Sale = require('../models/Sale');
const Product = require('../models/Product');

// ── SUPER ADMIN LOGIN ──
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await SuperAdmin.findOne({ email });
    if (!admin) return res.status(401).json({ success: false, message: 'Invalid credentials!' });
    const isValid = await bcrypt.compare(password, admin.password);
    if (!isValid) return res.status(401).json({ success: false, message: 'Wrong password!' });
    const token = jwt.sign({ id: admin._id, type: 'superadmin' }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ success: true, token, admin: { name: admin.name, email: admin.email } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── MIDDLEWARE ──
function verifySuperAdmin(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token!' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.type !== 'superadmin') return res.status(403).json({ message: 'Not authorized!' });
    req.adminId = decoded.id;
    next();
  } catch {
    res.status(401).json({ message: 'Invalid token!' });
  }
}

// ── DASHBOARD STATS ──
router.get('/dashboard', verifySuperAdmin, async (req, res) => {
  try {
    const totalTenants = await Tenant.countDocuments();
    const activeTenants = await Tenant.countDocuments({ isActive: true });
    const trialTenants = await Tenant.countDocuments({ plan: 'trial' });
    const paidTenants = await Tenant.countDocuments({ plan: { $in: ['basic', 'pro', 'enterprise'] } });

    const paidPlans = await Tenant.find({ plan: { $in: ['basic', 'pro', 'enterprise'] } });
    const monthlyRevenue = paidPlans.reduce((sum, t) => sum + (t.planPrice || 0), 0);

    const recentTenants = await Tenant.find()
      .sort({ createdAt: -1 }).limit(10).select('-password');

    const in3days = new Date();
    in3days.setDate(in3days.getDate() + 3);
    const expiringTrials = await Tenant.countDocuments({
      plan: 'trial',
      trialEnds: { $lte: in3days, $gte: new Date() }
    });

    const allTenantIds = await Tenant.find().select('tenantId pharmacyName ownerName plan').lean();
    const topPharmacies = [];
    for (const t of allTenantIds.slice(0, 10)) {
      const [salesCount, revAgg, custCount] = await Promise.all([
        Sale.countDocuments({ tenantId: t.tenantId }),
        Sale.aggregate([{ $match: { tenantId: t.tenantId } }, { $group: { _id: null, total: { $sum: '$totalAmount' } } }]),
        (async () => { try { const C = require('../models/Customer'); return await C.countDocuments({ tenantId: t.tenantId }); } catch { return 0; } })()
      ]);
      topPharmacies.push({ ...t, totalSales: salesCount, totalRevenue: revAgg[0]?.total || 0, totalCustomers: custCount });
    }
    topPharmacies.sort((a, b) => b.totalRevenue - a.totalRevenue);

    res.json({
      stats: { totalTenants, activeTenants, trialTenants, paidTenants, monthlyRevenue, expiringTrials },
      recentTenants,
      topPharmacies
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── ALL TENANTS WITH STATS ──
router.get('/tenants', verifySuperAdmin, async (req, res) => {
  try {
    const tenants = await Tenant.find().select('-password').sort({ createdAt: -1 });
    const Customer = require('../models/Customer');

    const tenantsWithStats = await Promise.all(tenants.map(async (t) => {
      const tid = t.tenantId;
      const [totalSales, totalCustomers, revenueAgg] = await Promise.all([
        Sale.countDocuments({ tenantId: tid }),
        Customer.countDocuments({ tenantId: tid }).catch(() => 0),
        Sale.aggregate([
          { $match: { tenantId: tid } },
          { $group: { _id: null, total: { $sum: '$totalAmount' } } }
        ])
      ]);
      return {
        ...t.toObject(),
        totalSales,
        totalCustomers,
        totalRevenue: revenueAgg[0]?.total || 0
      };
    }));

    res.json(tenantsWithStats);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── SINGLE TENANT ──
router.get('/tenants/:tenantId', verifySuperAdmin, async (req, res) => {
  try {
    const tenant = await Tenant.findOne({ tenantId: req.params.tenantId }).select('-password');
    const bills = await Sale.countDocuments({ tenantId: req.params.tenantId });
    const products = await Product.countDocuments({ tenantId: req.params.tenantId });
    const revenue = await Sale.aggregate([
      { $match: { tenantId: req.params.tenantId } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    res.json({ tenant, stats: { bills, products, revenue: revenue[0]?.total || 0 } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── TENANT FULL DETAIL ──
router.get('/tenants/:tenantId/detail', verifySuperAdmin, async (req, res) => {
  try {
    const tid = req.params.tenantId;
    const Customer = require('../models/Customer');
    const Purchase = require('../models/Purchase');
    const Prescription = require('../models/Prescription');

    const tenant = await Tenant.findOne({ tenantId: tid }).select('-password');
    if (!tenant) return res.status(404).json({ message: 'Tenant not found!' });

    const [totalSales, totalProducts, totalCustomers, totalPurchases, totalPrescriptions, revenueAgg] = await Promise.all([
      Sale.countDocuments({ tenantId: tid }),
      Product.countDocuments({ tenantId: tid }),
      Customer.countDocuments({ tenantId: tid }),
      Purchase.countDocuments({ tenantId: tid }),
      Prescription.countDocuments({ tenantId: tid }).catch(() => 0),
      Sale.aggregate([{ $match: { tenantId: tid } }, { $group: { _id: null, total: { $sum: '$totalAmount' } } }])
    ]);

    const [recentSales, recentProducts, recentCustomers, recentPurchases] = await Promise.all([
      Sale.find({ tenantId: tid }).sort({ date: -1 }).limit(20),
      Product.find({ tenantId: tid }).sort({ createdAt: -1 }).limit(20),
      Customer.find({ tenantId: tid }).sort({ createdAt: -1 }).limit(20),
      Purchase.find({ tenantId: tid }).sort({ createdAt: -1 }).limit(20)
    ]);

    res.json({
      ...tenant.toObject(),
      stats: {
        totalSales, totalProducts, totalCustomers,
        totalPurchases, totalPrescriptions,
        totalRevenue: revenueAgg[0]?.total || 0
      },
      recentSales, recentProducts, recentCustomers, recentPurchases
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── ✅ IMPERSONATE — BAHAR NIKALA (detail route ke baad, alag route) ──
router.post('/tenants/:tenantId/impersonate', verifySuperAdmin, async (req, res) => {
  try {
    const tenant = await Tenant.findOne({ tenantId: req.params.tenantId });
    if (!tenant) return res.status(404).json({ success: false, message: 'Tenant not found!' });

    if (!tenant.isActive) return res.status(403).json({ success: false, message: 'Tenant suspended!' });

    const token = jwt.sign(
      {
        tenantId: tenant.tenantId,
        type: 'tenant',
        role: 'owner',
        name: tenant.ownerName,
        email: tenant.email
      },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }  // ✅ 2h se 30d
    );

    res.json({
      success: true,
      token,
      tenant: {
        pharmacyName: tenant.pharmacyName,
        ownerName: tenant.ownerName,
        email: tenant.email,
        tenantId: tenant.tenantId,
        role: 'owner'
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── UPDATE PLAN ──
router.patch('/tenants/:tenantId/plan', verifySuperAdmin, async (req, res) => {
  try {
    const { plan, months } = req.body;
    const prices = { basic: 500, pro: 1500, enterprise: 3000 };
    const subscriptionEnd = new Date();
    subscriptionEnd.setFullYear(subscriptionEnd.getFullYear() + (months || 1));
    await Tenant.findOneAndUpdate(
      { tenantId: req.params.tenantId },
      {
        plan,
        planPrice: prices[plan] || 0,
        subscriptionStart: new Date(),
        subscriptionEnd,
        isActive: true
      }
    );
    res.json({ success: true, message: `Plan updated to ${plan}` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── SUSPEND / ACTIVATE ──
router.patch('/tenants/:tenantId/status', verifySuperAdmin, async (req, res) => {
  try {
    await Tenant.findOneAndUpdate(
      { tenantId: req.params.tenantId },
      { isActive: req.body.isActive }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── RESET PASSWORD ──
router.patch('/tenants/:tenantId/reset-password', verifySuperAdmin, async (req, res) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6)
      return res.status(400).json({ success: false, message: 'Min 6 characters!' });
    const hashed = await bcrypt.hash(newPassword, 10);

    // Owner password reset
    const tenant = await Tenant.findOne({ tenantId: req.params.tenantId });
    if (!tenant) return res.status(404).json({ success: false, message: 'Tenant not found!' });

    tenant.password = hashed;

    // Staff owner ka bhi update karo
    const ownerStaff = tenant.staff?.find(s => s.role === 'owner');
    if (ownerStaff) ownerStaff.password = hashed;

    await tenant.save();
    res.json({ success: true, message: 'Password reset ho gaya!' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── DELETE TENANT ──
router.delete('/tenants/:tenantId', verifySuperAdmin, async (req, res) => {
  try {
    const tid = req.params.tenantId;
    await Tenant.findOneAndDelete({ tenantId: tid });
    // Data bhi delete karo
    await Promise.allSettled([
      Sale.deleteMany({ tenantId: tid }),
      Product.deleteMany({ tenantId: tid }),
      (async () => { try { const C = require('../models/Customer'); await C.deleteMany({ tenantId: tid }); } catch {} })(),
      (async () => { try { const P = require('../models/Purchase'); await P.deleteMany({ tenantId: tid }); } catch {} })(),
    ]);
    res.json({ success: true, message: 'Tenant deleted!' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── SETUP SUPER ADMIN (one time) ──
router.post('/setup', async (req, res) => {
  try {
    const count = await SuperAdmin.countDocuments();
    if (count > 0) return res.status(403).json({ message: 'Already setup!' });
    const admin = new SuperAdmin({
      name: req.body.name,
      email: req.body.email,
      password: req.body.password
    });
    await admin.save();
    res.json({ success: true, message: 'Super admin created!' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = { router, verifySuperAdmin };