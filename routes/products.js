const express = require('express');
const router = express.Router();
const Product = require('../models/Product');

// ── GET ALL ──
router.get('/', async (req, res) => {
  try {
    const products = await Product.find({
      tenantId: req.tenantId  // ✅ Tenant filter
    }).sort({ name: 1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET SINGLE ──
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findOne({
      _id: req.params.id,
      tenantId: req.tenantId  // ✅ Tenant filter added
    });
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── POST — CREATE ──
router.post('/', async (req, res) => {
  try {
    // Check duplicate name in same tenant
    const existing = await Product.findOne({
      name: { $regex: new RegExp('^' + req.body.name + '$', 'i') },
      tenantId: req.tenantId
    });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Product already exists: ' + existing.name,
        existingId: existing._id
      });
    }

    const product = new Product({
      ...req.body,
      tenantId: req.tenantId  // ✅ Always set tenantId from auth
    });
    await product.save();
    res.json({ success: true, product });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ── PUT — UPDATE ──
router.put('/:id', async (req, res) => {
  try {
    // Remove tenantId from body to prevent override
    const { tenantId, ...updateData } = req.body;

    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },  // ✅ Tenant filter
      updateData,
      { new: true, runValidators: false }
    );
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true, product });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ── DELETE ──
router.delete('/:id', async (req, res) => {
  try {
    const product = await Product.findOneAndDelete({
      _id: req.params.id,
      tenantId: req.tenantId  // ✅ Tenant filter
    });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── PATCH — UPDATE STOCK ONLY ──
router.patch('/:id/stock', async (req, res) => {
  try {
    const { qty, mode } = req.body; // mode: 'add' | 'set'
    const product = await Product.findOne({
      _id: req.params.id,
      tenantId: req.tenantId
    });
    if (!product) return res.status(404).json({ message: 'Not found' });

    if (mode === 'set') {
      product.stock = qty;
    } else {
      product.stock = (product.stock || 0) + qty;
    }
    await product.save();
    res.json({ success: true, stock: product.stock });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

module.exports = router;