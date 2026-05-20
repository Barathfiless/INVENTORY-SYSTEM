import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Product from '../models/Product.js';

dotenv.config();

const products = [
  {
    name: 'Wireless Bluetooth Headphones',
    description: 'Premium noise-cancelling over-ear headphones with 30hr battery life.',
    sku: 'WBH-001',
    category: 'Electronics',
    brand: 'SoundMax',
    price: 2999,
    costPrice: 1800,
    stock: 50,
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400',
    rating: 4.5,
    reviewCount: 128,
    featured: true,
  },
  {
    name: 'Smart Watch Pro',
    description: 'Fitness tracker with heart rate, GPS, and AMOLED display.',
    sku: 'SWP-002',
    category: 'Electronics',
    brand: 'TechFit',
    price: 4999,
    costPrice: 3200,
    stock: 35,
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400',
    rating: 4.3,
    reviewCount: 89,
    featured: true,
  },
  {
    name: 'Organic Cotton T-Shirt',
    description: 'Soft, breathable crew neck tee available in multiple colors.',
    sku: 'OCT-003',
    category: 'Fashion',
    brand: 'EcoWear',
    price: 799,
    costPrice: 350,
    stock: 120,
    image: 'https://images.unsplash.com/photo-1521572163474-6869f9cf17ab?w=400',
    rating: 4.2,
    reviewCount: 256,
    featured: true,
  },
  {
    name: 'Stainless Steel Water Bottle',
    description: '1L insulated bottle keeps drinks cold 24hrs or hot 12hrs.',
    sku: 'SSW-004',
    category: 'Home',
    brand: 'HydroLife',
    price: 1299,
    costPrice: 600,
    stock: 80,
    image: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400',
    rating: 4.6,
    reviewCount: 412,
    featured: false,
  },
  {
    name: 'Running Shoes Ultra',
    description: 'Lightweight mesh running shoes with cushioned sole.',
    sku: 'RSU-005',
    category: 'Sports',
    brand: 'RunFast',
    price: 3499,
    costPrice: 2000,
    stock: 45,
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400',
    rating: 4.4,
    reviewCount: 167,
    featured: true,
  },
  {
    name: 'Laptop Backpack 40L',
    description: 'Water-resistant backpack with padded laptop compartment.',
    sku: 'LBP-006',
    category: 'Accessories',
    brand: 'TravelPro',
    price: 2199,
    costPrice: 1100,
    stock: 60,
    image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400',
    rating: 4.1,
    reviewCount: 93,
    featured: false,
  },
  {
    name: 'Ceramic Coffee Mug Set',
    description: 'Set of 4 handcrafted mugs, microwave and dishwasher safe.',
    sku: 'CCM-007',
    category: 'Home',
    brand: 'HomeCraft',
    price: 999,
    costPrice: 400,
    stock: 8,
    lowStockThreshold: 10,
    image: 'https://images.unsplash.com/photo-1514228742587-6b1558fcca0b?w=400',
    rating: 4.0,
    reviewCount: 54,
    featured: false,
  },
  {
    name: 'Yoga Mat Premium',
    description: 'Non-slip 6mm thick mat with carrying strap.',
    sku: 'YMP-008',
    category: 'Sports',
    brand: 'ZenFit',
    price: 1499,
    costPrice: 700,
    stock: 70,
    image: 'https://images.unsplash.com/photo-1601925260368-ae2f83eb8b70?w=400',
    rating: 4.5,
    reviewCount: 201,
    featured: true,
  },
];

const seed = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/stocksync';
  await mongoose.connect(uri);
  console.log('Connected to MongoDB');

  await User.deleteMany({});
  await Product.deleteMany({});

  await User.create([
    { name: 'Admin User', email: 'admin@stocksync.com', password: 'admin123', role: 'admin' },
    { name: 'John Customer', email: 'customer@stocksync.com', password: 'customer123', role: 'customer' },
  ]);

  await Product.insertMany(products);

  console.log('Seed complete!');
  console.log('Admin: admin@stocksync.com / admin123');
  console.log('Customer: customer@stocksync.com / customer123');
  process.exit(0);
};

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
