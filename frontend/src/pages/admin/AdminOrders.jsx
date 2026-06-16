import { useEffect, useState, useRef } from 'react';
import { ShoppingCart, User, Calendar, Package, ChevronLeft, ChevronRight, Eye, Search, ArrowUpDown, SlidersHorizontal, X, CreditCard } from 'lucide-react';
import { orderAPI } from '../../api/api';
import { formatCurrency, formatDate } from '../../utils/format';


function OrderStatusSelect({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const statuses = [
    { value: 'pending', label: 'Pending' },
    { value: 'processing', label: 'Processing' },
    { value: 'shipped', label: 'Shipped' },
    { value: 'delivered', label: 'Delivered' },
    { value: 'cancelled', label: 'Cancelled' }
  ];

  const currentStatus = statuses.find(s => s.value === value) || statuses[0];

  const handleSelect = (val) => {
    onChange(val);
    setOpen(false);
  };

  return (
    <div className={`status-dropdown-wrap${open ? ' status-dropdown--open' : ''}`} ref={ref}>
      <button
        type="button"
        className={`status-select-btn status-select-btn--${value}`}
        onClick={() => setOpen(!open)}
      >
        <span>{currentStatus.label}</span>
      </button>

      {open && (
        <ul className="status-options-list">
          {statuses.map((s) => (
            <li
              key={s.value}
              className={`status-option status-option--${s.value}${s.value === value ? ' selected' : ''}`}
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(s.value);
              }}
            >
              <span className={`status-dot status-dot--${s.value}`}></span>
              <span>{s.label}</span>
              {s.value === value && <span className="status-option-check">✓</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  // Search, Sort, Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('date-desc');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showSearch, setShowSearch] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showDateFilter, setShowDateFilter] = useState(false);

  const sortRef = useRef(null);
  const filterDropdownRef = useRef(null);
  const dateFilterRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (sortRef.current && !sortRef.current.contains(e.target)) {
        setShowSortDropdown(false);
      }
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(e.target)) {
        setShowFilterDropdown(false);
      }
      if (dateFilterRef.current && !dateFilterRef.current.contains(e.target)) {
        setShowDateFilter(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const load = () => orderAPI.getAll().then(({ data }) => setOrders(data));
  useEffect(() => { load(); }, []);

  const updateStatus = async (id, status) => {
    await orderAPI.updateStatus(id, { status });
    load();
  };

  const viewDetails = (order) => {
    setSelectedOrder(order);
    setShowDetailsModal(true);
  };

  const handleStatusFilterChange = (status) => {
    setFilterStatus(status);
    setCurrentPage(1);
    setShowFilterDropdown(false);
  };

  const handleSortChange = (sortType) => {
    setSortBy(sortType);
    setCurrentPage(1);
    setShowSortDropdown(false);
  };

  const handleDateFilterApply = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    setShowDateFilter(false);
  };

  const handleDateFilterClear = () => {
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
    setShowDateFilter(false);
  };

  const formatDateTime = (dtStr) => {
    if (!dtStr) return '';
    const d = new Date(dtStr);
    return d.toLocaleString('en-IN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  // Filter & Sort logic
  const filteredAndSortedOrders = orders
    .filter((o) => {
      const customerName = o.user?.name || '';
      const customerEmail = o.user?.email || '';
      const orderIdStr = o._id || '';
      const orderIdShort = `#${o._id.slice(-8).toUpperCase()}`;
      
      const query = searchTerm.toLowerCase().trim();
      const matchesSearch = !query || 
        customerName.toLowerCase().includes(query) ||
        customerEmail.toLowerCase().includes(query) ||
        orderIdStr.toLowerCase().includes(query) ||
        orderIdShort.toLowerCase().includes(query);

      const matchesStatus = filterStatus === 'all' || o.status === filterStatus;

      let matchesDateRange = true;
      if (startDate) {
        matchesDateRange = matchesDateRange && new Date(o.createdAt) >= new Date(startDate);
      }
      if (endDate) {
        matchesDateRange = matchesDateRange && new Date(o.createdAt) <= new Date(endDate);
      }

      return matchesSearch && matchesStatus && matchesDateRange;
    })
    .sort((a, b) => {
      if (sortBy === 'date-desc') return new Date(b.createdAt) - new Date(a.createdAt);
      if (sortBy === 'date-asc') return new Date(a.createdAt) - new Date(b.createdAt);
      if (sortBy === 'price-desc') return b.totalPrice - a.totalPrice;
      if (sortBy === 'price-asc') return a.totalPrice - b.totalPrice;
      if (sortBy === 'items-desc') return b.orderItems.length - a.orderItems.length;
      if (sortBy === 'items-asc') return a.orderItems.length - b.orderItems.length;
      return 0;
    });

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentOrders = filteredAndSortedOrders.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredAndSortedOrders.length / itemsPerPage);

  const handlePrevious = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNext = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  const getStatusClass = (status) => {
    const statusMap = {
      pending: 'status-pending',
      processing: 'status-processing',
      shipped: 'status-shipped',
      delivered: 'status-delivered',
      cancelled: 'status-cancelled',
    };
    return statusMap[status] || 'status-pending';
  };

  return (
    <section className="admin-page">
      {orders.length === 0 ? (
        <div className="empty-state">
          <ShoppingCart size={48} strokeWidth={1.5} />
          <h3>No orders yet</h3>
          <p>Customer orders will appear here</p>
        </div>
      ) : (
        <>
          {/* Table Toolbar */}
          <div className="table-toolbar">
            {/* Left Side: Active Filters */}
            <div className="table-toolbar-left">
              {filterStatus !== 'all' && (
                <span className="filter-badge">
                  Status: {filterStatus.charAt(0).toUpperCase() + filterStatus.slice(1)}
                  <button onClick={() => handleStatusFilterChange('all')} className="badge-close">
                    <X size={12} />
                  </button>
                </span>
              )}
              {sortBy !== 'date-desc' && (
                <span className="filter-badge">
                  Sorted
                  <button onClick={() => handleSortChange('date-desc')} className="badge-close">
                    <X size={12} />
                  </button>
                </span>
              )}
              {(startDate || endDate) && (
                <span className="filter-badge">
                  Date: {startDate ? formatDateTime(startDate) : 'Any'} – {endDate ? formatDateTime(endDate) : 'Any'}
                  <button onClick={handleDateFilterClear} className="badge-close">
                    <X size={12} />
                  </button>
                </span>
              )}
            </div>

            {/* Right Side: Actions */}
            <div className="table-toolbar-actions">
              <div className="toolbar-dropdown-wrap" ref={sortRef}>
                <button 
                  className={`toolbar-btn ${showSortDropdown ? 'active' : ''}`}
                  onClick={() => {
                    setShowSortDropdown(!showSortDropdown);
                    setShowFilterDropdown(false);
                    setShowDateFilter(false);
                  }}
                  title="Sort Table"
                >
                  <ArrowUpDown size={18} />
                </button>
                
                {showSortDropdown && (
                  <div className="toolbar-dropdown">
                    <div className="dropdown-header">Sort By</div>
                    <button className={`dropdown-item ${sortBy === 'date-desc' ? 'selected' : ''}`} onClick={() => handleSortChange('date-desc')}>Latest First</button>
                    <button className={`dropdown-item ${sortBy === 'date-asc' ? 'selected' : ''}`} onClick={() => handleSortChange('date-asc')}>Oldest First</button>
                    <button className={`dropdown-item ${sortBy === 'price-desc' ? 'selected' : ''}`} onClick={() => handleSortChange('price-desc')}>Total (High to Low)</button>
                    <button className={`dropdown-item ${sortBy === 'price-asc' ? 'selected' : ''}`} onClick={() => handleSortChange('price-asc')}>Total (Low to High)</button>
                    <button className={`dropdown-item ${sortBy === 'items-desc' ? 'selected' : ''}`} onClick={() => handleSortChange('items-desc')}>Items (High to Low)</button>
                    <button className={`dropdown-item ${sortBy === 'items-asc' ? 'selected' : ''}`} onClick={() => handleSortChange('items-asc')}>Items (Low to High)</button>
                  </div>
                )}
              </div>
              
              <div className="toolbar-dropdown-wrap" ref={filterDropdownRef}>
                <button 
                  className={`toolbar-btn ${showFilterDropdown ? 'active' : ''}`}
                  onClick={() => {
                    setShowFilterDropdown(!showFilterDropdown);
                    setShowSortDropdown(false);
                    setShowDateFilter(false);
                  }}
                  title="Filter by Status"
                >
                  <SlidersHorizontal size={18} />
                </button>
                
                {showFilterDropdown && (
                  <div className="toolbar-dropdown">
                    <div className="dropdown-header">Filter by Status</div>
                    <button className={`dropdown-item ${filterStatus === 'all' ? 'selected' : ''}`} onClick={() => handleStatusFilterChange('all')}>All Statuses</button>
                    <button className={`dropdown-item ${filterStatus === 'pending' ? 'selected' : ''}`} onClick={() => handleStatusFilterChange('pending')}>Pending</button>
                    <button className={`dropdown-item ${filterStatus === 'processing' ? 'selected' : ''}`} onClick={() => handleStatusFilterChange('processing')}>Processing</button>
                    <button className={`dropdown-item ${filterStatus === 'shipped' ? 'selected' : ''}`} onClick={() => handleStatusFilterChange('shipped')}>Shipped</button>
                    <button className={`dropdown-item ${filterStatus === 'delivered' ? 'selected' : ''}`} onClick={() => handleStatusFilterChange('delivered')}>Delivered</button>
                    <button className={`dropdown-item ${filterStatus === 'cancelled' ? 'selected' : ''}`} onClick={() => handleStatusFilterChange('cancelled')}>Cancelled</button>
                  </div>
                )}
              </div>

              {/* Date Filter Popover */}
              <div className="filter-popover-wrap" ref={dateFilterRef}>
                <button 
                  className={`toolbar-btn ${showDateFilter ? 'active' : ''}`}
                  onClick={() => {
                    setShowDateFilter(!showDateFilter);
                    setShowSortDropdown(false);
                    setShowFilterDropdown(false);
                  }}
                  title="Filter by Date & Time"
                >
                  <Calendar size={18} />
                </button>
                
                {showDateFilter && (
                  <div className="filter-popover">
                    <div className="filter-popover-header">
                      <span>Date & Time Range</span>
                      <button className="filter-popover-close" onClick={() => setShowDateFilter(false)} aria-label="Close filters">
                        <X size={14} />
                      </button>
                    </div>
                    <form onSubmit={handleDateFilterApply}>
                      <div className="filter-popover-fields">
                        <div className="filter-popover-field">
                          <label><Calendar size={13} /> From</label>
                          <input 
                            type="datetime-local" 
                            value={startDate} 
                            onChange={(e) => setStartDate(e.target.value)} 
                          />
                        </div>
                        <div className="filter-popover-field">
                          <label><Calendar size={13} /> To</label>
                          <input 
                            type="datetime-local" 
                            value={endDate} 
                            onChange={(e) => setEndDate(e.target.value)} 
                          />
                        </div>
                      </div>
                      <div className="filter-popover-actions">
                        <button 
                          type="button" 
                          className="filter-popover-clear"
                          onClick={handleDateFilterClear}
                        >
                          Clear
                        </button>
                        <button type="submit" className="filter-popover-apply">Apply</button>
                      </div>
                    </form>
                  </div>
                )}
              </div>

              {/* Expandable Search Button */}
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
                    placeholder="Search orders..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                    autoFocus
                  />
                )}
                {showSearch && searchTerm && (
                  <button 
                    className="toolbar-search-clear" 
                    onClick={() => {
                      setSearchTerm('');
                      setCurrentPage(1);
                    }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {filteredAndSortedOrders.length === 0 ? (
            <div className="empty-state">
              <Search size={48} strokeWidth={1.5} />
              <h3>No matching orders found</h3>
              <p>Try adjusting your search query or status filter</p>
            </div>
          ) : (
            <>
              <div className="table-container">
                <table className="data-table purchases-table">
                  <thead>
                    <tr>
                      <th>S.No</th>
                      <th>Order ID</th>
                      <th>Customer</th>
                      <th>Date</th>
                      <th>Items</th>
                      <th>Total</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentOrders.map((o, index) => (
                      <tr key={o._id}>
                        <td className="sno-cell">{indexOfFirstItem + index + 1}</td>
                        <td className="order-id-cell">#{o._id.slice(-8).toUpperCase()}</td>
                        <td className="customer-cell">
                          <div>
                            <strong>{o.user?.name}</strong>
                            <small>{o.user?.email}</small>
                          </div>
                        </td>
                        <td className="date-cell">{formatDate(o.createdAt)}</td>
                        <td className="items-cell">
                          <span className="items-badge">{o.orderItems.length}</span>
                        </td>
                        <td className="total-cell">
                          <strong>{formatCurrency(o.totalPrice)}</strong>
                        </td>
                        <td className="status-cell">
                          <OrderStatusSelect 
                            value={o.status} 
                            onChange={(status) => updateStatus(o._id, status)}
                          />
                        </td>
                        <td className="actions-cell">
                          <div className="action-buttons">
                            <button 
                              className="btn-view"
                              onClick={() => viewDetails(o)}
                              title="View details"
                            >
                              <Eye size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {filteredAndSortedOrders.length > itemsPerPage && (
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
        </>
      )}

      {/* Order Details Modal */}
      {showDetailsModal && selectedOrder && (
        <div className="modal-overlay" onClick={() => setShowDetailsModal(false)}>
          <div className="modal-content modal-content-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Order Details - #{selectedOrder._id.slice(-8).toUpperCase()}</h2>
              <button 
                className="modal-close-btn"
                onClick={() => setShowDetailsModal(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            
            <div className="modal-form order-details">
              <div className="order-info-grid">
                <div className="info-card">
                  <h4><User size={18} /> Customer Information</h4>
                  <div className="info-row">
                    <strong>Name</strong>
                    <span>{selectedOrder.user?.name}</span>
                  </div>
                  <div className="info-row">
                    <strong>Email</strong>
                    <span>{selectedOrder.user?.email}</span>
                  </div>
                </div>
                
                <div className="info-card">
                  <h4><Package size={18} /> Shipping Address</h4>
                  <p className="address-line">{selectedOrder.shippingAddress?.street}</p>
                  <p className="address-line">{selectedOrder.shippingAddress?.city}, {selectedOrder.shippingAddress?.state}</p>
                  <p className="address-line">{selectedOrder.shippingAddress?.zip}, {selectedOrder.shippingAddress?.country}</p>
                </div>

                <div className="info-card">
                  <h4><CreditCard size={18} /> Payment Information</h4>
                  <div className="info-row">
                    <strong>Method</strong>
                    <span>{selectedOrder.paymentMethod || 'COD'}</span>
                  </div>
                  <div className="info-row">
                    <strong>Items Total</strong>
                    <span>{formatCurrency(selectedOrder.itemsPrice)}</span>
                  </div>
                  <div className="info-row">
                    <strong>Shipping</strong>
                    <span>{formatCurrency(selectedOrder.shippingPrice)}</span>
                  </div>
                  <div className="info-row">
                    <strong>Tax (18%)</strong>
                    <span>{formatCurrency(selectedOrder.taxPrice)}</span>
                  </div>
                  <div className="info-row">
                    <strong>Status</strong>
                    <span style={{ 
                      color: selectedOrder.isPaid ? '#0070f3' : '#ff9800', 
                      background: selectedOrder.isPaid ? 'rgba(0, 112, 243, 0.08)' : 'rgba(255, 152, 0, 0.08)',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '4px',
                      fontSize: '0.8rem',
                      fontWeight: '600'
                    }}>
                      {selectedOrder.isPaid ? 'Paid' : 'Unpaid'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="order-items-section">
                <h4><ShoppingCart size={18} /> Order Items</h4>
                <div className="table-container">
                  <table className="order-items-table">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Quantity</th>
                        <th>Price</th>
                        <th>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedOrder.orderItems.map((item, idx) => (
                        <tr key={idx}>
                          <td><strong>{item.name}</strong></td>
                          <td>{item.quantity}</td>
                          <td>{formatCurrency(item.price)}</td>
                          <td><strong>{formatCurrency(item.quantity * item.price)}</strong></td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan="3"><strong>Total</strong></td>
                        <td><strong className="total-amount">{formatCurrency(selectedOrder.totalPrice)}</strong></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
