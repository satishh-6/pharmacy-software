const express = require('express');
const router = express.Router();
const Purchase = require('../models/Purchase');
const Product = require('../models/Product');

router.get('/', async (req, res) => {
  try {
    const purchases = await Purchase.find().sort({ date: -1 });
    res.json(purchases);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const purchase = new Purchase(req.body);
    await purchase.save();
    for (const item of req.body.items) {
      const product = await Product.findById(item.product);
      if (!product) continue;
      if (product.sellType === 'loose') {
        await Product.findByIdAndUpdate(item.product, { $inc: { stripStock: item.qty }, batch: item.batch, expiry: item.expiry, purchasePrice: item.purchasePrice, mrp: item.mrp });
      } else {
        await Product.findByIdAndUpdate(item.product, { $inc: { stock: item.qty }, batch: item.batch, expiry: item.expiry, purchasePrice: item.purchasePrice, mrp: item.mrp });
      }
    }
    res.json({ success: true, purchase });
  } catch (err) { res.status(400).json({ message: err.message }); }
});

// Get single purchase
router.get('/:id', async (req, res) => {
  try {
    const purchase = await Purchase.findById(req.params.id);
    if (!purchase) return res.status(404).json({ message: 'Not found' });
    res.json(purchase);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Edit purchase
router.put('/:id', async (req, res) => {
  try {
    const oldPurchase = await Purchase.findById(req.params.id);
    if (!oldPurchase) return res.status(404).json({ message: 'Purchase not found' });

    // Reverse old stock
    for (const item of oldPurchase.items) {
      const product = await Product.findById(item.product);
      if (!product) continue;
      if (product.sellType === 'loose') {
        await Product.findByIdAndUpdate(item.product, { $inc: { stripStock: -item.qty } });
      } else {
        await Product.findByIdAndUpdate(item.product, { $inc: { stock: -item.qty } });
      }
    }

    // Apply new stock
    for (const item of req.body.items) {
      const product = await Product.findById(item.product);
      if (!product) continue;
      if (product.sellType === 'loose') {
        await Product.findByIdAndUpdate(item.product, { $inc: { stripStock: item.qty }, batch: item.batch, expiry: item.expiry, purchasePrice: item.purchasePrice, mrp: item.mrp });
      } else {
        await Product.findByIdAndUpdate(item.product, { $inc: { stock: item.qty }, batch: item.batch, expiry: item.expiry, purchasePrice: item.purchasePrice, mrp: item.mrp });
      }
    }

    const updated = await Purchase.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, purchase: updated });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
});

// Delete purchase — stock reverse
router.delete('/:id', async (req, res) => {
  try {
    const purchase = await Purchase.findById(req.params.id);
    if (!purchase) return res.status(404).json({ message: 'Not found' });

    // Reverse stock
    for (const item of purchase.items) {
      const product = await Product.findById(item.product);
      if (!product) continue;
      if (product.sellType === 'loose') {
        await Product.findByIdAndUpdate(item.product, { $inc: { stripStock: -item.qty } });
      } else {
        await Product.findByIdAndUpdate(item.product, { $inc: { stock: -item.qty } });
      }
    }

    await Purchase.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// Payment update
router.patch('/:id/payment', async (req, res) => {
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
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
});

module.exports = router;