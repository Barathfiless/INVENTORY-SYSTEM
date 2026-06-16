const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config({ path: 'd:/StockSync/backend/.env' });

const userSchema = new mongoose.Schema({
  name: String,
  email: String,
  role: String
}, { collection: 'users' });

const User = mongoose.model('User', userSchema);

async function run() {
  const uri = process.env.MONGODB_URI;
  console.log('Connecting to:', uri);
  await mongoose.connect(uri);
  console.log('Connected.');
  
  const users = await User.find({});
  console.log('Users in DB:');
  console.log(JSON.stringify(users, null, 2));
  
  await mongoose.connection.close();
}

run().catch(console.error);
