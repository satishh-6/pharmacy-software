const express = require('express');
const router = express.Router();
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const Customer = require('../models/Customer');

// ── BILL NUMBER GENERATE ──
async function generateBillNo(tenantId) {
  const today = new Date();
  const yy = String(today.getFullYear()).slice(-2);
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const prefix = `INV-${yy}${mm}-`;
  const lastSale = await Sale.findOne({ tenantId, billNo: { $regex: `^${prefix}` } })
    .sort({ billNo: -1 });
  let num = 1;
  if (lastSale?.billNo) {
    const lastNum = parseInt(lastSale.billNo.replace(prefix, '')) || 0;
    num = lastNum + 1;
  }
  return prefix + String(num).padStart(4, '0');
}

// ── STOCK DEDUCT ──

async function deductStock(items, tenantId) {
  for (const item of items) {
    const p = await Product.findOne({ _id: item.product, tenantId });
    if (!p) continue;

    if (item.sellUnit === 'pill' || p.sellType === 'loose') {
      // Pill wise deduction
      await Product.findByIdAndUpdate(item.product, {
        $inc: { looseStock: -item.qty, stock: -1 }
      });
    } else if (p.batches && p.batches.length > 0) {
      // ✅ Batch-wise FIFO deduction
      let remaining = item.qty;
      const batches = [...p.batches].sort((a,b)=>{
        const da = parseExp(a.expiry), db = parseExp(b.expiry);
        return da-db;
      });
      for(const batch of batches){
        if(remaining <= 0) break;
        if(batch.batchNo === item.batchNo || !item.batchNo){
          const deduct = Math.min(batch.qty, remaining);
          batch.qty -= deduct;
          remaining -= deduct;
        }
      }
      const totalStock = batches.reduce((s,b)=>s+(b.qty||0),0);
      await Product.findOneAndUpdate(
        { _id: item.product, tenantId },
        { batches: batches.filter(b=>b.qty>0), stock: totalStock }
      );
    } else {
      // Simple deduction
      await Product.findByIdAndUpdate(item.product, { $inc: { stock: -item.qty } });
    }
  }
}

function parseExp(mmyy){
  if(!mmyy) return new Date('9999-12-31');
  const p = mmyy.split('/');
  return p.length<2 ? new Date('9999-12-31') : new Date(parseInt('20'+p[1]),parseInt(p[0])-1,28);
}

// ── STOCK RESTORE ──
async function restoreStock(items, tenantId) {
  for (const item of items) {
    const p = await Product.findOne({ _id: item.product, tenantId });
    if (!p) continue;
    if (item.sellUnit === 'pill' || p.sellType === 'loose') {
      await Product.findByIdAndUpdate(item.product, { $inc: { looseStock: item.qty } });
    } else {
      await Product.findByIdAndUpdate(item.product, { $inc: { stock: item.qty } });
    }
  }
}

// ── GET ALL SALES ──
router.get('/', async (req, res) => {
  try {
    const sales = await Sale.find({ tenantId: req.tenantId })
      .sort({ date: -1 })
      .limit(100);
    res.json(sales);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── GET SINGLE SALE ──
router.get('/:id', async (req, res) => {
  try {
    const sale = await Sale.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!sale) return res.status(404).json({ message: 'Sale not found' });
    res.json(sale);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── CREATE SALE ──
router.post('/', async (req, res) => {
  try {
    const billNo = await generateBillNo(req.tenantId);
    const sale = new Sale({
      ...req.body,
      billNo,
      tenantId: req.tenantId
    });
    await sale.save();

    // Stock deduct
    await deductStock(req.body.items || [], req.tenantId);

    // Customer update
    if (req.body.customerId) {
      const earnedPoints = Math.floor((req.body.totalAmount || 0) / 100);
      await Customer.findByIdAndUpdate(req.body.customerId, {
        $inc: { totalPurchases: 1, loyaltyPoints: earnedPoints, totalSpent: req.body.totalAmount || 0 },
        lastVisit: new Date()
      });
    }

    res.json({ success: true, sale });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ── EDIT SALE ──
router.put('/:id', async (req, res) => {
  try {
    const oldSale = await Sale.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!oldSale) return res.status(404).json({ message: 'Sale not found' });

    // Reverse old stock
    await restoreStock(oldSale.items || [], req.tenantId);

    // Deduct new stock
    await deductStock(req.body.items || [], req.tenantId);

    // Update sale (keep original billNo)
    const updated = await Sale.findByIdAndUpdate(
      req.params.id,
      { ...req.body, billNo: oldSale.billNo, tenantId: req.tenantId },
      { new: true }
    );

    res.json({ success: true, sale: updated });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// ── DELETE / CANCEL SALE ──
router.delete('/:id', async (req, res) => {
  try {
    const sale = await Sale.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!sale) return res.status(404).json({ message: 'Sale not found' });

    // Restore stock
    await restoreStock(sale.items || [], req.tenantId);

    await Sale.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── COLLECT PAYMENT (Credit Bill) ──
router.patch('/:id/payment', async (req, res) => {
  try {
    const { amount, paymentMode, note } = req.body;
    if (!amount || parseFloat(amount) <= 0)
      return res.status(400).json({ success: false, message: 'Valid amount required!' });

    const sale = await Sale.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!sale) return res.status(404).json({ message: 'Sale not found' });

    const newPaid = (sale.paidAmount || 0) + parseFloat(amount);
    sale.paidAmount = newPaid;
    sale.paymentMode = paymentMode || sale.paymentMode;
    sale.paymentStatus = newPaid >= sale.totalAmount ? 'paid' : 'partial';

    if (!sale.paymentHistory) sale.paymentHistory = [];
    sale.paymentHistory.push({
      amount: parseFloat(amount),
      date: new Date(),
      note: note || '',
      mode: paymentMode || 'cash'
    });
    sale.markModified('paymentHistory');
    await sale.save();

    res.json({ success: true, sale });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

module.exports = router;
