import { useEffect, useState, useRef } from 'react';
import { Package, Calendar, FileText, Plus, X, Upload, Image as ImageIcon, Trash2, ChevronLeft, ChevronRight, ShoppingBag, ArrowUpDown, SlidersHorizontal, Search } from 'lucide-react';
import { purchaseAPI, productAPI } from '../../api/api';
import { formatCurrency, formatDate } from '../../utils/format';
import CustomSelect from '../../components/CustomSelect';
import EcomSelect from '../../components/EcomSelect';

const PRODUCT_TYPES = ['Electronics', 'Fashion', 'Sports', 'Accessories'];

export default function Purchases() {
  const [purchases, setPurchases] = useState([]);
  const [message, setMessage] = useState('');

  const showMessage = (msg) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 10000);
  };
  const [showAddForm, setShowAddForm] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isBulkDelete, setIsBulkDelete] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [ecomLoading, setEcomLoading] = useState(null);

  // Search, Sort, Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('date-desc');
  const [filterType, setFilterType] = useState('all');
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
  const [form, setForm] = useState({
    productName: '',
    productType: '',
    quantity: 1,
    unitCost: 0,
    productImage: null,
    productImages: [],
    description: '',
    about: '',
  });

  const load = async () => {
    const pRes = await purchaseAPI.getAll();
    setPurchases(pRes.data);
  };

  useEffect(() => { load(); }, []);

  const handleEcomToggle = async (productId, currentlyActive) => {
    setEcomLoading(productId);
    try {
      await productAPI.update(productId, { isActive: !currentlyActive });
      setPurchases((prev) =>
        prev.map((p) =>
          p.product?._id === productId
            ? { ...p, product: { ...p.product, isActive: !currentlyActive } }
            : p
        )
      );
      showMessage(!currentlyActive ? 'Product pushed to e-commerce.' : 'Product reverted from e-commerce.');
      setTimeout(() => setMessage(''), 3000);
    } catch {
      showMessage('Failed to update e-commerce status.');
    } finally {
      setEcomLoading(null);
    }
  };

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
    if (!deletePassword) { alert('Password is required to delete.'); return; }
    try {
      if (isBulkDelete) {
        await Promise.all(
          selectedIds.map((id) =>
            purchaseAPI.delete(id, {
              headers: { 'Content-Type': 'application/json' },
              data: { password: deletePassword },
            })
          )
        );
        showMessage(`${selectedIds.length} purchases deleted successfully.`);
        setSelectedIds([]);
      } else {
        await purchaseAPI.delete(deleteId, {
          headers: { 'Content-Type': 'application/json' },
          data: { password: deletePassword },
        });
        showMessage('Purchase deleted successfully.');
        setSelectedIds((prev) => prev.filter((id) => id !== deleteId));
      }
      setShowDeleteModal(false);
      setDeletePassword('');
      setDeleteId(null);
      setIsBulkDelete(false);
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete. Invalid password or error occurred.');
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setDeletePassword('');
    setDeleteId(null);
    setIsBulkDelete(false);
  };

  const compressImage = (file, maxWidth = 1024, maxHeight = 1024, quality = 0.7) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to compressed JPEG data URL
          const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
          resolve(compressedBase64);
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      setForm({ ...form, productImages: files });
      
      const promises = files.map(file => compressImage(file));

      Promise.all(promises).then(previews => {
        setImagePreviews(previews);
        setImagePreview(previews[0]);
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    try {
      const productData = {
        name: form.productName,
        description: form.description || form.productName,
        about: form.about,
        sku: `SKU-${Date.now()}`,
        category: form.productType,
        brand: '',
        price: form.unitCost,
        costPrice: form.unitCost,
        stock: 0,
        lowStockThreshold: 10,
        image: imagePreview || '',
        images: imagePreviews,
        featured: false,
        isActive: false, // not on e-commerce until pushed
      };
      const productResponse = await productAPI.create(productData);
      const newProduct = productResponse.data;

      await purchaseAPI.create({
        productId: newProduct._id,
        quantity: form.quantity,
        unitCost: form.unitCost,
        supplier: 'Direct Purchase',
        invoiceNumber: '',
        notes: '',
      });

      setForm({ productName: '', productType: '', quantity: 1, unitCost: 0, productImage: null, productImages: [], description: '', about: '' });
      setImagePreview(null);
      setImagePreviews([]);
      setShowAddForm(false);
      showMessage('Purchase recorded successfully.');
      load();
    } catch (err) {
      showMessage(err.response?.data?.message || 'Failed to record purchase');
    }
  };

  const resetForm = () => {
    setForm({ productName: '', productType: '', quantity: 1, unitCost: 0, productImage: null, productImages: [], description: '', about: '' });
    setImagePreview(null);
    setImagePreviews([]);
  };

  // Filter & Sort logic
  const filteredAndSortedPurchases = purchases
    .filter((p) => {
      const name = p.product?.name || p.productName || '';
      const category = p.productType || p.product?.category || '';
      const matchesSearch = name.toLowerCase().includes(searchTerm.toLowerCase()) || category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = filterType === 'all' || category === filterType;
      return matchesSearch && matchesType;
    })
    .sort((a, b) => {
      if (sortBy === 'date-desc') return new Date(b.createdAt) - new Date(a.createdAt);
      if (sortBy === 'date-asc') return new Date(a.createdAt) - new Date(b.createdAt);
      if (sortBy === 'qty-desc') return b.quantity - a.quantity;
      if (sortBy === 'qty-asc') return a.quantity - b.quantity;
      if (sortBy === 'cost-desc') return b.unitCost - a.unitCost;
      if (sortBy === 'cost-asc') return a.unitCost - b.unitCost;
      if (sortBy === 'total-desc') return b.totalCost - a.totalCost;
      if (sortBy === 'total-asc') return a.totalCost - b.totalCost;
      return 0;
    });

  // Pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentPurchases = filteredAndSortedPurchases.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredAndSortedPurchases.length / itemsPerPage);

  return (
    <section className="admin-page">
      <header className="admin-page-header">
        <h1>Purchase Records</h1>
      </header>

      {message && <p className="alert success">{message}</p>}

      {/* Table Toolbar */}
      <div className="table-toolbar">
            {/* Left Side: Active Filters or Search Input */}
            <div className="table-toolbar-left">
              {filterType !== 'all' && (
                <span className="filter-badge">
                  Category: {filterType}
                  <button onClick={() => setFilterType('all')} className="badge-close">
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
                onClick={() => { resetForm(); setShowAddForm(true); }}
                title="Add Purchase"
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
                    <button className={`dropdown-item ${sortBy === 'cost-desc' ? 'selected' : ''}`} onClick={() => { setSortBy('cost-desc'); setShowSortDropdown(false); }}>Unit Cost (High to Low)</button>
                    <button className={`dropdown-item ${sortBy === 'cost-asc' ? 'selected' : ''}`} onClick={() => { setSortBy('cost-asc'); setShowSortDropdown(false); }}>Unit Cost (Low to High)</button>
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
                    <button className={`dropdown-item ${filterType === 'all' ? 'selected' : ''}`} onClick={() => { setFilterType('all'); setShowFilterDropdown(false); }}>All Categories</button>
                    {PRODUCT_TYPES.map((type) => (
                      <button key={type} className={`dropdown-item ${filterType === type ? 'selected' : ''}`} onClick={() => { setFilterType(type); setShowFilterDropdown(false); }}>{type}</button>
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
                    placeholder="Search products..."
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

          {purchases.length === 0 ? (
            <div className="empty-state">
              <Package size={48} strokeWidth={1.5} />
              <h3>No purchases recorded yet</h3>
              <p>Purchase records will appear here once added</p>
            </div>
          ) : (
            <>
              {filteredAndSortedPurchases.length === 0 ? (
                <div className="empty-state">
                  <Search size={48} strokeWidth={1.5} />
                  <h3>No matching purchases found</h3>
              <p>Try adjusting your search query or filters</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="data-table purchases-table purchases-page-table">
                <thead>
                  <tr>
                    <th>
                      <input 
                        type="checkbox" 
                        className="table-header-checkbox"
                        checked={currentPurchases.length > 0 && currentPurchases.every((item) => selectedIds.includes(item._id))}
                        onChange={(e) => {
                          if (e.target.checked) {
                            const pageIds = currentPurchases.map((item) => item._id);
                            setSelectedIds((prev) => Array.from(new Set([...prev, ...pageIds])));
                          } else {
                            const pageIds = currentPurchases.map((item) => item._id);
                            setSelectedIds((prev) => prev.filter((id) => !pageIds.includes(id)));
                          }
                        }}
                      />
                    </th>
                    <th>S.No</th>
                    <th>Image</th>
                    <th>Date</th>
                    <th>Product</th>
                    <th>Category</th>
                    <th>Qty</th>
                    <th>Unit Cost</th>
                    <th>Total</th>
                    <th>E-commerce</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentPurchases.map((p, index) => {
                    const productId = p.product?._id;
                    const isActive = p.product?.isActive ?? false;
                    const isToggling = ecomLoading === productId;
                    return (
                      <tr key={p._id}>
                        <td className="checkbox-cell">
                          <input 
                            type="checkbox" 
                            className="table-row-checkbox"
                            checked={selectedIds.includes(p._id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedIds((prev) => [...prev, p._id]);
                              } else {
                                setSelectedIds((prev) => prev.filter((id) => id !== p._id));
                              }
                            }}
                          />
                        </td>
                        <td className="sno-cell">{indexOfFirstItem + index + 1}</td>
                        <td className="image-cell">
                          {p.product?.image ? (
                            <img src={p.product.image} alt={p.product.name} className="product-thumbnail" />
                          ) : (
                            <div className="no-image"><Package size={20} /></div>
                          )}
                        </td>
                        <td className="date-cell">{formatDate(p.createdAt)}</td>
                        <td className="product-cell">
                          <strong>{p.product?.name || p.productName || '—'}</strong>
                        </td>
                        <td className="category-cell">
                          <span className="category-badge-blue">{p.productType || p.product?.category || '—'}</span>
                        </td>
                        <td className="qty-cell">
                          <span className="qty-badge">{p.quantity}</span>
                        </td>
                        <td className="cost-cell">{formatCurrency(p.unitCost)}</td>
                        <td className="total-cell">
                          <strong>{formatCurrency(p.totalCost)}</strong>
                        </td>

                        {/* E-commerce column */}
                        <td className="ecom-cell">
                          <EcomSelect
                            value={isActive ? 'live' : 'off'}
                            disabled={isToggling || !productId}
                            onChange={() => handleEcomToggle(productId, isActive)}
                          />
                        </td>

                        <td className="actions-cell">
                          <button className="btn-delete" onClick={() => handleDelete(p._id)} title="Delete purchase">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Pagination */}
      {filteredAndSortedPurchases.length > itemsPerPage && (
        <div className="pagination-controls">
          <button className="pagination-btn" onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))} disabled={currentPage === 1}>
            <ChevronLeft size={18} /> Previous
          </button>
          <span className="pagination-info">Page {currentPage} of {totalPages}</span>
          <button className="pagination-btn" onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}>
            Next <ChevronRight size={18} />
          </button>
        </div>
      )}

      {/* Add Purchase Modal */}
      {showAddForm && (
        <div className="modal-overlay" onClick={() => { setShowAddForm(false); resetForm(); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add New Purchase</h2>
              <button className="modal-close-btn" onClick={() => { setShowAddForm(false); resetForm(); }} aria-label="Close">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-group">
                <label>Product Name</label>
                <input type="text" required value={form.productName} onChange={(e) => setForm({ ...form, productName: e.target.value })} placeholder="Enter product name" />
              </div>
              <div className="form-group">
                <label htmlFor="product-type">Category</label>
                <CustomSelect
                  id="product-type"
                  options={PRODUCT_TYPES}
                  value={form.productType}
                  onChange={(val) => setForm({ ...form, productType: val })}
                  placeholder="Select Category"
                  required
                />
              </div>
              <div className="form-group">
                <label>Product Description</label>
                <textarea 
                  required 
                  value={form.description} 
                  onChange={(e) => setForm({ ...form, description: e.target.value })} 
                  placeholder="Enter product description"
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '0.65rem 1rem',
                    fontSize: '0.95rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-light)',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                    resize: 'vertical'
                  }}
                />
              </div>
              <div className="form-group">
                <label>About Product (Key features separated by periods)</label>
                <textarea 
                  required 
                  value={form.about} 
                  onChange={(e) => setForm({ ...form, about: e.target.value })} 
                  placeholder="Enter key features separated by periods"
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '0.65rem 1rem',
                    fontSize: '0.95rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-light)',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                    resize: 'vertical'
                  }}
                />
              </div>
              <div className="form-group">
                <label>Product Images</label>
                <div className="image-upload-container">
                  <input type="file" id="productImage" accept="image/*" onChange={handleImageChange} className="image-input-hidden" multiple />
                  <label htmlFor="productImage" className="image-upload-label">
                    {imagePreviews.length > 0 ? (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', width: '100%', padding: '0.5rem' }}>
                        {imagePreviews.map((preview, idx) => (
                          <div key={idx} style={{ position: 'relative', aspectRatio: '1', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border-light)' }}>
                            <img src={preview} alt={`Preview ${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            {idx === 0 && (
                              <span style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0, 128, 96, 0.85)', color: '#fff', fontSize: '0.65rem', padding: '2px 4px', textAlign: 'center', fontWeight: 'bold' }}>
                                Primary
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="image-upload-placeholder">
                        <ImageIcon size={48} strokeWidth={1.5} />
                        <span>Click to upload images</span>
                        <small>Select one or more images</small>
                      </div>
                    )}
                  </label>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Quantity</label>
                  <input type="number" min="1" required value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} />
                </div>
                <div className="form-group">
                  <label>Unit Cost (₹)</label>
                  <input type="number" min="0" step="0.01" required value={form.unitCost} onChange={(e) => setForm({ ...form, unitCost: Number(e.target.value) })} />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => { setShowAddForm(false); resetForm(); }}>Cancel</button>
                <button type="submit" className="btn-submit">Submit Purchase</button>
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
              <h2>{isBulkDelete ? 'Delete Selected Purchases' : 'Delete Purchase'}</h2>
              <button className="modal-close-btn" onClick={cancelDelete} aria-label="Close"><X size={24} /></button>
            </div>
            <div className="modal-form">
              <div className="delete-warning">
                <Trash2 size={48} strokeWidth={1.5} />
                <p>Enter the password to confirm deletion</p>
              </div>
              <div className="form-group">
                <label>Password</label>
                <input type="password" required value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} placeholder="Enter your password" autoFocus />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={cancelDelete}>Cancel</button>
                <button type="button" className="btn-delete-confirm" onClick={confirmDelete}>
                  <Trash2 size={18} /> {isBulkDelete ? `Delete Selected (${selectedIds.length})` : 'Delete Purchase'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
