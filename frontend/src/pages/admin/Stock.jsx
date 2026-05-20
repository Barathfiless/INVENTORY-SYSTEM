import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { productAPI } from '../../api/api';
import { formatCurrency } from '../../utils/format';

function StockStatus({ stock, threshold }) {
  if (stock === 0) return <span className="status-badge status-out">Out</span>;
  if (stock <= threshold) {
    return (
      <span className="status-badge status-low">
        <AlertTriangle size={14} aria-hidden />
        Low
      </span>
    );
  }
  return <span className="status-badge status-ok">OK</span>;
}

export default function Stock() {
  const [data, setData] = useState(null);

  useEffect(() => {
    productAPI.getStock().then(({ data: d }) => setData(d));
  }, []);

  if (!data) return <p>Loading stock...</p>;

  return (
    <section className="admin-page">
      <h1>Stock Available</h1>
      <p className="subtitle">Current inventory levels across all products</p>
      <ul className="stats-grid compact">
        <li className="stat-card"><p className="stat-value">{data.totalProducts}</p><p className="stat-label">Products</p></li>
        <li className="stat-card"><p className="stat-value">{data.totalStock}</p><p className="stat-label">Total Units</p></li>
        <li className="stat-card"><p className="stat-value">{formatCurrency(data.totalValue)}</p><p className="stat-label">Inventory Value</p></li>
        <li className="stat-card warn"><p className="stat-value">{data.lowStock.length}</p><p className="stat-label">Low Stock Alerts</p></li>
      </ul>
      {data.lowStock.length > 0 && (
        <aside className="alert warn">
          <strong>Low stock:</strong>{' '}
          {data.lowStock.map((p) => `${p.name} (${p.stock})`).join(', ')}
        </aside>
      )}
      <table className="data-table">
        <thead>
          <tr>
            <th>SKU</th><th>Product</th><th>Category</th><th>Stock</th><th>Threshold</th><th>Cost</th><th>Price</th><th>Status</th>
          </tr>
        </thead>
        <tbody>
          {data.products.map((p) => (
            <tr key={p._id} className={p.stock <= p.lowStockThreshold ? 'row-warn' : ''}>
              <td>{p.sku}</td>
              <td>{p.name}</td>
              <td>{p.category}</td>
              <td><strong>{p.stock}</strong></td>
              <td>{p.lowStockThreshold}</td>
              <td>{formatCurrency(p.costPrice)}</td>
              <td>{formatCurrency(p.price)}</td>
              <td><StockStatus stock={p.stock} threshold={p.lowStockThreshold} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
