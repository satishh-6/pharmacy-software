require('dotenv').config();
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const Product = require('./models/Product');
  
  // dawazone ke products
  const dawazone = await Product.find({tenantId: 'dawazone-033394'});
  console.log('DawaZone products:', dawazone.length, dawazone.map(p=>p.name));
  
  // india-dawa ke products  
  const india = await Product.find({tenantId: 'india-dawa-126716'});
  console.log('India Dawa products:', india.length, india.map(p=>p.name));
  
  // medxpert ke products
  const medxpert = await Product.find({tenantId: 'medxpert-pharmacy-872200'});
  console.log('MedXpert products:', medxpert.length, medxpert.map(p=>p.name));
  
  process.exit();
}).catch(e => { console.log(e.message); process.exit(); });