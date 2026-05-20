import { useEffect, useState } from 'react';
import { Package, Calendar, User, Plus, X, ChevronLeft, ChevronRight, Trash2, Image as ImageIcon } from 'lucide-react';
import { saleAPI, productAPI } from '../../api/api';
import { formatCurrency, formatDate } from '../../utils/format';

export default function Sales() {
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [message, setMessage] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [form, setForm] = useState({
    productId: '',
    quantity: 1,
    unitPrice: 0,
    customerName: '',
  });

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
    setDeleteId(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!deletePassword) {
      alert('Password is required to delete.');
      return;
    }
    
    try {
      await saleAPI.delete(deleteId, { 
        headers: {
          'Content-Type': 'application/json',
        },
        data: { 
          password: deletePassword 
        }
      });
      
      setMessage('Sale deleted successfully.');
      setShowDeleteModal(false);
      setDeletePassword('');
      setDeleteId(null);
      load();
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to delete sale. Invalid password or error occurred.';
      alert(errorMessage);
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setDeletePassword('');
    setDeleteId(null);
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

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentSales = sales.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(sales.length / itemsPerPage);

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
          className="btn-add-primary"
          onClick={() => {
            setForm({ productId: '', quantity: 1, unitPrice: 0, customerName: '' });
            setShowAddForm(true);
          }}
        >
          <Plus size={18} />
          Add Sale
        </button>
      </div>

      {sales.length === 0 ? (
        <div className="empty-state">
          <Package size={48} strokeWidth={1.5} />
          <h3>No sales recorded yet</h3>
          <p>Sales records will appear here once added</p>
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
                <th>Qty</th>
                <th>Unit Price</th>
                <th>Total</th>
                <th><User size={16} /> Customer</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentSales.map((s, index) => (
                <tr key={s._id}>
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

      {/* Pagination Controls */}
      {sales.length > itemsPerPage && (
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
                <select 
                  required 
                  value={form.productId} 
                  onChange={(e) => {
                    const p = products.find((x) => x._id === e.target.value);
                    setForm({ ...form, productId: e.target.value, unitPrice: p?.price || 0 });
                  }}
                >
                  <option value="">Select product</option>
                  {products.map((p) => (
                    <option key={p._id} value={p._id}>
                      {p.name} (Stock: {p.stock})
                    </option>
                  ))}
                </select>
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
              <h2>Delete Sale</h2>
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
                  Delete Sale
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
