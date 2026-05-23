const express = require('express');
const router = express.Router();
const Purchase = require('../models/Purchase');
const Product = require('../models/Product');
const { updateStockWithBatch, reverseStockBatch } = require('./batch-stock');

// ── GET ALL PURCHASES ──
router.get('/', async (req, res) => {
  try {
    const purchases = await Purchase.find({
      tenantId: req.tenantId
    }).sort({ date: -1 });
    res.json(purchases);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── GET SINGLE PURCHASE ──
router.get('/:id', async (req, res) => {
  try {
    const purchase = await Purchase.findOne({
      _id: req.params.id,
      tenantId: req.tenantId
    });
    if (!purchase) return res.status(404).json({ message: 'Not found' });
    res.json(purchase);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── POST — NEW PURCHASE ──
router.post('/', async (req, res) => {
  try {
    const stockMode = req.body.stockUpdateMode || 'add';

    const purchase = new Purchase({
      ...req.body,
      tenantId: req.tenantId
    });
    await purchase.save();

    // ── BATCH-WISE STOCK UPDATE ──
    for (const item of req.body.items) {
      await updateStockWithBatch(
        item,
        req.body.supplier || '',
        stockMode,
        req.tenantId
      );
    }

    res.json({ success: true, purchase });
  } catch (err) {
    console.error('Purchase save error:', err);
    res.status(400).json({ message: err.message });
  }
});

// ── PUT — EDIT PURCHASE ──
router.put('/:id', async (req, res) => {
  try {
    const oldPurchase = await Purchase.findOne({
      _id: req.params.id,
      tenantId: req.tenantId
    });
    if (!oldPurchase) return res.status(404).json({ message: 'Purchase not found' });

    // Step 1: Reverse OLD stock (batch-wise)
    for (const item of oldPurchase.items) {
      await reverseStockBatch(
        item,
        oldPurchase.supplier || '',
        req.tenantId
      );
    }

    // Step 2: Apply NEW stock (batch-wise)
    const stockMode = req.body.stockUpdateMode || 'add';
    for (const item of req.body.items) {
      await updateStockWithBatch(
        item,
        req.body.supplier || '',
        stockMode,
        req.tenantId
      );
    }

    // Step 3: Update purchase record
    const updated = await Purchase.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },
      { ...req.body, tenantId: req.tenantId },
      { new: true }
    );
    res.json({ success: true, purchase: updated });
  } catch (err) {
    console.error('Purchase edit error:', err);
    res.status(400).json({ success: false, message: err.message });
  }
});

// ── DELETE — CANCEL PURCHASE ──
router.delete('/:id', async (req, res) => {
  try {
    const purchase = await Purchase.findOne({
      _id: req.params.id,
      tenantId: req.tenantId
    });
    if (!purchase) return res.status(404).json({ message: 'Not found' });

    // Reverse batch stock
    for (const item of purchase.items) {
      await reverseStockBatch(
        item,
        purchase.supplier || '',
        req.tenantId
      );
    }

    await Purchase.findOneAndDelete({
      _id: req.params.id,
      tenantId: req.tenantId
    });
    res.json({ success: true });
  } catch (err) {
    console.error('Purchase delete error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── PATCH — PAYMENT UPDATE ──
router.patch('/:id/payment', async (req, res) => {
  try {
    const { amount, note } = req.body;
    const purchase = await Purchase.findOne({
      _id: req.params.id,
      tenantId: req.tenantId
    });
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
    res.json({ success: true, purchase });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

module.exports = router;
