import { useEffect, useState } from 'react';
import { Package, Calendar, Hash, FileText, User, Plus, X, Upload, Image as ImageIcon, Trash2, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { purchaseAPI, productAPI } from '../../api/api';
import { formatCurrency, formatDate } from '../../utils/format';

export default function Purchases() {
  const [purchases, setPurchases] = useState([]);
  const [products, setProducts] = useState([]);
  const [message, setMessage] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [form, setForm] = useState({
    productName: '',
    productType: '',
    quantity: 1,
    unitCost: 0,
    productImage: null,
  });

  const load = async () => {
    const [pRes, prodRes] = await Promise.all([
      purchaseAPI.getAll(),
      productAPI.getAdminAll()
    ]);
    setPurchases(pRes.data);
    setProducts(prodRes.data);
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id) => {
    setDeleteId(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!deletePassword) {
      alert('Password is required to delete.');
      return;
    }
    
    try {
      // Send password in request body
      await purchaseAPI.delete(deleteId, { 
        headers: {
          'Content-Type': 'application/json',
        },
        data: { 
          password: deletePassword 
        }
      });
      
      setMessage('Purchase deleted successfully.');
      setShowDeleteModal(false);
      setDeletePassword('');
      setDeleteId(null);
      load();
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to delete purchase. Invalid password or error occurred.';
      alert(errorMessage);
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setDeletePassword('');
    setDeleteId(null);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setForm({ ...form, productImage: file });
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    try {
      // First, create the product
      const productData = {
        name: form.productName,
        description: form.productName, // Using name as description
        sku: `SKU-${Date.now()}`, // Generate unique SKU
        category: form.productType,
        brand: '',
        price: form.unitCost, // Using unit cost as selling price
        costPrice: form.unitCost,
        stock: 0, // Will be updated by purchase
        lowStockThreshold: 10,
        image: imagePreview || '', // Use the base64 image preview
        featured: false,
        isActive: true,
      };

      const productResponse = await productAPI.create(productData);
      const newProduct = productResponse.data;

      // Then create the purchase with the new product ID
      const purchaseData = {
        productId: newProduct._id,
        quantity: form.quantity,
        unitCost: form.unitCost,
        supplier: 'Direct Purchase', // Default supplier
        invoiceNumber: '',
        notes: '',
      };

      await purchaseAPI.create(purchaseData);
      
      // Reset form and close modal
      setForm({ productName: '', productType: '', quantity: 1, unitCost: 0, productImage: null });
      setImagePreview(null);
      setShowAddForm(false);
      setMessage('Purchase recorded successfully.');
      
      // Reload the purchases list
      load();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed to record purchase');
    }
  };

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentPurchases = purchases.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(purchases.length / itemsPerPage);

  const handlePrevious = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNext = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  return (
    <section className="admin-page">
      {message && <p className="alert success">{message}</p>}
      
      <div className="page-header-actions">
        <button 
          className="btn-filter"
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter size={18} />
          Filters
        </button>
        <button 
          className="btn-add-primary"
          onClick={() => {
            // Reset form when opening modal
            setForm({ productName: '', productType: '', quantity: 1, unitCost: 0, productImage: null });
            setImagePreview(null);
            setShowAddForm(true);
          }}
        >
          <Plus size={18} />
          Add Purchase
        </button>
      </div>

      {purchases.length === 0 ? (
        <div className="empty-state">
          <Package size={48} strokeWidth={1.5} />
          <h3>No purchases recorded yet</h3>
          <p>Purchase records will appear here once added</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table purchases-table">
            <thead>
              <tr>
                <th>S.No</th>
                <th><ImageIcon size={16} /> Image</th>
                <th><Calendar size={16} /> Date</th>
                <th><Package size={16} /> Product</th>
                <th><FileText size={16} /> Type</th>
                <th>Qty</th>
                <th>Unit Cost</th>
                <th>Total</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentPurchases.map((p, index) => (
                <tr key={p._id}>
                  <td className="sno-cell">{indexOfFirstItem + index + 1}</td>
                  <td className="image-cell">
                    {p.product?.image ? (
                      <img 
                        src={p.product.image} 
                        alt={p.product.name}
                        className="product-thumbnail"
                      />
                    ) : (
                      <div className="no-image">
                        <Package size={20} />
                      </div>
                    )}
                  </td>
                  <td className="date-cell">{formatDate(p.createdAt)}</td>
                  <td className="product-cell">
                    <strong>{p.product?.name || p.productName || '—'}</strong>
                  </td>
                  <td className="type-cell">{p.productType || p.product?.category || '—'}</td>
                  <td className="qty-cell">
                    <span className="qty-badge">{p.quantity}</span>
                  </td>
                  <td className="cost-cell">{formatCurrency(p.unitCost)}</td>
                  <td className="total-cell">
                    <strong>{formatCurrency(p.totalCost)}</strong>
                  </td>
                  <td className="actions-cell">
                    <button 
                      className="btn-delete"
                      onClick={() => handleDelete(p._id)}
                      title="Delete purchase"
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

      {/* Pagination Controls */}
      {purchases.length > itemsPerPage && (
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

      {/* Add Purchase Modal */}
      {showAddForm && (
        <div className="modal-overlay" onClick={() => {
          setShowAddForm(false);
          setForm({ productName: '', productType: '', quantity: 1, unitCost: 0, productImage: null });
          setImagePreview(null);
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add New Purchase</h2>
              <button 
                className="modal-close-btn"
                onClick={() => {
                  setShowAddForm(false);
                  setForm({ productName: '', productType: '', quantity: 1, unitCost: 0, productImage: null });
                  setImagePreview(null);
                }}
                aria-label="Close"
              >
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-group">
                <label>Product Name</label>
                <input 
                  type="text"
                  required 
                  value={form.productName} 
                  onChange={(e) => setForm({ ...form, productName: e.target.value })}
                  placeholder="Enter product name"
                />
              </div>

              <div className="form-group">
                <label>Product Type</label>
                <input 
                  type="text"
                  required 
                  value={form.productType} 
                  onChange={(e) => setForm({ ...form, productType: e.target.value })}
                  placeholder="Enter product type"
                />
              </div>

              <div className="form-group">
                <label>Product Image</label>
                <div className="image-upload-container">
                  <input 
                    type="file"
                    id="productImage"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="image-input-hidden"
                  />
                  <label htmlFor="productImage" className="image-upload-label">
                    {imagePreview ? (
                      <div className="image-preview">
                        <img src={imagePreview} alt="Product preview" />
                        <div className="image-overlay">
                          <Upload size={24} />
                          <span>Change Image</span>
                        </div>
                      </div>
                    ) : (
                      <div className="image-upload-placeholder">
                        <ImageIcon size={48} strokeWidth={1.5} />
                        <span>Click to upload image</span>
                        <small>PNG, JPG, GIF up to 10MB</small>
                      </div>
                    )}
                  </label>
                </div>
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
                  <label>Unit Cost (₹)</label>
                  <input 
                    type="number" 
                    min="0" 
                    step="0.01"
                    required 
                    value={form.unitCost} 
                    onChange={(e) => setForm({ ...form, unitCost: Number(e.target.value) })} 
                  />
                </div>
              </div>

              <div className="modal-actions">
                <button 
                  type="button" 
                  className="btn-secondary"
                  onClick={() => {
                    setShowAddForm(false);
                    setForm({ productName: '', productType: '', quantity: 1, unitCost: 0, productImage: null });
                    setImagePreview(null);
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-submit">
                  Submit Purchase
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
              <h2>Delete Purchase</h2>
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
                  Delete Purchase
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
