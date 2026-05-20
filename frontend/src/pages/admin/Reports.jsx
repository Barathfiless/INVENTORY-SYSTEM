import { useEffect, useState, useRef } from 'react';
import { TrendingUp, ShoppingCart, Package, Calendar, Filter, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { reportAPI } from '../../api/api';
import { formatCurrency, formatDate } from '../../utils/format';

export default function Reports() {
  const [range, setRange] = useState({ startDate: '', endDate: '' });
  const [report, setReport] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const filterRef = useRef(null);
  const [itemsPerPage] = useState(10);

  // Close filter popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) {
        setShowFilters(false);
      }
    };
    if (showFilters) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showFilters]);

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
        <div className="filter-popover-wrap" ref={filterRef}>
          <button 
            className={`btn-filter${showFilters ? ' btn-filter--active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={16} />
            Filters
          </button>

          {showFilters && (
            <div className="filter-popover">
              <div className="filter-popover-header">
                <span>Date Range</span>
                <button className="filter-popover-close" onClick={() => setShowFilters(false)} aria-label="Close filters">
                  <X size={14} />
                </button>
              </div>
              <form onSubmit={(e) => { e.preventDefault(); load(); setShowFilters(false); }}>
                <div className="filter-popover-fields">
                  <div className="filter-popover-field">
                    <label><Calendar size={13} /> From</label>
                    <input 
                      type="date" 
                      value={range.startDate} 
                      onChange={(e) => setRange({ ...range, startDate: e.target.value })} 
                    />
                  </div>
                  <div className="filter-popover-field">
                    <label><Calendar size={13} /> To</label>
                    <input 
                      type="date" 
                      value={range.endDate} 
                      onChange={(e) => setRange({ ...range, endDate: e.target.value })} 
                    />
                  </div>
                </div>
                <div className="filter-popover-actions">
                  <button 
                    type="button" 
                    className="filter-popover-clear"
                    onClick={() => { setRange({ startDate: '', endDate: '' }); }}
                  >
                    Clear
                  </button>
                  <button type="submit" className="filter-popover-apply">Apply</button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>

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
