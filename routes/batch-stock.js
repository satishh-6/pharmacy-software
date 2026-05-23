// ════════════════════════════════════════════════════════
//  routes/purchases.js — BATCH-WISE STOCK UPDATE LOGIC
//  Sirf stock update function replace karo
// ════════════════════════════════════════════════════════

// ── STOCK UPDATE FUNCTION ──
// Yeh function purchases.js mein POST /api/purchases route mein use karo

async function updateStockWithBatch(item, supplier, stockMode, tenantId) {
  const Product = require('../models/Product');
  
  const product = await Product.findOne({ 
    _id: item.product, 
    tenantId 
  });
  
  if (!product) return;

  // ── BATCH FIND OR CREATE ──
  const batchNo = item.batch || '';
  const existingBatchIdx = batchNo 
    ? product.batches.findIndex(b => b.batchNo === batchNo && b.supplier === supplier)
    : -1;

  if (stockMode === 'set') {
    // Opening stock mode — replace batch qty
    if (existingBatchIdx >= 0) {
      product.batches[existingBatchIdx].qty = item.qty;
      product.batches[existingBatchIdx].mrp = item.mrp || product.batches[existingBatchIdx].mrp;
      product.batches[existingBatchIdx].purchasePrice = item.purchasePrice;
      product.batches[existingBatchIdx].salePrice = item.salePrice || item.mrp;
    } else {
      product.batches.push({
        batchNo:       batchNo,
        supplier:      supplier,
        mrp:           item.mrp || 0,
        purchasePrice: item.purchasePrice || 0,
        salePrice:     item.salePrice || item.mrp || 0,
        qty:           item.qty || 0,
        expiry:        item.expiry || '',
        gst:           item.gst || 0,
        hsnCode:       item.hsnCode || product.hsnCode || '',
        discount:      item.discount || 0,
        addedDate:     new Date()
      });
    }
  } else {
    // Add mode (new purchase) — add qty to batch
    if (existingBatchIdx >= 0) {
      // Same batch, same supplier — add qty
      product.batches[existingBatchIdx].qty += (item.qty || 0);
      // Update price if changed
      product.batches[existingBatchIdx].purchasePrice = item.purchasePrice || product.batches[existingBatchIdx].purchasePrice;
      product.batches[existingBatchIdx].mrp = item.mrp || product.batches[existingBatchIdx].mrp;
      product.batches[existingBatchIdx].salePrice = item.salePrice || item.mrp || product.batches[existingBatchIdx].salePrice;
    } else {
      // New batch or new supplier — add new batch entry
      product.batches.push({
        batchNo:       batchNo,
        supplier:      supplier,
        mrp:           item.mrp || 0,
        purchasePrice: item.purchasePrice || 0,
        salePrice:     item.salePrice || item.mrp || 0,
        qty:           item.qty || 0,
        expiry:        item.expiry || '',
        gst:           item.gst || 0,
        hsnCode:       item.hsnCode || product.hsnCode || '',
        discount:      item.discount || 0,
        addedDate:     new Date()
      });
    }
  }

  // ── REMOVE EMPTY BATCHES ──
  product.batches = product.batches.filter(b => b.qty > 0);

  // ── RECALCULATE TOTAL STOCK ──
  product.stock = product.batches.reduce((sum, b) => sum + (b.qty || 0), 0);

  // ── UPDATE PRODUCT WITH LATEST BATCH VALUES ──
  // Sort batches: latest added first, expiry ascending (FIFO)
  product.batches.sort((a, b) => {
    // Sort by expiry date ascending (earliest expiry first for FIFO)
    if (a.expiry && b.expiry) {
      const dateA = parseExpiry(a.expiry);
      const dateB = parseExpiry(b.expiry);
      return dateA - dateB;
    }
    return new Date(a.addedDate) - new Date(b.addedDate);
  });

  // Update product's current values with LATEST batch
  const latestBatch = product.batches[product.batches.length - 1];
  if (latestBatch) {
    product.mrp = latestBatch.mrp;
    product.purchasePrice = latestBatch.purchasePrice;
    product.salePrice = latestBatch.salePrice;
    product.batch = latestBatch.batchNo;
    product.expiry = latestBatch.expiry;
  }

  await product.save();
  return product;
}

// Helper: parse MM/YY to Date
function parseExpiry(mmyy) {
  if (!mmyy) return new Date('9999-12-31');
  const parts = mmyy.split('/');
  if (parts.length < 2) return new Date('9999-12-31');
  return new Date(parseInt('20' + parts[1]), parseInt(parts[0]) - 1, 28);
}

// ── STOCK REVERSE (for purchase delete) ──
async function reverseStockBatch(item, supplier, tenantId) {
  const Product = require('../models/Product');
  
  const product = await Product.findOne({ _id: item.product, tenantId });
  if (!product) return;

  const batchNo = item.batch || '';
  const batchIdx = batchNo
    ? product.batches.findIndex(b => b.batchNo === batchNo && b.supplier === supplier)
    : -1;

  if (batchIdx >= 0) {
    product.batches[batchIdx].qty -= (item.qty || 0);
    if (product.batches[batchIdx].qty < 0) product.batches[batchIdx].qty = 0;
  } else {
    // Fallback: reduce from first available batch
    if (product.batches.length > 0) {
      product.batches[0].qty -= (item.qty || 0);
      if (product.batches[0].qty < 0) product.batches[0].qty = 0;
    }
  }

  // Remove empty batches
  product.batches = product.batches.filter(b => b.qty > 0);
  
  // Recalculate total stock
  product.stock = product.batches.reduce((sum, b) => sum + (b.qty || 0), 0);

  // Update product values with first available batch (FIFO)
  if (product.batches.length > 0) {
    const firstBatch = product.batches[0];
    product.mrp = firstBatch.mrp;
    product.purchasePrice = firstBatch.purchasePrice;
    product.salePrice = firstBatch.salePrice;
    product.batch = firstBatch.batchNo;
    product.expiry = firstBatch.expiry;
  }

  await product.save();
}

module.exports = { updateStockWithBatch, reverseStockBatch, parseExpiry };
