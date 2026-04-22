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

router.patch('/:id/payment', async (req, res) => {
  try {
    const { amount, note } = req.body;
    const purchase = await Purchase.findById(req.params.id);
    if (!purchase) return res.status(404).json({ message: 'Purchase not found' });

    const newPaid = (purchase.paidAmount || 0) + parseFloat(amount);
    const total = purchase.totalAmount || 0;
    const status = newPaid >= total ? 'paid' : newPaid > 0 ? 'partial' : 'unpaid';

    if (!purchase.paymentHistory) purchase.paymentHistory = [];
    purchase.paymentHistory.push({
      amount: parseFloat(amount),
      date: new Date(),
      note: note || ''
    });
    purchase.paidAmount = newPaid;
    purchase.paymentStatus = status;
    purchase.markModified('paymentHistory');
    await purchase.save();

    res.json({ success: true, purchase });
  } catch (err) {
    console.log('Payment error:', err.message);
    res.status(400).json({ success: false, message: err.message });
  }
});

module.exports = router;