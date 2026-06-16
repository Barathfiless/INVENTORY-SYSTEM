import Product from '../models/Product.js';
import User from '../models/User.js';
import asyncHandler from '../middleware/asyncHandler.js';

export const getProducts = asyncHandler(async (req, res) => {
  const { category, search, featured, minPrice, maxPrice, sort } = req.query;
  const filter = { isActive: true, stock: { $gt: 0 } };
  if (category && category !== 'all') filter.category = new RegExp(category, 'i');
  if (featured === 'true') {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);
    filter.createdAt = { $gte: startOfToday, $lte: endOfToday };
  }
  if (search) {
    filter.$or = [
      { name: new RegExp(search, 'i') },
      { description: new RegExp(search, 'i') },
      { brand: new RegExp(search, 'i') },
    ];
  }
  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
  }
  let query = Product.find(filter);
  if (sort === 'price-asc') query = query.sort({ price: 1 });
  else if (sort === 'price-desc') query = query.sort({ price: -1 });
  else if (sort === 'rating') query = query.sort({ rating: -1 });
  else query = query.sort({ createdAt: -1 });
  const products = await query;
  res.json(products);
});

export const getAllProductsAdmin = asyncHandler(async (req, res) => {
  const products = await Product.find({ createdBy: req.user._id }).sort({ createdAt: -1 });
  res.json(products);
});

export const getProductById = asyncHandler(async (req, res) => {
  const product = await Product.findOne({ _id: req.params.id, isActive: true }).populate('createdBy', 'name');
  if (!product) return res.status(404).json({ message: 'Product not found' });
  res.json(product);
});

export const createProduct = asyncHandler(async (req, res) => {
  const productData = { ...req.body, createdBy: req.user._id };
  const product = await Product.create(productData);
  res.status(201).json(product);
});

export const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findOneAndUpdate(
    { _id: req.params.id, createdBy: req.user._id },
    req.body,
    {
      new: true,
      runValidators: true,
    }
  );
  if (!product) return res.status(404).json({ message: 'Product not found or not authorized' });
  res.json(product);
});

export const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findOneAndDelete({ _id: req.params.id, createdBy: req.user._id });
  if (!product) return res.status(404).json({ message: 'Product not found or not authorized' });
  res.json({ message: 'Product removed' });
});

export const getCategories = asyncHandler(async (_req, res) => {
  const categories = await Product.distinct('category', { isActive: true, stock: { $gt: 0 } });
  res.json(categories);
});

export const getStockSummary = asyncHandler(async (req, res) => {
  const products = await Product.find({ createdBy: req.user._id }).select('name sku stock price costPrice lowStockThreshold category');
  const totalProducts = products.length;
  const totalStock = products.reduce((sum, p) => sum + p.stock, 0);
  const totalValue = products.reduce((sum, p) => sum + p.stock * p.costPrice, 0);
  const lowStock = products.filter((p) => p.stock <= p.lowStockThreshold);
  res.json({ products, totalProducts, totalStock, totalValue, lowStock });
});

export const clearStock = asyncHandler(async (req, res) => {
  const { password } = req.body;
  if (!password) {
    return res.status(400).json({ message: 'Password is required' });
  }

  // Verify password
  const user = await User.findById(req.user._id).select('+password');
  const isPasswordValid = await user.matchPassword(password);
  if (!isPasswordValid) {
    return res.status(401).json({ message: 'Invalid password' });
  }

  // Update all products belonging to this admin: set stock to 0
  await Product.updateMany(
    { createdBy: req.user._id },
    { $set: { stock: 0 } }
  );

  res.json({ message: 'All stock levels cleared successfully' });
});
