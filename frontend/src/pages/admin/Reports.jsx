import { useEffect, useState } from 'react';
import { TrendingUp, ShoppingCart, Package, Calendar, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { reportAPI } from '../../api/api';
import { formatCurrency, formatDate } from '../../utils/format';

export default function Reports() {
  const [range, setRange] = useState({ startDate: '', endDate: '' });
  const [report, setReport] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  const load = async () => {
    const params = {};
    if (range.startDate) params.startDate = range.startDate;
    if (range.endDate) params.endDate = range.endDate;
    const { data } = await reportAPI.getReports(params);
    setReport(data);
  };

  useEffect(() => { load(); }, []);

  // Pagination for recent sales
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentSales = report?.sales.slice(indexOfFirstItem, indexOfLastItem) || [];
  const totalPages = Math.ceil((report?.sales.length || 0) / itemsPerPage);

  const handlePrevious = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNext = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  return (
    <section className="admin-page">
      {/* Filter Section */}
      <div className="page-header-actions">
        <button 
          className="btn-filter"
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter size={18} />
          {showFilters ? 'Hide Filters' : 'Show Filters'}
        </button>
      </div>

      {showFilters && (
        <div className="filter-card">
          <form className="filter-form" onSubmit={(e) => { e.preventDefault(); load(); }}>
            <div className="form-row">
              <div className="form-group">
                <label><Calendar size={16} /> From Date</label>
                <input 
                  type="date" 
                  value={range.startDate} 
                  onChange={(e) => setRange({ ...range, startDate: e.target.value })} 
                />
              </div>
              <div className="form-group">
                <label><Calendar size={16} /> To Date</label>
                <input 
                  type="date" 
                  value={range.endDate} 
                  onChange={(e) => setRange({ ...range, endDate: e.target.value })} 
                />
              </div>
            </div>
            <button type="submit" className="btn-submit">Apply Filter</button>
          </form>
        </div>
      )}

      {report && (
        <>
          {/* Summary Stats */}
          <ul className="stats-grid">
            <li className="stat-card stat-card--blue">
              <span className="stat-icon-wrap">
                <Package size={20} strokeWidth={2} aria-hidden />
              </span>
              <p className="stat-value">{formatCurrency(report.summary.purchaseTotal)}</p>
              <p className="stat-label">Purchases ({report.summary.purchaseCount})</p>
            </li>
            <li className="stat-card stat-card--green">
              <span className="stat-icon-wrap">
                <TrendingUp size={20} strokeWidth={2} aria-hidden />
              </span>
              <p className="stat-value">{formatCurrency(report.summary.saleTotal)}</p>
              <p className="stat-label">Sales ({report.summary.saleCount})</p>
            </li>
            <li className="stat-card stat-card--purple">
              <span className="stat-icon-wrap">
                <ShoppingCart size={20} strokeWidth={2} aria-hidden />
              </span>
              <p className="stat-value">{formatCurrency(report.summary.orderTotal)}</p>
              <p className="stat-label">Orders ({report.summary.orderCount})</p>
            </li>
          </ul>

          {/* Top Selling Products */}
          <div className="report-section">
            <h3 className="section-title">
              <TrendingUp size={20} />
              Top Selling Products
            </h3>
            <div className="table-container">
              <table className="data-table purchases-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Product</th>
                    <th>Qty Sold</th>
                    <th>Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {report.topProducts.map((p, index) => (
                    <tr key={p._id}>
                      <td className="rank-cell">
                        <span className="rank-badge">{index + 1}</span>
                      </td>
                      <td className="product-cell"><strong>{p.name}</strong></td>
                      <td className="qty-cell">
                        <span className="qty-badge">{p.totalQty}</span>
                      </td>
                      <td className="total-cell">
                        <strong>{formatCurrency(p.revenue)}</strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Sales */}
          <div className="report-section">
            <h3 className="section-title">
              <ShoppingCart size={20} />
              Recent Sales
            </h3>
            <div className="table-container">
              <table className="data-table purchases-table">
                <thead>
                  <tr>
                    <th>S.No</th>
                    <th><Calendar size={16} /> Date</th>
                    <th><Package size={16} /> Product</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {currentSales.map((s, index) => (
                    <tr key={s._id}>
                      <td className="sno-cell">{indexOfFirstItem + index + 1}</td>
                      <td className="date-cell">{formatDate(s.createdAt)}</td>
                      <td className="product-cell"><strong>{s.product?.name}</strong></td>
                      <td className="total-cell">
                        <strong>{formatCurrency(s.totalAmount)}</strong>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {report.sales.length > itemsPerPage && (
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
          </div>
        </>
      )}
    </section>
  );
}
