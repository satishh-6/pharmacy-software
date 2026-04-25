const express = require('express');
const router = express.Router();
const Prescription = require('../models/Prescription');
const Customer = require('../models/Customer');

// Get all
router.get('/', async (req, res) => {
  try {
    const { status, doctor, from, to } = req.query;
    let filter = {};
    if (status) filter.status = status;
    if (doctor) filter.doctorName = { $regex: doctor, $options: 'i' };
    if (from && to) filter.prescriptionDate = { $gte: new Date(from), $lte: new Date(to+'T23:59:59') };
    const prescriptions = await Prescription.find(filter).sort({ createdAt: -1 });
    res.json(prescriptions);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Search
router.get('/search', async (req, res) => {
  try {
    const q = req.query.q;
    const prescriptions = await Prescription.find({
      $or: [
        { patient: { $regex: q, $options: 'i' } },
        { patientPhone: { $regex: q, $options: 'i' } },
        { doctorName: { $regex: q, $options: 'i' } }
      ]
    }).sort({ createdAt: -1 }).limit(20);
    res.json(prescriptions);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Get single
router.get('/:id', async (req, res) => {
  try {
    const prescription = await Prescription.findById(req.params.id);
    if (!prescription) return res.status(404).json({ message: 'Not found' });
    res.json(prescription);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// Create
router.post('/', async (req, res) => {
  try {
    // Auto set validity — 30 days default
    if (!req.body.validTill) {
      const valid = new Date(req.body.prescriptionDate || new Date());
      valid.setDate(valid.getDate() + 30);
      req.body.validTill = valid;
    }

    // Link customer if phone matches
    if (req.body.patientPhone) {
      const customer = await Customer.findOne({ phone: req.body.patientPhone });
      if (customer) req.body.customerId = customer._id;
    }

    const prescription = new Prescription(req.body);
    await prescription.save();
    res.json({ success: true, prescription });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
});

// Update
router.put('/:id', async (req, res) => {
  try {
    const prescription = await Prescription.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, prescription });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
});

// Dispense — medicines dene ke baad status update
router.patch('/:id/dispense', async (req, res) => {
  try {
    const { medicines, billNo, billId } = req.body;
    const prescription = await Prescription.findById(req.params.id);
    if (!prescription) return res.status(404).json({ message: 'Not found' });

    // Update each medicine dispensed status
    prescription.medicines = prescription.medicines.map((med, i) => {
      const dispensed = medicines.find(m => m.index === i);
      if (dispensed) {
        med.dispensed = true;
        med.dispensedQty = dispensed.qty;
      }
      return med;
    });

    // Check overall status
    const allDispensed = prescription.medicines.every(m => m.dispensed);
    const anyDispensed = prescription.medicines.some(m => m.dispensed);
    prescription.status = allDispensed ? 'dispensed' : anyDispensed ? 'partial' : 'pending';

    if (billNo) { prescription.billNo = billNo; prescription.refillCount += 1; }
    if (billId) prescription.billId = billId;

    await prescription.save();
    res.json({ success: true, prescription });
  } catch (err) { res.status(400).json({ success: false, message: err.message }); }
});

// Delete
router.delete('/:id', async (req, res) => {
  try {
    await Prescription.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;