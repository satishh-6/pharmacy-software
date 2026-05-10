const express = require('express');
const router = express.Router();
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const Customer = require('../models/Customer');

// GET all sales
router.get('/', async (req, res) => {
  try {
    const { from, to } = req.query;
    let filter = { tenantId: req.tenantId };  // ← ADD
    if (from && to) filter.date = { $gte: new Date(from), $lte: new Date(to) };
    const sales = await Sale.find(filter).sort({ date: -1 });
    res.json(sales);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// GET single sale
router.get('/:id', async (req, res) => {
  try {
    const sale = await Sale.findOne({
      _id: req.params.id,
      tenantId: req.tenantId  // ← ADD
    });
    if (!sale) return res.status(404).json({ message: 'Not found' });
    res.json(sale);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// POST new sale
router.post('/', async (req, res) => {
  try {
    const billNo = 'BILL-' + Date.now().toString().slice(-6);
    req.body.billNo = billNo;
    if (!req.body.date) req.body.date = new Date();

    const sale = new Sale({
      ...req.body,
      tenantId: req.tenantId  // ← ADD
    });
    await sale.save();

    // ── Stock reduce ──
    for (const item of req.body.items) {
      const product = await Product.findOne({
        _id: item.product,
        tenantId: req.tenantId  // ← ADD
      });
      if (!product) continue;
      if (product.category === 'medicine' && product.sellType === 'loose') {
        let qtyToReduce = item.qty;
        let newLoose = product.looseStock || 0;
        let newStrips = product.stripStock || 0;
        const ups = product.unitsPerStrip || 10;
        if (newLoose >= qtyToReduce) {
          newLoose -= qtyToReduce;
        } else {
          qtyToReduce -= newLoose; newLoose = 0;
          const stripsNeeded = Math.ceil(qtyToReduce / ups);
          newStrips = Math.max(0, newStrips - stripsNeeded);
          newLoose = (stripsNeeded * ups) - qtyToReduce;
        }
        await Product.findByIdAndUpdate(item.product, { stripStock: newStrips, looseStock: newLoose });
      } else {
        await Product.findByIdAndUpdate(item.product, { $inc: { stock: -item.qty } });
      }
    }

    // ── AUTO SAVE/UPDATE CUSTOMER ──
    const customerName = req.body.customer;
    const customerPhone = req.body.customerPhone;
    const totalAmount = req.body.totalAmount || 0;

    if (customerName && customerName !== 'Walk-in Customer') {
      try {
        let customer = null;

        if (customerPhone && customerPhone.trim()) {
          customer = await Customer.findOne({
            phone: customerPhone.trim(),
            tenantId: req.tenantId  // ← ADD
          });
        }

        if (!customer && customerName) {
          customer = await Customer.findOne({
            name: { $regex: new RegExp('^'+customerName.trim()+'$', 'i') },
            tenantId: req.tenantId  // ← ADD
          });
        }

        const pointsEarned = Math.floor(totalAmount / 10);

        if (customer) {
          await Customer.findByIdAndUpdate(customer._id, {
            $inc: {
              totalPurchases: 1,
              totalSpent: totalAmount,
              loyaltyPoints: pointsEarned
            },
            lastVisit: new Date(),
            ...(customerPhone && !customer.phone ? { phone: customerPhone } : {})
          });
          await Sale.findByIdAndUpdate(sale._id, { customerId: customer._id });
        } else {
          const newCustomer = await Customer.create({
            name: customerName.trim(),
            phone: customerPhone ? customerPhone.trim() : '',
            totalSpent: totalAmount,
            totalPurchases: 1,
            loyaltyPoints: pointsEarned,
            lastVisit: new Date(),
            tenantId: req.tenantId  // ← ADD
          });
          await Sale.findByIdAndUpdate(sale._id, { customerId: newCustomer._id });
          console.log('✅ New customer auto-saved:', customerName);
        }
      } catch(custErr) {
        console.log('Customer auto-save error:', custErr.message);
      }
    }

    res.json({ success: true, sale });
  } catch (err) {
    console.log('SALE ERROR:', err.message);
    res.status(400).json({ success: false, message: err.message });
  }
});

// Customer payment
router.patch('/:id/payment', async (req, res) => {
  try {
    const { amount, paymentMode, note } = req.body;
    const sale = await Sale.findOne({
      _id: req.params.id,
      tenantId: req.tenantId  // ← ADD
    });
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

// Edit bill
router.put('/:id', async (req, res) => {
  try {
    const oldSale = await Sale.findOne({
      _id: req.params.id,
      tenantId: req.tenantId  // ← ADD
    });
    if (!oldSale) return res.status(404).json({ message: 'Sale not found' });

    // Stock wapas add karo (old items)
    for (const item of oldSale.items) {
      const product = await Product.findOne({
        _id: item.product,
        tenantId: req.tenantId  // ← ADD
      });
      if (!product) continue;
      if (product.category === 'medicine' && product.sellType === 'loose') {
        await Product.findByIdAndUpdate(item.product, { $inc: { looseStock: item.qty } });
      } else {
        await Product.findByIdAndUpdate(item.product, { $inc: { stock: item.qty } });
      }
    }

    // Stock reduce karo (new items)
    for (const item of req.body.items) {
      const product = await Product.findOne({
        _id: item.product,
        tenantId: req.tenantId  // ← ADD
      });
      if (!product) continue;
      if (product.category === 'medicine' && product.sellType === 'loose') {
        let qtr = item.qty, nl = product.looseStock||0, ns = product.stripStock||0, ups = product.unitsPerStrip||10;
        if (nl >= qtr) { nl -= qtr; }
        else { qtr -= nl; nl = 0; const sn = Math.ceil(qtr/ups); ns = Math.max(0,ns-sn); nl = (sn*ups)-qtr; }
        await Product.findByIdAndUpdate(item.product, { stripStock: ns, looseStock: nl });
      } else {
        await Product.findByIdAndUpdate(item.product, { $inc: { stock: -item.qty } });
      }
    }

    const updated = await Sale.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },  // ← ADD
      { ...req.body, billNo: oldSale.billNo },
      { new: true }
    );
    res.json({ success: true, sale: updated });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
});

// Delete bill
router.delete('/:id', async (req, res) => {
  try {
    const sale = await Sale.findOne({
      _id: req.params.id,
      tenantId: req.tenantId  // ← ADD
    });
    if (!sale) return res.status(404).json({ message: 'Sale not found' });

    for (const item of sale.items) {
      const product = await Product.findById(item.product);
      if (!product) continue;
      if (product.sellType === 'loose') await Product.findByIdAndUpdate(item.product, { $inc: { looseStock: item.qty } });
      else await Product.findByIdAndUpdate(item.product, { $inc: { stock: item.qty } });
    }
    await Sale.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});

// GET — sirf apne tenant ka data
router.get('/', async (req, res) => {
  try {
    const { from, to } = req.query;
    const filter = {};
    if (req.tenantId) filter.tenantId = req.tenantId;
    if (from && to) filter.date = { $gte: new Date(from), $lte: new Date(to) };
    const sales = await Sale.find(filter).sort({ date: -1 });
    res.json(sales);
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