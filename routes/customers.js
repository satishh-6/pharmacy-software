const express = require('express');
const router = express.Router();
const Customer = require('../models/Customer');
const Sale = require('../models/Sale');

// GET all customers
router.get('/search', async (req, res) => {
  try {
    const q = req.query.q || '';
    const filter = {
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { phone: { $regex: q, $options: 'i' } }
      ]
    };
    if (req.tenantId) filter.tenantId = req.tenantId;
    const customers = await Customer.find(filter).limit(10);
    res.json(customers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const filter = req.tenantId ? { tenantId: req.tenantId } : {};
    const customers = await Customer.find(filter).sort({ name: 1 });
    res.json(customers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET single customer with purchase history
router.get('/:id', async (req, res) => {
  try {
    const customer = await Customer.findOne({
      _id: req.params.id,
      tenantId: req.tenantId  // ← ADD
    });
    if (!customer) return res.status(404).json({ message: 'Not found' });

    const sales = await Sale.find({
      tenantId: req.tenantId,  // ← ADD
      $or: [
        { customerPhone: customer.phone },
        { customer: customer.name }
      ]
    }).sort({ date: -1 }).limit(50);

    res.json({ customer, sales });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST create customer
router.post('/', async (req, res) => {
  try {
    const customer = new Customer({
      ...req.body,
      tenantId: req.tenantId  // ← ADD
    });
    await customer.save();
    res.json({ success: true, customer });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
});

// PUT update customer
router.put('/:id', async (req, res) => {
  try {
    const customer = await Customer.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },  // ← ADD
      req.body,
      { new: true }
    );
    res.json({ success: true, customer });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
});

// PATCH loyalty points add
router.patch('/:id/loyalty', async (req, res) => {
  try {
    const { points, spent } = req.body;
    const customer = await Customer.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },  // ← ADD
      {
        $inc: {
          loyaltyPoints: points,
          totalPurchases: 1,
          totalSpent: spent || 0
        },
        lastVisit: new Date()
      },
      { new: true }
    );
    res.json({ success: true, customer });
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// PATCH redeem loyalty points
router.patch('/:id/redeem', async (req, res) => {
  try {
    const { points } = req.body;
    const customer = await Customer.findOne({
      _id: req.params.id,
      tenantId: req.tenantId  // ← ADD
    });
    if (!customer) return res.status(404).json({ message: 'Not found' });
    if (customer.loyaltyPoints < points) return res.status(400).json({ message: 'Insufficient points' });
    customer.loyaltyPoints -= points;
    await customer.save();
    res.json({ success: true, customer });
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// DELETE soft delete
router.delete('/:id', async (req, res) => {
  try {
    await Customer.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },  // ← ADD
      { isActive: false }
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET — sirf apne tenant ka data
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.tenantId) filter.tenantId = req.tenantId;
    const customers = await Customer.find(filter).sort({ name: 1 });
    res.json(customers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/search', async (req, res) => {
  try {
    const q = req.query.q;
    const filter = {
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { phone: { $regex: q, $options: 'i' } }
      ]
    };
    if (req.tenantId) filter.tenantId = req.tenantId;
    const customers = await Customer.find(filter).limit(10);
    res.json(customers);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST — tenantId save
router.post('/', async (req, res) => {
  const product = new Product({ ...req.body, tenantId: req.tenantId });
  await product.save();
  res.json({ success: true, product });
});

module.exports = router;