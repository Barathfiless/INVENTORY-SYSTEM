import { useEffect, useState } from 'react';
import { AlertTriangle, Package, ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react';
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
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  useEffect(() => {
    productAPI.getStock().then(({ data: d }) => setData(d));
  }, []);

  if (!data) return <p className="page-loading">Loading stock...</p>;

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentProducts = data.products.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(data.products.length / itemsPerPage);

  const handlePrevious = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNext = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  return (
    <section className="admin-page">
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

      <div className="table-container">
        <table className="data-table purchases-table">
          <thead>
            <tr>
              <th>S.No</th>
              <th><ImageIcon size={16} /> Image</th>
              <th>SKU</th>
              <th><Package size={16} /> Product</th>
              <th>Category</th>
              <th>Stock</th>
              <th>Threshold</th>
              <th>Cost</th>
              <th>Price</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {currentProducts.map((p, index) => (
              <tr key={p._id} className={p.stock <= p.lowStockThreshold ? 'row-warn' : ''}>
                <td className="sno-cell">{indexOfFirstItem + index + 1}</td>
                <td className="image-cell">
                  {p.image ? (
                    <img 
                      src={p.image} 
                      alt={p.name}
                      className="product-thumbnail"
                    />
                  ) : (
                    <div className="no-image">
                      <Package size={20} />
                    </div>
                  )}
                </td>
                <td className="sku-cell">{p.sku}</td>
                <td className="product-cell"><strong>{p.name}</strong></td>
                <td className="type-cell">{p.category}</td>
                <td className="qty-cell">
                  <span className="qty-badge">{p.stock}</span>
                </td>
                <td className="threshold-cell">{p.lowStockThreshold}</td>
                <td className="cost-cell">{formatCurrency(p.costPrice)}</td>
                <td className="cost-cell">{formatCurrency(p.price)}</td>
                <td className="status-cell"><StockStatus stock={p.stock} threshold={p.lowStockThreshold} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {data.products.length > itemsPerPage && (
        <div className="pagination-controls">
          <button 
            className="pagination-btn"
            onClick={handlePrevious}
            disabled={currentPage === 1}
          >
            <ChevronLeft size={18} />
            Previous
          </button>
          <span className="pagination-info">
            Page {currentPage} of {totalPages}
          </span>
          <button 
            className="pagination-btn"
            onClick={handleNext}
            disabled={currentPage === totalPages}
          >
            Next
            <ChevronRight size={18} />
          </button>
        </div>
      )}
    </section>
  );
}
