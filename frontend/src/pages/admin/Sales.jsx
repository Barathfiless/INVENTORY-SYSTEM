import { useEffect, useState, useRef } from 'react';
import { Package, Calendar, User, Plus, X, ChevronLeft, ChevronRight, Trash2, Image as ImageIcon, ArrowUpDown, SlidersHorizontal, Search } from 'lucide-react';
import { saleAPI, productAPI } from '../../api/api';
import { formatCurrency, formatDate } from '../../utils/format';
import CustomSelect from '../../components/CustomSelect';

export default function Sales() {
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [message, setMessage] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isBulkDelete, setIsBulkDelete] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [form, setForm] = useState({
    productId: '',
    quantity: 1,
    unitPrice: 0,
    customerName: '',
  });

  // Search, Sort, Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('date-desc');
  const [filterCategory, setFilterCategory] = useState('all');
  const [showSearch, setShowSearch] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);

  const sortRef = useRef(null);
  const filterRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (sortRef.current && !sortRef.current.contains(e.target)) {
        setShowSortDropdown(false);
      }
      if (filterRef.current && !filterRef.current.contains(e.target)) {
        setShowFilterDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const load = async () => {
    const [sRes, prodRes] = await Promise.all([
      saleAPI.getAll({ channel: 'inventory' }),
      productAPI.getAdminAll(),
    ]);
    setSales(sRes.data);
    setProducts(prodRes.data);
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id) => {
    setIsBulkDelete(false);
    setDeleteId(id);
    setShowDeleteModal(true);
  };

  const handleBulkDelete = () => {
    setIsBulkDelete(true);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!deletePassword) {
      alert('Password is required to delete.');
      return;
    }
    
    try {
      if (isBulkDelete) {
        await Promise.all(
          selectedIds.map((id) =>
            saleAPI.delete(id, {
              headers: { 'Content-Type': 'application/json' },
              data: { password: deletePassword },
            })
          )
        );
        setMessage(`${selectedIds.length} sales deleted successfully.`);
        setSelectedIds([]);
      } else {
        await saleAPI.delete(deleteId, { 
          headers: {
            'Content-Type': 'application/json',
          },
          data: { 
            password: deletePassword 
          }
        });
        setMessage('Sale deleted successfully.');
        setSelectedIds((prev) => prev.filter((id) => id !== deleteId));
      }
      setShowDeleteModal(false);
      setDeletePassword('');
      setDeleteId(null);
      setIsBulkDelete(false);
      load();
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to delete. Invalid password or error occurred.';
      alert(errorMessage);
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setDeletePassword('');
    setDeleteId(null);
    setIsBulkDelete(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    try {
      await saleAPI.create(form);
      setForm({ productId: '', quantity: 1, unitPrice: 0, customerName: '' });
      setShowAddForm(false);
      setMessage('Sale recorded successfully.');
      load();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to record sale');
    }
  };

  // Get all unique categories dynamically
  const categories = Array.from(new Set(products.map((p) => p.category).filter(Boolean)));

  // Filter & Sort logic
  const filteredAndSortedSales = sales
    .filter((s) => {
      const productName = s.product?.name || '';
      const customerName = s.customerName || '';
      const category = s.product?.category || '';
      const matchesSearch = productName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            customerName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = filterCategory === 'all' || category === filterCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      if (sortBy === 'date-desc') return new Date(b.createdAt) - new Date(a.createdAt);
      if (sortBy === 'date-asc') return new Date(a.createdAt) - new Date(b.createdAt);
      if (sortBy === 'qty-desc') return b.quantity - a.quantity;
      if (sortBy === 'qty-asc') return a.quantity - b.quantity;
      if (sortBy === 'price-desc') return b.unitPrice - a.unitPrice;
      if (sortBy === 'price-asc') return a.unitPrice - b.unitPrice;
      if (sortBy === 'total-desc') return b.totalAmount - a.totalAmount;
      if (sortBy === 'total-asc') return a.totalAmount - b.totalAmount;
      return 0;
    });

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentSales = filteredAndSortedSales.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredAndSortedSales.length / itemsPerPage);

  const handlePrevious = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNext = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  return (
    <section className="admin-page">
      <header className="admin-page-header">
        <h1>Sales Records</h1>
      </header>

      {message && <p className="alert success">{message}</p>}
      
      {/* Table Toolbar */}
      <div className="table-toolbar">
            {/* Left Side: Active Filters or Search Input */}
            <div className="table-toolbar-left">
              {filterCategory !== 'all' && (
                <span className="filter-badge">
                  Category: {filterCategory}
                  <button onClick={() => setFilterCategory('all')} className="badge-close">
                    <X size={12} />
                  </button>
                </span>
              )}
              {sortBy !== 'date-desc' && (
                <span className="filter-badge">
                  Sorted
                  <button onClick={() => setSortBy('date-desc')} className="badge-close">
                    <X size={12} />
                  </button>
                </span>
              )}
            </div>

            {/* Right Side: The 4 Icon Buttons shown in the user screenshot */}
            <div className="table-toolbar-actions">
              <button 
                className="toolbar-btn" 
                onClick={() => {
                  setForm({ productId: '', quantity: 1, unitPrice: 0, customerName: '' });
                  setShowAddForm(true);
                }}
                title="Add Sale"
              >
                <Plus size={18} />
              </button>
              
              <div className="toolbar-dropdown-wrap" ref={sortRef}>
                <button 
                  className={`toolbar-btn ${showSortDropdown ? 'active' : ''}`}
                  onClick={() => {
                    setShowSortDropdown(!showSortDropdown);
                    setShowFilterDropdown(false);
                  }}
                  title="Sort Table"
                >
                  <ArrowUpDown size={18} />
                </button>
                
                {showSortDropdown && (
                  <div className="toolbar-dropdown">
                    <div className="dropdown-header">Sort By</div>
                    <button className={`dropdown-item ${sortBy === 'date-desc' ? 'selected' : ''}`} onClick={() => { setSortBy('date-desc'); setShowSortDropdown(false); }}>Latest First</button>
                    <button className={`dropdown-item ${sortBy === 'date-asc' ? 'selected' : ''}`} onClick={() => { setSortBy('date-asc'); setShowSortDropdown(false); }}>Oldest First</button>
                    <button className={`dropdown-item ${sortBy === 'qty-desc' ? 'selected' : ''}`} onClick={() => { setSortBy('qty-desc'); setShowSortDropdown(false); }}>Quantity (High to Low)</button>
                    <button className={`dropdown-item ${sortBy === 'qty-asc' ? 'selected' : ''}`} onClick={() => { setSortBy('qty-asc'); setShowSortDropdown(false); }}>Quantity (Low to High)</button>
                    <button className={`dropdown-item ${sortBy === 'price-desc' ? 'selected' : ''}`} onClick={() => { setSortBy('price-desc'); setShowSortDropdown(false); }}>Price (High to Low)</button>
                    <button className={`dropdown-item ${sortBy === 'price-asc' ? 'selected' : ''}`} onClick={() => { setSortBy('price-asc'); setShowSortDropdown(false); }}>Price (Low to High)</button>
                    <button className={`dropdown-item ${sortBy === 'total-desc' ? 'selected' : ''}`} onClick={() => { setSortBy('total-desc'); setShowSortDropdown(false); }}>Total (High to Low)</button>
                    <button className={`dropdown-item ${sortBy === 'total-asc' ? 'selected' : ''}`} onClick={() => { setSortBy('total-asc'); setShowSortDropdown(false); }}>Total (Low to High)</button>
                  </div>
                )}
              </div>
              
              <div className="toolbar-dropdown-wrap" ref={filterRef}>
                <button 
                  className={`toolbar-btn ${showFilterDropdown ? 'active' : ''}`}
                  onClick={() => {
                    setShowFilterDropdown(!showFilterDropdown);
                    setShowSortDropdown(false);
                  }}
                  title="Filter Table"
                >
                  <SlidersHorizontal size={18} />
                </button>
                
                {showFilterDropdown && (
                  <div className="toolbar-dropdown">
                    <div className="dropdown-header">Filter by Category</div>
                    <button className={`dropdown-item ${filterCategory === 'all' ? 'selected' : ''}`} onClick={() => { setFilterCategory('all'); setShowFilterDropdown(false); }}>All Categories</button>
                    {categories.map((cat) => (
                      <button key={cat} className={`dropdown-item ${filterCategory === cat ? 'selected' : ''}`} onClick={() => { setFilterCategory(cat); setShowFilterDropdown(false); }}>{cat}</button>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Common Delete Button */}
              <button 
                className={`toolbar-btn toolbar-btn-danger ${selectedIds.length > 0 ? 'active' : ''}`}
                disabled={selectedIds.length === 0}
                onClick={handleBulkDelete}
                title={`Delete Selected (${selectedIds.length})`}
              >
                <Trash2 size={18} />
              </button>

              {/* Expandable Search Button */}
              <div className={`toolbar-search-wrap ${showSearch ? 'expanded' : ''}`}>
                <button 
                  className="search-trigger-btn"
                  onClick={() => {
                    setShowSearch(!showSearch);
                    if (showSearch) setSearchTerm('');
                  }}
                  title="Search Table"
                >
                  <Search size={18} />
                </button>
                {showSearch && (
                  <input
                    type="text"
                    className="toolbar-search-input"
                    placeholder="Search sales..."
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setCurrentPage(1);
                    }}
                    autoFocus
                  />
                )}
                {showSearch && searchTerm && (
                  <button className="toolbar-search-clear" onClick={() => setSearchTerm('')}>
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {sales.length === 0 ? (
            <div className="empty-state">
              <Package size={48} strokeWidth={1.5} />
              <h3>No sales recorded yet</h3>
              <p>Sales records will appear here once added</p>
            </div>
          ) : (
            <>
              {filteredAndSortedSales.length === 0 ? (
                <div className="empty-state">
                  <Search size={48} strokeWidth={1.5} />
                  <h3>No matching sales found</h3>
              <p>Try adjusting your search query or filters</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="data-table purchases-table">
                <thead>
                  <tr>
                    <th>
                      <input 
                        type="checkbox" 
                        className="table-header-checkbox"
                        checked={currentSales.length > 0 && currentSales.every((item) => selectedIds.includes(item._id))}
                        onChange={(e) => {
                          if (e.target.checked) {
                            const pageIds = currentSales.map((item) => item._id);
                            setSelectedIds((prev) => Array.from(new Set([...prev, ...pageIds])));
                          } else {
                            const pageIds = currentSales.map((item) => item._id);
                            setSelectedIds((prev) => prev.filter((id) => !pageIds.includes(id)));
                          }
                        }}
                      />
                    </th>
                    <th>S.No</th>
                    <th>Image</th>
                    <th>Date</th>
                    <th>Product</th>
                    <th>Qty</th>
                    <th>Unit Price</th>
                    <th>Total</th>
                    <th>Customer</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentSales.map((s, index) => (
                    <tr key={s._id}>
                      <td className="checkbox-cell">
                        <input 
                          type="checkbox" 
                          className="table-row-checkbox"
                          checked={selectedIds.includes(s._id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedIds((prev) => [...prev, s._id]);
                            } else {
                              setSelectedIds((prev) => prev.filter((id) => id !== s._id));
                            }
                          }}
                        />
                      </td>
                      <td className="sno-cell">{indexOfFirstItem + index + 1}</td>
                      <td className="image-cell">
                        {s.product?.image ? (
                          <img 
                            src={s.product.image} 
                            alt={s.product.name}
                            className="product-thumbnail"
                          />
                        ) : (
                          <div className="no-image">
                            <Package size={20} />
                          </div>
                        )}
                      </td>
                      <td className="date-cell">{formatDate(s.createdAt)}</td>
                      <td className="product-cell">
                        <strong>{s.product?.name || '—'}</strong>
                      </td>
                      <td className="qty-cell">
                        <span className="qty-badge">{s.quantity}</span>
                      </td>
                      <td className="cost-cell">{formatCurrency(s.unitPrice)}</td>
                      <td className="total-cell">
                        <strong>{formatCurrency(s.totalAmount)}</strong>
                      </td>
                      <td className="supplier-cell">{s.customerName || '—'}</td>
                      <td className="actions-cell">
                        <button 
                          className="btn-delete"
                          onClick={() => handleDelete(s._id)}
                          title="Delete sale"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Pagination Controls */}
      {filteredAndSortedSales.length > itemsPerPage && (
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

      {/* Add Sale Modal */}
      {showAddForm && (
        <div className="modal-overlay" onClick={() => {
          setShowAddForm(false);
          setForm({ productId: '', quantity: 1, unitPrice: 0, customerName: '' });
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add New Sale</h2>
              <button 
                className="modal-close-btn"
                onClick={() => {
                  setShowAddForm(false);
                  setForm({ productId: '', quantity: 1, unitPrice: 0, customerName: '' });
                }}
                aria-label="Close"
              >
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-group">
                <label>Product</label>
                <CustomSelect
                  options={products.map((p) => ({ value: p._id, label: `${p.name} (Stock: ${p.stock})` }))}
                  value={form.productId}
                  onChange={(val) => {
                    const p = products.find((x) => x._id === val);
                    setForm({ ...form, productId: val, unitPrice: p?.price || 0 });
                  }}
                  placeholder="Select product"
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Quantity</label>
                  <input 
                    type="number" 
                    min="1" 
                    required 
                    value={form.quantity} 
                    onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} 
                  />
                </div>

                <div className="form-group">
                  <label>Unit Price (₹)</label>
                  <input 
                    type="number" 
                    min="0" 
                    step="0.01"
                    required 
                    value={form.unitPrice} 
                    onChange={(e) => setForm({ ...form, unitPrice: Number(e.target.value) })} 
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Customer Name (Optional)</label>
                <input 
                  type="text"
                  value={form.customerName} 
                  onChange={(e) => setForm({ ...form, customerName: e.target.value })} 
                  placeholder="Enter customer name"
                />
              </div>

              <div className="modal-actions">
                <button 
                  type="button" 
                  className="btn-secondary"
                  onClick={() => {
                    setShowAddForm(false);
                    setForm({ productId: '', quantity: 1, unitPrice: 0, customerName: '' });
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-submit">
                  Submit Sale
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={cancelDelete}>
          <div className="modal-content modal-content-small" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{isBulkDelete ? 'Delete Selected Sales' : 'Delete Sale'}</h2>
              <button 
                className="modal-close-btn"
                onClick={cancelDelete}
                aria-label="Close"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="modal-form">
              <div className="delete-warning">
                <Trash2 size={48} strokeWidth={1.5} />
                <p>Enter the password to confirm deletion</p>
              </div>

              <div className="form-group">
                <label>Password</label>
                <input 
                  type="password"
                  required 
                  value={deletePassword} 
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="Enter your password"
                  autoFocus
                />
              </div>

              <div className="modal-actions">
                <button 
                  type="button" 
                  className="btn-secondary"
                  onClick={cancelDelete}
                >
                  Cancel
                </button>
                <button 
                  type="button"
                  className="btn-delete-confirm"
                  onClick={confirmDelete}
                >
                  <Trash2 size={18} />
                  {isBulkDelete ? `Delete Selected (${selectedIds.length})` : 'Delete Sale'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
