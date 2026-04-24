const express = require('express');
const router = express.Router();
const Customer = require('../models/Customer');
const Sale = require('../models/Sale');

// Get all customers
router.get('/', async (req, res) => {
  try {
    const customers = await Customer.find({ isActive: true }).sort({ name: 1 });
    res.json(customers);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Search customer by phone/name
router.get('/search', async (req, res) => {
  try {
    const q = req.query.q;
    const customers = await Customer.find({
      isActive: true,
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { phone: { $regex: q, $options: 'i' } }
      ]
    }).limit(10);
    res.json(customers);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Get single customer with purchase history
router.get('/:id', async (req, res) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ message: 'Not found' });

    // Purchase history
    const sales = await Sale.find({
      $or: [
        { customerPhone: customer.phone },
        { customer: customer.name }
      ]
    }).sort({ date: -1 }).limit(50);

    res.json({ customer, sales });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Create customer
router.post('/', async (req, res) => {
  try {
    const customer = new Customer(req.body);
    await customer.save();
    res.json({ success: true, customer });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
});

// Update customer
router.put('/:id', async (req, res) => {
  try {
    const customer = await Customer.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, customer });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
});

// Add loyalty points
router.patch('/:id/loyalty', async (req, res) => {
  try {
    const { points, spent } = req.body;
    const customer = await Customer.findByIdAndUpdate(req.params.id, {
      $inc: {
        loyaltyPoints: points,
        totalPurchases: 1,
        totalSpent: spent || 0
      },
      lastVisit: new Date()
    }, { new: true });
    res.json({ success: true, customer });
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// Redeem loyalty points
router.patch('/:id/redeem', async (req, res) => {
  try {
    const { points } = req.body;
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ message: 'Not found' });
    if (customer.loyaltyPoints < points) return res.status(400).json({ message: 'Insufficient points' });
    customer.loyaltyPoints -= points;
    await customer.save();
    res.json({ success: true, customer });
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// Delete (soft)
router.delete('/:id', async (req, res) => {
  try {
    await Customer.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;