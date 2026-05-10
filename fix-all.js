require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://pharmacyadmin:MedXpertadmin@pharmacy-db.mpam1i3.mongodb.net/pharmacy').then(async () => {
  console.log('✅ Connected to MongoDB\n');

  // Load models
  const Tenant = require('./models/Tenant');
  const SuperAdmin = require('./models/SuperAdmin');
  const Product = require('./models/Product');
  const Sale = require('./models/Sale');
  const Purchase = require('./models/Purchase');
  const Customer = require('./models/Customer');

  // ── 1. CHECK EXISTING DATA ──
  const totalProducts = await Product.countDocuments();
  const totalSales = await Sale.countDocuments();
  const totalCustomers = await Customer.countDocuments();
  const totalPurchases = await Purchase.countDocuments();
  console.log('=== EXISTING DATA ===');
  console.log('Products:', totalProducts);
  console.log('Sales:', totalSales);
  console.log('Customers:', totalCustomers);
  console.log('Purchases:', totalPurchases);

  // ── 2. CHECK TENANTS ──
  const tenants = await Tenant.find({}).select('pharmacyName ownerName email tenantId plan isActive');
  console.log('\n=== TENANTS ===');
  tenants.forEach(t => {
    console.log(`Pharmacy: ${t.pharmacyName}`);
    console.log(`Email: ${t.email}`);
    console.log(`Tenant ID: ${t.tenantId}`);
    console.log(`Plan: ${t.plan} | Active: ${t.isActive}`);
    console.log('---');
  });

  // ── 3. CHECK SUPER ADMIN ──
  const admins = await SuperAdmin.find({}).select('name email');
  console.log('\n=== SUPER ADMIN ===');
  admins.forEach(a => console.log(`Email: ${a.email} | Name: ${a.name}`));

  // ── 4. MIGRATE ALL EXISTING DATA TO MEDXPERT TENANT ──
  const TENANT_ID = 'medxpert-pharmacy-872200';
  
  // Check karo kya data migrate hua hai ya nahi
  const unmigrated = await Product.countDocuments({ tenantId: { $exists: false } });
  const migratedAlready = await Product.countDocuments({ tenantId: TENANT_ID });
  console.log(`\n=== DATA MIGRATION ===`);
  console.log(`Unmigrated products: ${unmigrated}`);
  console.log(`Already migrated products: ${migratedAlready}`);

  if (unmigrated > 0) {
    const r1 = await Product.updateMany({ tenantId: { $exists: false } }, { $set: { tenantId: TENANT_ID } });
    const r2 = await Sale.updateMany({ tenantId: { $exists: false } }, { $set: { tenantId: TENANT_ID } });
    const r3 = await Purchase.updateMany({ tenantId: { $exists: false } }, { $set: { tenantId: TENANT_ID } });
    const r4 = await Customer.updateMany({ tenantId: { $exists: false } }, { $set: { tenantId: TENANT_ID } });
    console.log(`✅ Products migrated: ${r1.modifiedCount}`);
    console.log(`✅ Sales migrated: ${r2.modifiedCount}`);
    console.log(`✅ Purchases migrated: ${r3.modifiedCount}`);
    console.log(`✅ Customers migrated: ${r4.modifiedCount}`);
  } else {
    console.log('All data already migrated or no data exists');
  }

  // ── 5. RESET PASSWORDS ──
  // Super Admin password reset
  const saPass = await bcrypt.hash('SuperAdmin@123', 10);
  await SuperAdmin.updateOne({ email: 'satish@dawahisaab.com' }, { $set: { password: saPass } });
  console.log('\n=== PASSWORDS RESET ===');
  console.log('Super Admin: satish@dawahisaab.com / SuperAdmin@123');

  // MedXpert tenant password reset
  const tenantPass = await bcrypt.hash('MedXpert@123', 10);
  await Tenant.updateOne({ tenantId: TENANT_ID }, { $set: { password: tenantPass } });
  console.log('MedXpert Tenant: satish@medxpert.com / MedXpert@123');

  // ── 6. ENSURE MEDXPERT TENANT EXISTS ──
  const medxpert = await Tenant.findOne({ tenantId: TENANT_ID });
  if (!medxpert) {
    console.log('\n⚠️ MedXpert tenant not found! Creating...');
    const hashed = await bcrypt.hash('MedXpert@123', 10);
    const t = new Tenant({
      pharmacyName: 'MedXpert Pharmacy',
      ownerName: 'Satish Tiwari',
      email: 'satish@medxpert.com',
      phone: '7620184623',
      password: hashed,
      plan: 'enterprise',
      subscriptionEnd: new Date('2099-12-31'),
      settings: {
        pharmacyName: 'MedXpert Pharmacy',
        phone: '7620184623',
        billType: 'Retail Invoice',
        footer: 'Thank you! Get well soon.'
      }
    });
    // Force tenantId
    t.tenantId = TENANT_ID;
    await t.save();
    console.log('✅ MedXpert tenant created!');
    
    // Migrate data now
    await Product.updateMany({ tenantId: { $exists: false } }, { $set: { tenantId: TENANT_ID } });
    await Sale.updateMany({ tenantId: { $exists: false } }, { $set: { tenantId: TENANT_ID } });
    await Purchase.updateMany({ tenantId: { $exists: false } }, { $set: { tenantId: TENANT_ID } });
    await Customer.updateMany({ tenantId: { $exists: false } }, { $set: { tenantId: TENANT_ID } });
  } else {
    console.log('\n✅ MedXpert tenant exists:', medxpert.email);
  }

  console.log('\n🎉 ALL DONE! Summary:');
  console.log('================================');
  console.log('SUPER ADMIN LOGIN:');
  console.log('  URL: /superadmin');
  console.log('  Email: satish@dawahisaab.com');
  console.log('  Password: SuperAdmin@123');
  console.log('--------------------------------');
  console.log('MEDXPERT PHARMACY LOGIN:');
  console.log('  URL: /index.html (or /billing.html)');
  console.log('  Email: satish@medxpert.com');
  console.log('  Password: MedXpert@123');
  console.log('================================');
  
  process.exit(0);
}).catch(e => {
  console.log('❌ Error:', e.message);
  process.exit(1);
});
