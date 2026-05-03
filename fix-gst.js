require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const Product = require('./models/Product');
  
  const gstValues = await Product.aggregate([
    { $group: { _id: "$gst", count: { $sum: 1 } } },
    { $sort: { _id: 1 } }
  ]);
  console.log('GST distribution:', gstValues);
  process.exit();
}).catch(e => { console.log(e); process.exit(); });