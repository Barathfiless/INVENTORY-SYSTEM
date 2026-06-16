import mongoose from 'mongoose';
import dotenv from 'dotenv';
import './models/Order.js';

dotenv.config();

async function run() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/stocksync';
  await mongoose.connect(uri);
  const Order = mongoose.model('Order');
  const order = await Order.findOne({}).sort({ createdAt: -1 });
  if (order) {
    console.log('ORDER_ID:', order._id.toString());
  } else {
    console.log('NO_ORDERS_FOUND');
  }
  await mongoose.disconnect();
}

run().catch(console.error);
