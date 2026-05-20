import Product from '../models/Product.js';

export const getProducts = async (req, res) => {
  const { category, search, featured, minPrice, maxPrice, sort } = req.query;
  const filter = { isActive: true };
  if (category && category !== 'all') filter.category = new RegExp(category, 'i');
  if (featured === 'true') filter.featured = true;
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
};

export const getAllProductsAdmin = async (req, res) => {
  const products = await Product.find().sort({ createdAt: -1 });
  res.json(products);
};

export const getProductById = async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ message: 'Product not found' });
  res.json(product);
};

export const createProduct = async (req, res) => {
  const product = await Product.create(req.body);
  res.status(201).json(product);
};

export const updateProduct = async (req, res) => {
  const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!product) return res.status(404).json({ message: 'Product not found' });
  res.json(product);
};

export const deleteProduct = async (req, res) => {
  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) return res.status(404).json({ message: 'Product not found' });
  res.json({ message: 'Product removed' });
};

export const getCategories = async (_req, res) => {
  const categories = await Product.distinct('category', { isActive: true });
  res.json(categories);
};

export const getStockSummary = async (_req, res) => {
  const products = await Product.find().select('name sku stock price costPrice lowStockThreshold category');
  const totalProducts = products.length;
  const totalStock = products.reduce((sum, p) => sum + p.stock, 0);
  const totalValue = products.reduce((sum, p) => sum + p.stock * p.costPrice, 0);
  const lowStock = products.filter((p) => p.stock <= p.lowStockThreshold);
  res.json({ products, totalProducts, totalStock, totalValue, lowStock });
};
