require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const SuperAdmin = require('./models/SuperAdmin');

  const hashed = await bcrypt.hash('Admin@1234', 10);
  await SuperAdmin.updateOne(
    { email: 'satish@dawahisaab.com' },
    { $set: { password: hashed } }
  );
  console.log('✅ Password reset!');
  console.log('Email: satish@dawahisaab.com');
  console.log('Password: Admin@1234');
  process.exit();
}).catch(e => {
  console.log('Error:', e.message);
  process.exit();
});