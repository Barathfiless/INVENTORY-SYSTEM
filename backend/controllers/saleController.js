import Sale from '../models/Sale.js';
import Product from '../models/Product.js';

export const getSales = async (req, res) => {
  const { startDate, endDate, channel } = req.query;
  const filter = {};
  if (channel) filter.channel = channel;
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) filter.createdAt.$lte = new Date(endDate);
  }
  const sales = await Sale.find(filter)
    .populate('product', 'name sku')
    .populate('createdBy', 'name')
    .sort({ createdAt: -1 });
  res.json(sales);
};

export const createSale = async (req, res) => {
  const { productId, quantity, unitPrice, customerName, notes } = req.body;
  const product = await Product.findById(productId);
  if (!product) return res.status(404).json({ message: 'Product not found' });
  if (product.stock < quantity) {
    return res.status(400).json({ message: `Insufficient stock. Available: ${product.stock}` });
  }

  const totalAmount = quantity * unitPrice;
  const sale = await Sale.create({
    product: productId,
    quantity,
    unitPrice,
    totalAmount,
    channel: 'inventory',
    customerName,
    notes,
    createdBy: req.user._id,
  });

  product.stock -= quantity;
  await product.save();

  const populated = await Sale.findById(sale._id)
    .populate('product', 'name sku stock')
    .populate('createdBy', 'name');
  res.status(201).json(populated);
};
