const express = require('express');
const router = require('express').Router();
const Sale = require('../models/Sale');
const Product = require('../models/Product');

router.get('/', async (req, res) => {
  try {
    const { from, to } = req.query;
    let filter = {};
    if (from && to) filter.date = { $gte: new Date(from), $lte: new Date(to) };
    const sales = await Sale.find(filter).sort({ date: -1 });
    res.json(sales);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.post('/', async (req, res) => {
  try {
    const billNo = 'BILL-' + Date.now().toString().slice(-6);
    req.body.billNo = billNo;
    const sale = new Sale(req.body);
    await sale.save();

    for (const item of req.body.items) {
      const product = await Product.findById(item.product);
      if (!product) continue;
      if (product.category === 'medicine' && product.sellType === 'loose') {
        let qtyToReduce = item.qty;
        let newLoose = product.looseStock || 0;
        let newStrips = product.stripStock || 0;
        const ups = product.unitsPerStrip || 10;
        if (newLoose >= qtyToReduce) {
          newLoose -= qtyToReduce;
        } else {
          qtyToReduce -= newLoose;
          newLoose = 0;
          const stripsNeeded = Math.ceil(qtyToReduce / ups);
          newStrips = Math.max(0, newStrips - stripsNeeded);
          newLoose = (stripsNeeded * ups) - qtyToReduce;
        }
        await Product.findByIdAndUpdate(item.product, { stripStock: newStrips, looseStock: newLoose });
      } else {
        await Product.findByIdAndUpdate(item.product, { $inc: { stock: -item.qty } });
      }
    }
    res.json({ success: true, sale });
  } catch (err) {
    console.log('SALE ERROR:', err.message);
    res.status(400).json({ success: false, message: err.message });
  }
});

// Customer payment update
router.patch('/:id/payment', async (req, res) => {
  try {
    const { amount, paymentMode, note } = req.body;
    const sale = await Sale.findById(req.params.id);
    if (!sale) return res.status(404).json({ message: 'Sale not found' });
    const newPaid = (sale.paidAmount || 0) + parseFloat(amount);
    sale.paidAmount = newPaid;
    sale.paymentMode = paymentMode || sale.paymentMode;
    sale.paymentStatus = newPaid >= sale.totalAmount ? 'paid' : 'partial';
    if (!sale.paymentHistory) sale.paymentHistory = [];
    sale.paymentHistory.push({ amount: parseFloat(amount), date: new Date(), note: note||'', mode: paymentMode||'cash' });
    sale.markModified('paymentHistory');
    await sale.save();
    res.json({ success: true, sale });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
});

// GET single sale
router.get('/:id', async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id);
    if (!sale) return res.status(404).json({ message: 'Not found' });
    res.json(sale);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// EDIT bill — stock reverse karke nayi items se update
router.put('/:id', async (req, res) => {
  try {
    const oldSale = await Sale.findById(req.params.id);
    if (!oldSale) return res.status(404).json({ message: 'Sale not found' });

    // Step 1: Purane items ka stock wapas karo
    for (const item of oldSale.items) {
      const product = await Product.findById(item.product);
      if (!product) continue;
      if (product.category === 'medicine' && product.sellType === 'loose') {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { looseStock: item.qty }
        });
      } else {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { stock: item.qty }
        });
      }
    }

    // Step 2: Naye items ka stock kato
    for (const item of req.body.items) {
      const product = await Product.findById(item.product);
      if (!product) continue;
      if (product.category === 'medicine' && product.sellType === 'loose') {
        let qtyToReduce = item.qty;
        let newLoose = product.looseStock || 0;
        let newStrips = product.stripStock || 0;
        const ups = product.unitsPerStrip || 10;
        if (newLoose >= qtyToReduce) {
          newLoose -= qtyToReduce;
        } else {
          qtyToReduce -= newLoose;
          newLoose = 0;
          const stripsNeeded = Math.ceil(qtyToReduce / ups);
          newStrips = Math.max(0, newStrips - stripsNeeded);
          newLoose = (stripsNeeded * ups) - qtyToReduce;
        }
        await Product.findByIdAndUpdate(item.product, { stripStock: newStrips, looseStock: newLoose });
      } else {
        await Product.findByIdAndUpdate(item.product, { $inc: { stock: -item.qty } });
      }
    }

    // Step 3: Bill update karo
    const updated = await Sale.findByIdAndUpdate(req.params.id, {
      ...req.body,
      billNo: oldSale.billNo // Bill number same rakho
    }, { new: true });

    res.json({ success: true, sale: updated });
  } catch (err) {
    console.log('Edit error:', err.message);
    res.status(400).json({ success: false, message: err.message });
  }
});

// CANCEL/DELETE bill — stock wapas karo
router.delete('/:id', async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id);
    if (!sale) return res.status(404).json({ message: 'Sale not found' });

    // Stock reverse
    for (const item of sale.items) {
      const product = await Product.findById(item.product);
      if (!product) continue;
      if (product.category === 'medicine' && product.sellType === 'loose') {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { looseStock: item.qty }
        });
      } else {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { stock: item.qty }
        });
      }
    }

    await Sale.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Bill cancelled and stock restored' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;