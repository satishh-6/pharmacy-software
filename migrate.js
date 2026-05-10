require('dotenv').config();
const mongoose = require('mongoose');

const MEDXPERT_TENANT_ID = 'medxpert-pharmacy-872200';

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  console.log('Connected! Migrating...');

  const Product = require('./models/Product');
  const Sale = require('./models/Sale');
  const Purchase = require('./models/Purchase');
  const Customer = require('./models/Customer');
  const Prescription = require('./models/Prescription');

  const p = await Product.updateMany(
    { tenantId: { $exists: false } },
    { $set: { tenantId: MEDXPERT_TENANT_ID } }
  );
  console.log('✅ Products migrated:', p.modifiedCount);

  const s = await Sale.updateMany(
    { tenantId: { $exists: false } },
    { $set: { tenantId: MEDXPERT_TENANT_ID } }
  );
  console.log('✅ Sales migrated:', s.modifiedCount);

  const pu = await Purchase.updateMany(
    { tenantId: { $exists: false } },
    { $set: { tenantId: MEDXPERT_TENANT_ID } }
  );
  console.log('✅ Purchases migrated:', pu.modifiedCount);

  const c = await Customer.updateMany(
    { tenantId: { $exists: false } },
    { $set: { tenantId: MEDXPERT_TENANT_ID } }
  );
  console.log('✅ Customers migrated:', c.modifiedCount);

  const pr = await Prescription.updateMany(
    { tenantId: { $exists: false } },
    { $set: { tenantId: MEDXPERT_TENANT_ID } }
  );
  console.log('✅ Prescriptions migrated:', pr.modifiedCount);

  console.log('\n🎉 All data migrated to MedXpert tenant!');
  process.exit();
}).catch(e => {
  console.log('Error:', e.message);
  process.exit();
});