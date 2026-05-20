import Purchase from '../models/Purchase.js';
import Product from '../models/Product.js';
import User from '../models/User.js';

export const getPurchases = async (req, res) => {
  const { startDate, endDate } = req.query;
  const filter = {};
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) filter.createdAt.$lte = new Date(endDate);
  }
  const purchases = await Purchase.find(filter)
    .populate('product', 'name sku image category isActive')
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

export const deletePurchase = async (req, res) => {
  try {
    const { password } = req.body;
    
    // Verify password
    if (!password) {
      return res.status(400).json({ message: 'Password is required' });
    }

    // Get the current user and check password
    const user = await User.findById(req.user._id).select('+password');
    const isPasswordValid = await user.matchPassword(password);
    
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid password' });
    }

    // Find and delete the purchase
    const purchase = await Purchase.findById(req.params.id);
    if (!purchase) {
      return res.status(404).json({ message: 'Purchase not found' });
    }

    // Update product stock (reduce by purchase quantity)
    const product = await Product.findById(purchase.product);
    if (product) {
      product.stock -= purchase.quantity;
      if (product.stock < 0) product.stock = 0; // Prevent negative stock
      await product.save();
    }

    // Delete the purchase
    await Purchase.findByIdAndDelete(req.params.id);

    res.json({ message: 'Purchase deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
