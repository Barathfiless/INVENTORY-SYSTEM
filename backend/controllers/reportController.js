import Purchase from '../models/Purchase.js';
import Sale from '../models/Sale.js';
import Order from '../models/Order.js';
import Product from '../models/Product.js';

export const getDashboardStats = async (_req, res) => {
  const [productCount, totalStock, purchases, sales, orders, lowStockCount] = await Promise.all([
    Product.countDocuments(),
    Product.aggregate([{ $group: { _id: null, total: { $sum: '$stock' } } }]),
    Purchase.aggregate([{ $group: { _id: null, total: { $sum: '$totalCost' }, count: { $sum: 1 } } }]),
    Sale.aggregate([{ $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } }]),
    Order.countDocuments(),
    Product.countDocuments({ $expr: { $lte: ['$stock', '$lowStockThreshold'] } }),
  ]);

  const inventoryValue = await Product.aggregate([
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
    orderCount: orders,
    lowStockCount,
  });
};

export const getReports = async (req, res) => {
  const { startDate, endDate } = req.query;
  const dateFilter = {};
  if (startDate || endDate) {
    dateFilter.createdAt = {};
    if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
    if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
  }

  const [purchases, sales, orders, topProducts] = await Promise.all([
    Purchase.find(dateFilter).populate('product', 'name sku').sort({ createdAt: -1 }),
    Sale.find(dateFilter).populate('product', 'name sku').sort({ createdAt: -1 }),
    Order.find(dateFilter).populate('user', 'name').sort({ createdAt: -1 }),
    Sale.aggregate([
      { $match: dateFilter.createdAt ? { createdAt: dateFilter.createdAt } : {} },
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

  const purchaseTotal = purchases.reduce((s, p) => s + p.totalCost, 0);
  const saleTotal = sales.reduce((s, s2) => s + s2.totalAmount, 0);
  const orderTotal = orders.reduce((s, o) => s + o.totalPrice, 0);

  res.json({
    purchases,
    sales,
    orders,
    topProducts,
    summary: {
      purchaseTotal,
      purchaseCount: purchases.length,
      saleTotal,
      saleCount: sales.length,
      orderTotal,
      orderCount: orders.length,
      profit: saleTotal - purchaseTotal,
    },
  });
};
