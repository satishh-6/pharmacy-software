require('dotenv').config();
const mongoose = require('mongoose');

const TENANT_ID = '69f85ae0efdd63ad1a1cb387'; // ← Step 1 se

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const Product = require('./models/Product');
  const Sale = require('./models/Sale');
  const Purchase = require('./models/Purchase');
  const Customer = require('./models/Customer');

  const p = await Product.updateMany({ tenantId: { $exists: false } }, { $set: { tenantId: TENANT_ID } });
  console.log('Products updated:', p.modifiedCount);

  const s = await Sale.updateMany({ tenantId: { $exists: false } }, { $set: { tenantId: TENANT_ID } });
  console.log('Sales updated:', s.modifiedCount);

  const pu = await Purchase.updateMany({ tenantId: { $exists: false } }, { $set: { tenantId: TENANT_ID } });
  console.log('Purchases updated:', pu.modifiedCount);

  const c = await Customer.updateMany({ tenantId: { $exists: false } }, { $set: { tenantId: TENANT_ID } });
  console.log('Customers updated:', c.modifiedCount);

  console.log('✅ Migration complete!');
  process.exit();
}).catch(e => { console.log(e); process.exit(); });