import Order from '../models/Order.js';
import Product from '../models/Product.js';
import Sale from '../models/Sale.js';
import asyncHandler from '../middleware/asyncHandler.js';

const calcPrices = (items) => {
  const itemsPrice = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const shippingPrice = itemsPrice > 499 ? 0 : 49;
  const taxPrice = Math.round(itemsPrice * 0.18 * 100) / 100;
  const totalPrice = itemsPrice + shippingPrice + taxPrice;
  return { itemsPrice, shippingPrice, taxPrice, totalPrice };
};

export const createOrder = asyncHandler(async (req, res) => {
  const { orderItems, shippingAddress, paymentMethod } = req.body;
  if (!orderItems?.length) {
    return res.status(400).json({ message: 'No order items' });
  }

  for (const item of orderItems) {
    const product = await Product.findById(item.product);
    if (!product || !product.isActive) return res.status(404).json({ message: `Product not found: ${item.product}` });
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
    isPaid: paymentMethod === 'UPI',
    paidAt: paymentMethod === 'UPI' ? Date.now() : undefined,
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
      createdBy: product.createdBy,
    });
  }

  const populated = await Order.findById(order._id).populate('user', 'name email');
  res.status(201).json(populated);
});

export const getMyOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });
  res.json(orders);
});

export const getOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate('user', 'name email');
  if (!order) return res.status(404).json({ message: 'Order not found' });
  if (req.user.role !== 'admin' && order.user._id.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'Not authorized' });
  }

  if (req.user.role === 'admin') {
    const myProducts = await Product.find({
      _id: { $in: order.orderItems.map(item => item.product) },
      createdBy: req.user._id
    }).select('_id');
    const myProductIds = myProducts.map(p => p._id.toString());
    
    if (myProductIds.length === 0) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    const orderObj = order.toObject();
    orderObj.orderItems = orderObj.orderItems.filter(item => 
      myProductIds.includes(item.product.toString())
    );
    const subtotal = orderObj.orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    orderObj.itemsPrice = subtotal;
    const prices = calcPrices(orderObj.orderItems);
    orderObj.shippingPrice = prices.shippingPrice;
    orderObj.taxPrice = prices.taxPrice;
    orderObj.totalPrice = prices.totalPrice;

    return res.json(orderObj);
  }

  res.json(order);
});

export const getAllOrders = asyncHandler(async (req, res) => {
  const myProducts = await Product.find({ createdBy: req.user._id }).select('_id');
  const myProductIds = myProducts.map(p => p._id.toString());

  const orders = await Order.find({ 'orderItems.product': { $in: myProductIds } })
    .populate('user', 'name email')
    .sort({ createdAt: -1 });

  const filteredOrders = orders.map(order => {
    const orderObj = order.toObject();
    orderObj.orderItems = orderObj.orderItems.filter(item => 
      myProductIds.includes(item.product.toString())
    );
    const subtotal = orderObj.orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    orderObj.itemsPrice = subtotal;
    const prices = calcPrices(orderObj.orderItems);
    orderObj.shippingPrice = prices.shippingPrice;
    orderObj.taxPrice = prices.taxPrice;
    orderObj.totalPrice = prices.totalPrice;
    return orderObj;
  });

  res.json(filteredOrders);
});

export const updateOrderStatus = asyncHandler(async (req, res) => {
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
});

export const cancelMyOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) return res.status(404).json({ message: 'Order not found' });

  // Ownership check
  if (order.user.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'Not authorized to cancel this order' });
  }

  // Status check
  if (order.status !== 'pending' && order.status !== 'processing') {
    return res.status(400).json({ message: 'Order cannot be cancelled. Already shipped or delivered.' });
  }

  order.status = 'cancelled';

  // Revert product stocks
  for (const item of order.orderItems) {
    const product = await Product.findById(item.product);
    if (product) {
      product.stock += item.quantity;
      await product.save();
    }
  }

  const updated = await order.save();
  res.json(updated);
});
