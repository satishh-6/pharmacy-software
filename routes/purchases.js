const express = require('express');
const router = express.Router();
const Purchase = require('../models/Purchase');
const Product = require('../models/Product');

// GET all
router.get('/', async (req, res) => {
  try {
    const purchases = await Purchase.find({
      tenantId: req.tenantId  // ← ADD
    }).sort({ date: -1 });
    res.json(purchases);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET single
router.get('/:id', async (req, res) => {
  try {
    const purchase = await Purchase.findOne({
      _id: req.params.id,
      tenantId: req.tenantId  // ← ADD
    });
    if (!purchase) return res.status(404).json({ message: 'Not found' });
    res.json(purchase);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST
router.post('/', async (req, res) => {
  try {
    const purchase = new Purchase({
      ...req.body,
      tenantId: req.tenantId  // ← ADD
    });
    await purchase.save();

    for (const item of req.body.items) {
      const product = await Product.findOne({
        _id: item.product,
        tenantId: req.tenantId  // ← ADD
      });
      if (!product) continue;
      if (product.sellType === 'loose') {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { stripStock: item.qty },
          batch: item.batch, expiry: item.expiry,
          purchasePrice: item.purchasePrice, mrp: item.mrp
        });
      } else {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { stock: item.qty },
          batch: item.batch, expiry: item.expiry,
          purchasePrice: item.purchasePrice, mrp: item.mrp
        });
      }
    }
    res.json({ success: true, purchase });
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// PUT edit
router.put('/:id', async (req, res) => {
  try {
    const oldPurchase = await Purchase.findOne({
      _id: req.params.id,
      tenantId: req.tenantId  // ← ADD
    });
    if (!oldPurchase) return res.status(404).json({ message: 'Purchase not found' });

    // Reverse old stock
    for (const item of oldPurchase.items) {
      const product = await Product.findOne({
        _id: item.product,
        tenantId: req.tenantId  // ← ADD
      });
      if (!product) continue;
      if (product.sellType === 'loose') {
        await Product.findByIdAndUpdate(item.product, { $inc: { stripStock: -item.qty } });
      } else {
        await Product.findByIdAndUpdate(item.product, { $inc: { stock: -item.qty } });
      }
    }

    // Apply new stock
    for (const item of req.body.items) {
      const product = await Product.findOne({
        _id: item.product,
        tenantId: req.tenantId  // ← ADD
      });
      if (!product) continue;
      if (product.sellType === 'loose') {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { stripStock: item.qty },
          batch: item.batch, expiry: item.expiry,
          purchasePrice: item.purchasePrice, mrp: item.mrp
        });
      } else {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { stock: item.qty },
          batch: item.batch, expiry: item.expiry,
          purchasePrice: item.purchasePrice, mrp: item.mrp
        });
      }
    }

    const updated = await Purchase.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },  // ← ADD
      req.body,
      { new: true }
    );
    res.json({ success: true, purchase: updated });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
});

// DELETE
router.delete('/:id', async (req, res) => {
  try {
    const purchase = await Purchase.findOne({
      _id: req.params.id,
      tenantId: req.tenantId  // ← ADD
    });
    if (!purchase) return res.status(404).json({ message: 'Not found' });

    for (const item of purchase.items) {
      const product = await Product.findById(item.product);
      if (!product) continue;
      if (product.sellType === 'loose') {
        await Product.findByIdAndUpdate(item.product, { $inc: { stripStock: -item.qty } });
      } else {
        await Product.findByIdAndUpdate(item.product, { $inc: { stock: -item.qty } });
      }
    }

    await Purchase.findOneAndDelete({
      _id: req.params.id,
      tenantId: req.tenantId  // ← ADD
    });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Payment update
router.patch('/:id/payment', async (req, res) => {
  try {
    const { amount, note } = req.body;
    const purchase = await Purchase.findOne({
      _id: req.params.id,
      tenantId: req.tenantId  // ← ADD
    });
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
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
});

// GET — sirf apne tenant ka data
router.get('/', async (req, res) => {
  const products = await Product.find({ tenantId: req.tenantId });
  res.json(products);
});

// POST — tenantId save
router.post('/', async (req, res) => {
  const product = new Product({ ...req.body, tenantId: req.tenantId });
  await product.save();
  res.json({ success: true, product });
});

module.exports = router;