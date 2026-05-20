import Order from '../models/Order.js';
import Product from '../models/Product.js';
import Sale from '../models/Sale.js';

const calcPrices = (items) => {
  const itemsPrice = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const shippingPrice = itemsPrice > 499 ? 0 : 49;
  const taxPrice = Math.round(itemsPrice * 0.18 * 100) / 100;
  const totalPrice = itemsPrice + shippingPrice + taxPrice;
  return { itemsPrice, shippingPrice, taxPrice, totalPrice };
};

export const createOrder = async (req, res) => {
  const { orderItems, shippingAddress, paymentMethod } = req.body;
  if (!orderItems?.length) {
    return res.status(400).json({ message: 'No order items' });
  }

  for (const item of orderItems) {
    const product = await Product.findById(item.product);
    if (!product) return res.status(404).json({ message: `Product not found: ${item.product}` });
    if (product.stock < item.quantity) {
      return res.status(400).json({
        message: `Insufficient stock for ${product.name}. Available: ${product.stock}`,
      });
    }
  }

  const enrichedItems = await Promise.all(
    orderItems.map(async (item) => {
      const product = await Product.findById(item.product);
      return {
        product: product._id,
        name: product.name,
        image: product.image,
        quantity: item.quantity,
        price: product.price,
      };
    })
  );

  const prices = calcPrices(enrichedItems);
  const order = await Order.create({
    user: req.user._id,
    orderItems: enrichedItems,
    shippingAddress,
    paymentMethod: paymentMethod || 'COD',
    ...prices,
  });

  for (const item of enrichedItems) {
    const product = await Product.findById(item.product);
    product.stock -= item.quantity;
    await product.save();
    await Sale.create({
      product: item.product,
      quantity: item.quantity,
      unitPrice: item.price,
      totalAmount: item.price * item.quantity,
      channel: 'ecommerce',
      order: order._id,
      createdBy: req.user._id,
    });
  }

  const populated = await Order.findById(order._id).populate('user', 'name email');
  res.status(201).json(populated);
};

export const getMyOrders = async (req, res) => {
  const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json(orders);
};

export const getOrderById = async (req, res) => {
  const order = await Order.findById(req.params.id).populate('user', 'name email');
  if (!order) return res.status(404).json({ message: 'Order not found' });
  if (req.user.role !== 'admin' && order.user._id.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'Not authorized' });
  }
  res.json(order);
};

export const getAllOrders = async (_req, res) => {
  const orders = await Order.find().populate('user', 'name email').sort({ createdAt: -1 });
  res.json(orders);
};

export const updateOrderStatus = async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: 'Order not found' });
  order.status = req.body.status || order.status;
  if (req.body.isPaid) {
    order.isPaid = true;
    order.paidAt = Date.now();
  }
  if (req.body.isDelivered) {
    order.isDelivered = true;
    order.deliveredAt = Date.now();
    order.status = 'delivered';
  }
  const updated = await order.save();
  res.json(updated);
};
