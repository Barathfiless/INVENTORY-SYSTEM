import { useEffect, useState, useRef } from 'react';
import { AlertTriangle, Package, ChevronLeft, ChevronRight, Image as ImageIcon, Search, ArrowUpDown, SlidersHorizontal, X, RotateCcw } from 'lucide-react';
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

  // Search, Sort, Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name-asc');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

  // UI state for dropdowns
  const [showSearch, setShowSearch] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);

  // Clear stock states
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isClearing, setIsClearing] = useState(false);
  const [clearError, setClearError] = useState('');

  const sortRef = useRef(null);
  const categoryRef = useRef(null);
  const statusRef = useRef(null);

  useEffect(() => {
    productAPI.getStock().then(({ data: d }) => setData(d));
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (sortRef.current && !sortRef.current.contains(e.target)) {
        setShowSortDropdown(false);
      }
      if (categoryRef.current && !categoryRef.current.contains(e.target)) {
        setShowCategoryDropdown(false);
      }
      if (statusRef.current && !statusRef.current.contains(e.target)) {
        setShowStatusDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!data) return <p className="page-loading">Loading stock...</p>;

  // Extract unique categories dynamically from products
  const uniqueCategories = Array.from(
    new Set(data.products.map((p) => p.category?.trim().toLowerCase()).filter(Boolean))
  ).map((cat) => {
    const original = data.products.find((p) => p.category?.trim().toLowerCase() === cat)?.category;
    return original || cat;
  });

  // Filter & Sort logic
  const filteredAndSortedProducts = data.products
    .filter((p) => {
      const name = p.name || '';
      const sku = p.sku || '';
      const category = p.category || '';
      const matchesSearch =
        name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        category.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory =
        filterCategory === 'all' ||
        category.trim().toLowerCase() === filterCategory.toLowerCase();

      let matchesStatus = true;
      if (filterStatus !== 'all') {
        const isOut = p.stock === 0;
        const isLow = p.stock > 0 && p.stock <= p.lowStockThreshold;
        const isOk = p.stock > p.lowStockThreshold;

        if (filterStatus === 'out') matchesStatus = isOut;
        else if (filterStatus === 'low') matchesStatus = isLow;
        else if (filterStatus === 'ok') matchesStatus = isOk;
      }

      return matchesSearch && matchesCategory && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === 'name-asc') return (a.name || '').localeCompare(b.name || '');
      if (sortBy === 'name-desc') return (b.name || '').localeCompare(a.name || '');
      if (sortBy === 'stock-asc') return a.stock - b.stock;
      if (sortBy === 'stock-desc') return b.stock - a.stock;
      if (sortBy === 'threshold-asc') return a.lowStockThreshold - b.lowStockThreshold;
      if (sortBy === 'threshold-desc') return b.lowStockThreshold - a.lowStockThreshold;
      if (sortBy === 'cost-asc') return a.costPrice - b.costPrice;
      if (sortBy === 'cost-desc') return b.costPrice - a.costPrice;
      if (sortBy === 'price-asc') return a.price - b.price;
      if (sortBy === 'price-desc') return b.price - a.price;
      return 0;
    });

  const handleClearStockSubmit = async (e) => {
    e.preventDefault();
    if (!confirmPassword) return;
    setIsClearing(true);
    setClearError('');
    try {
      await productAPI.clearStock(confirmPassword);
      const { data: d } = await productAPI.getStock();
      setData(d);
      setShowClearConfirm(false);
      setConfirmPassword('');
    } catch (err) {
      setClearError(err.response?.data?.message || 'Verification failed. Please try again.');
    } finally {
      setIsClearing(false);
    }
  };

  const cancelClear = () => {
    setShowClearConfirm(false);
    setConfirmPassword('');
    setClearError('');
  };

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentProducts = filteredAndSortedProducts.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredAndSortedProducts.length / itemsPerPage);

  const handlePrevious = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNext = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  return (
    <section className="admin-page">
      <header className="admin-page-header">
        <h1>Stocks Available</h1>
      </header>

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

      {/* Table Toolbar */}
      <div className="table-toolbar">
        {/* Left Side: Active Filters */}
        <div className="table-toolbar-left">
          {filterCategory !== 'all' && (
            <span className="filter-badge">
              Category: {filterCategory}
              <button onClick={() => { setFilterCategory('all'); setCurrentPage(1); }} className="badge-close">
                <X size={12} />
              </button>
            </span>
          )}
          {filterStatus !== 'all' && (
            <span className="filter-badge">
              Status: {filterStatus === 'out' ? 'Out of Stock' : filterStatus === 'low' ? 'Low Stock' : 'OK'}
              <button onClick={() => { setFilterStatus('all'); setCurrentPage(1); }} className="badge-close">
                <X size={12} />
              </button>
            </span>
          )}
          {sortBy !== 'name-asc' && (
            <span className="filter-badge">
              Sorted
              <button onClick={() => setSortBy('name-asc')} className="badge-close">
                <X size={12} />
              </button>
            </span>
          )}
        </div>

        {/* Right Side: Actions (Sort, Filters, Search) */}
        <div className="table-toolbar-actions">
          {/* Sort Dropdown */}
          <div className="toolbar-dropdown-wrap" ref={sortRef}>
            <button 
              className={`toolbar-btn ${showSortDropdown ? 'active' : ''}`}
              onClick={() => {
                setShowSortDropdown(!showSortDropdown);
                setShowCategoryDropdown(false);
                setShowStatusDropdown(false);
              }}
              title="Sort Table"
            >
              <ArrowUpDown size={18} />
            </button>
            
            {showSortDropdown && (
              <div className="toolbar-dropdown">
                <div className="dropdown-header">Sort By</div>
                <button className={`dropdown-item ${sortBy === 'name-asc' ? 'selected' : ''}`} onClick={() => { setSortBy('name-asc'); setShowSortDropdown(false); }}>Product Name (A-Z)</button>
                <button className={`dropdown-item ${sortBy === 'name-desc' ? 'selected' : ''}`} onClick={() => { setSortBy('name-desc'); setShowSortDropdown(false); }}>Product Name (Z-A)</button>
                <button className={`dropdown-item ${sortBy === 'stock-desc' ? 'selected' : ''}`} onClick={() => { setSortBy('stock-desc'); setShowSortDropdown(false); }}>Stock (High to Low)</button>
                <button className={`dropdown-item ${sortBy === 'stock-asc' ? 'selected' : ''}`} onClick={() => { setSortBy('stock-asc'); setShowSortDropdown(false); }}>Stock (Low to High)</button>
                <button className={`dropdown-item ${sortBy === 'cost-desc' ? 'selected' : ''}`} onClick={() => { setSortBy('cost-desc'); setShowSortDropdown(false); }}>Cost (High to Low)</button>
                <button className={`dropdown-item ${sortBy === 'cost-asc' ? 'selected' : ''}`} onClick={() => { setSortBy('cost-asc'); setShowSortDropdown(false); }}>Cost (Low to High)</button>
                <button className={`dropdown-item ${sortBy === 'price-desc' ? 'selected' : ''}`} onClick={() => { setSortBy('price-desc'); setShowSortDropdown(false); }}>Price (High to Low)</button>
                <button className={`dropdown-item ${sortBy === 'price-asc' ? 'selected' : ''}`} onClick={() => { setSortBy('price-asc'); setShowSortDropdown(false); }}>Price (Low to High)</button>
              </div>
            )}
          </div>
          
          {/* Category Filter Dropdown */}
          <div className="toolbar-dropdown-wrap" ref={categoryRef}>
            <button 
              className={`toolbar-btn ${showCategoryDropdown ? 'active' : ''}`}
              onClick={() => {
                setShowCategoryDropdown(!showCategoryDropdown);
                setShowSortDropdown(false);
                setShowStatusDropdown(false);
              }}
              title="Filter by Category"
            >
              <SlidersHorizontal size={18} />
            </button>
            
            {showCategoryDropdown && (
              <div className="toolbar-dropdown">
                <div className="dropdown-header">Filter Category</div>
                <button className={`dropdown-item ${filterCategory === 'all' ? 'selected' : ''}`} onClick={() => { setFilterCategory('all'); setCurrentPage(1); setShowCategoryDropdown(false); }}>All Categories</button>
                {uniqueCategories.map((cat) => (
                  <button key={cat} className={`dropdown-item ${filterCategory.toLowerCase() === cat.toLowerCase() ? 'selected' : ''}`} onClick={() => { setFilterCategory(cat); setCurrentPage(1); setShowCategoryDropdown(false); }}>{cat}</button>
                ))}
              </div>
            )}
          </div>

          {/* Status Filter Dropdown */}
          <div className="toolbar-dropdown-wrap" ref={statusRef}>
            <button 
              className={`toolbar-btn ${showStatusDropdown ? 'active' : ''}`}
              onClick={() => {
                setShowStatusDropdown(!showStatusDropdown);
                setShowSortDropdown(false);
                setShowCategoryDropdown(false);
              }}
              title="Filter by Status"
            >
              <SlidersHorizontal size={18} style={{ transform: 'rotate(90deg)' }} />
            </button>
            
            {showStatusDropdown && (
              <div className="toolbar-dropdown">
                <div className="dropdown-header">Filter Status</div>
                <button className={`dropdown-item ${filterStatus === 'all' ? 'selected' : ''}`} onClick={() => { setFilterStatus('all'); setCurrentPage(1); setShowStatusDropdown(false); }}>All Statuses</button>
                <button className={`dropdown-item ${filterStatus === 'ok' ? 'selected' : ''}`} onClick={() => { setFilterStatus('ok'); setCurrentPage(1); setShowStatusDropdown(false); }}>OK</button>
                <button className={`dropdown-item ${filterStatus === 'low' ? 'selected' : ''}`} onClick={() => { setFilterStatus('low'); setCurrentPage(1); setShowStatusDropdown(false); }}>Low Stock</button>
                <button className={`dropdown-item ${filterStatus === 'out' ? 'selected' : ''}`} onClick={() => { setFilterStatus('out'); setCurrentPage(1); setShowStatusDropdown(false); }}>Out of Stock</button>
              </div>
            )}
          </div>

          {/* Clear Stock Button */}
          <button 
            className="toolbar-btn toolbar-btn-danger"
            onClick={() => setShowClearConfirm(true)}
            title="Clear All Stock Levels"
            style={{ marginRight: '0.5rem' }}
          >
            <RotateCcw size={18} />
          </button>

          {/* Expandable Search Input */}
          <div className={`toolbar-search-wrap ${showSearch ? 'expanded' : ''}`}>
            <button 
              className="search-trigger-btn"
              onClick={() => {
                setShowSearch(!showSearch);
                if (showSearch) {
                  setSearchTerm('');
                  setCurrentPage(1);
                }
              }}
              title="Search Table"
            >
              <Search size={18} />
            </button>
            {showSearch && (
              <input
                type="text"
                className="toolbar-search-input"
                placeholder="Search stock..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                autoFocus
              />
            )}
            {showSearch && searchTerm && (
              <button className="toolbar-search-clear" onClick={() => { setSearchTerm(''); setCurrentPage(1); }}>
                <X size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      {filteredAndSortedProducts.length === 0 ? (
        <div className="empty-state">
          <Search size={48} strokeWidth={1.5} />
          <h3>No matching stock items found</h3>
          <p>Try adjusting your search query or filters</p>
        </div>
      ) : (
        <>
          <div className="table-container">
            <table className="data-table purchases-table stock-page-table">
              <thead>
                <tr>
                  <th>S.No</th>
                  <th>Image</th>
                  <th>SKU</th>
                  <th>Product</th>
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
                    <td className="type-cell-container">
                      <span className="category-badge-blue">{p.category}</span>
                    </td>
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
          {filteredAndSortedProducts.length > itemsPerPage && (
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
        </>
      )}
      {/* Clear Stock Confirmation Modal */}
      {showClearConfirm && (
        <div className="modal-overlay" onClick={cancelClear}>
          <div className="modal-content modal-content-small" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Clear All Stock</h2>
              <button className="modal-close-btn" onClick={cancelClear} aria-label="Close"><X size={24} /></button>
            </div>
            <form onSubmit={handleClearStockSubmit} className="modal-form">
              <div className="delete-warning">
                <AlertTriangle size={48} strokeWidth={1.5} style={{ color: 'var(--danger)' }} />
                <p>This action will set the stock level of all your products to 0. Enter your password to confirm:</p>
              </div>
              <div className="form-group">
                <label>Password</label>
                <input 
                  type="password" 
                  required 
                  value={confirmPassword} 
                  disabled={isClearing}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setClearError('');
                  }} 
                  placeholder="Enter your password" 
                  autoFocus 
                />
              </div>
              {clearError && (
                <p style={{ color: 'var(--danger)', fontSize: '0.82rem', fontWeight: 550, marginTop: '-0.5rem', marginBottom: '1rem' }}>
                  {clearError}
                </p>
              )}
              <div className="modal-actions">
                <button type="button" className="btn-secondary" disabled={isClearing} onClick={cancelClear}>Cancel</button>
                <button type="submit" className="btn-delete-confirm" disabled={isClearing || !confirmPassword}>
                  {isClearing ? 'Clearing...' : 'Confirm Clear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
