import Purchase from '../models/Purchase.js';
import Product from '../models/Product.js';

export const getPurchases = async (req, res) => {
  const { startDate, endDate } = req.query;
  const filter = {};
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) filter.createdAt.$lte = new Date(endDate);
  }
  const purchases = await Purchase.find(filter)
    .populate('product', 'name sku')
    .populate('createdBy', 'name')
    .sort({ createdAt: -1 });
  res.json(purchases);
};

export const createPurchase = async (req, res) => {
  const { productId, quantity, unitCost, supplier, invoiceNumber, notes } = req.body;
  const product = await Product.findById(productId);
  if (!product) return res.status(404).json({ message: 'Product not found' });

  const totalCost = quantity * unitCost;
  const purchase = await Purchase.create({
    product: productId,
    quantity,
    unitCost,
    totalCost,
    supplier,
    invoiceNumber,
    notes,
    createdBy: req.user._id,
  });

  product.stock += quantity;
  product.costPrice = unitCost;
  await product.save();

  const populated = await Purchase.findById(purchase._id)
    .populate('product', 'name sku stock')
    .populate('createdBy', 'name');
  res.status(201).json(populated);
};
