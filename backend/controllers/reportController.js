import Purchase from '../models/Purchase.js';
import Sale from '../models/Sale.js';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import asyncHandler from '../middleware/asyncHandler.js';

export const getDashboardStats = asyncHandler(async (req, res) => {
  const myProducts = await Product.find({ createdBy: req.user._id }).select('_id');
  const myProductIds = myProducts.map(p => p._id);

  const [productCount, totalStock, purchases, sales, ordersCount, lowStockCount] = await Promise.all([
    Product.countDocuments({ createdBy: req.user._id }),
    Product.aggregate([
      { $match: { createdBy: req.user._id } },
      { $group: { _id: null, total: { $sum: '$stock' } } }
    ]),
    Purchase.aggregate([
      { $match: { createdBy: req.user._id } },
      { $group: { _id: null, total: { $sum: '$totalCost' }, count: { $sum: 1 } } }
    ]),
    Sale.aggregate([
      { $match: { createdBy: req.user._id } },
      { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } }
    ]),
    Order.countDocuments({ 'orderItems.product': { $in: myProductIds } }),
    Product.countDocuments({ createdBy: req.user._id, $expr: { $lte: ['$stock', '$lowStockThreshold'] } }),
  ]);

  const inventoryValue = await Product.aggregate([
    { $match: { createdBy: req.user._id } },
    { $group: { _id: null, value: { $sum: { $multiply: ['$stock', '$costPrice'] } } } },
  ]);

  res.json({
    productCount,
    totalStock: totalStock[0]?.total || 0,
    inventoryValue: inventoryValue[0]?.value || 0,
    totalPurchases: purchases[0]?.total || 0,
    purchaseCount: purchases[0]?.count || 0,
    totalSales: sales[0]?.total || 0,
    saleCount: sales[0]?.count || 0,
    orderCount: ordersCount,
    lowStockCount,
    profit: Math.max(0, (sales[0]?.total || 0) - (purchases[0]?.total || 0)),
    loss: Math.max(0, (purchases[0]?.total || 0) - (sales[0]?.total || 0)),
  });
});

const localCalcPrices = (items) => {
  const itemsPrice = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const shippingPrice = itemsPrice > 499 ? 0 : 49;
  const taxPrice = Math.round(itemsPrice * 0.18 * 100) / 100;
  const totalPrice = itemsPrice + shippingPrice + taxPrice;
  return { itemsPrice, shippingPrice, taxPrice, totalPrice };
};

export const getReports = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  const dateFilter = {};
  if (startDate || endDate) {
    dateFilter.createdAt = {};
    if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
    if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
  }

  const myProducts = await Product.find({ createdBy: req.user._id }).select('_id');
  const myProductIds = myProducts.map(p => p._id);

  // Build match filters
  const purchaseMatch = { createdBy: req.user._id };
  const saleMatch = { createdBy: req.user._id };
  const orderMatch = { 'orderItems.product': { $in: myProductIds } };

  if (dateFilter.createdAt) {
    purchaseMatch.createdAt = dateFilter.createdAt;
    saleMatch.createdAt = dateFilter.createdAt;
    orderMatch.createdAt = dateFilter.createdAt;
  }

  const [purchases, sales, orders, topProducts] = await Promise.all([
    Purchase.find(purchaseMatch).populate('product', 'name sku').sort({ createdAt: -1 }),
    Sale.find(saleMatch).populate('product', 'name sku').sort({ createdAt: -1 }),
    Order.find(orderMatch).populate('user', 'name').sort({ createdAt: -1 }),
    Sale.aggregate([
      { $match: { createdBy: req.user._id, ...(dateFilter.createdAt ? { createdAt: dateFilter.createdAt } : {}) } },
      { $group: { _id: '$product', totalQty: { $sum: '$quantity' }, revenue: { $sum: '$totalAmount' } } },
      { $sort: { revenue: -1 } },
      { $limit: 10 },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product',
        },
      },
      { $unwind: '$product' },
      { $project: { name: '$product.name', totalQty: 1, revenue: 1 } },
    ]),
  ]);

  // For the orders retrieved, let's filter orderItems to only include this admin's products
  const filteredOrders = orders.map(order => {
    const orderObj = order.toObject();
    orderObj.orderItems = orderObj.orderItems.filter(item => 
      myProductIds.map(id => id.toString()).includes(item.product.toString())
    );
    const subtotal = orderObj.orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    orderObj.itemsPrice = subtotal;
    const prices = localCalcPrices(orderObj.orderItems);
    orderObj.shippingPrice = prices.shippingPrice;
    orderObj.taxPrice = prices.taxPrice;
    orderObj.totalPrice = prices.totalPrice;
    return orderObj;
  });

  const purchaseTotal = purchases.reduce((s, p) => s + p.totalCost, 0);
  const saleTotal = sales.reduce((s, s2) => s + s2.totalAmount, 0);
  const orderTotal = filteredOrders.reduce((s, o) => s + o.totalPrice, 0);

  res.json({
    purchases,
    sales,
    orders: filteredOrders,
    topProducts,
    summary: {
      purchaseTotal,
      purchaseCount: purchases.length,
      saleTotal,
      saleCount: sales.length,
      orderTotal,
      orderCount: filteredOrders.length,
      profit: saleTotal - purchaseTotal,
    },
  });
});
