require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const Tenant = require('./models/Tenant');
  const SuperAdmin = require('./models/SuperAdmin');

  console.log('\n=== SUPER ADMIN ===');
  const admins = await SuperAdmin.find({}).select('name email');
  admins.forEach(a => console.log(`Email: ${a.email} | Name: ${a.name}`));

  console.log('\n=== TENANTS ===');
  const tenants = await Tenant.find({}).select('pharmacyName ownerName email tenantId plan isActive');
  tenants.forEach(t => console.log(`
  Pharmacy: ${t.pharmacyName}
  Owner: ${t.ownerName}
  Email: ${t.email}
  Tenant ID: ${t.tenantId}
  Plan: ${t.plan}
  Active: ${t.isActive}
  ---`));

  process.exit();
}).catch(e => { console.log(e.message); process.exit(); });