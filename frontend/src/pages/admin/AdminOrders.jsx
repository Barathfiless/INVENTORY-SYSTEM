import { useEffect, useState } from 'react';
import { ShoppingCart, User, Calendar, Package, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { orderAPI } from '../../api/api';
import { formatCurrency, formatDate } from '../../utils/format';

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

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

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentOrders = orders.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(orders.length / itemsPerPage);

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
          <div className="table-container">
            <table className="data-table purchases-table">
              <thead>
                <tr>
                  <th>S.No</th>
                  <th>Order ID</th>
                  <th><User size={16} /> Customer</th>
                  <th><Calendar size={16} /> Date</th>
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
                      <span className={`order-status-badge ${getStatusClass(o.status)}`}>
                        {o.status}
                      </span>
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
                        <select 
                          className="status-select"
                          value={o.status} 
                          onChange={(e) => updateStatus(o._id, e.target.value)}
                        >
                          <option value="pending">Pending</option>
                          <option value="processing">Processing</option>
                          <option value="shipped">Shipped</option>
                          <option value="delivered">Delivered</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {orders.length > itemsPerPage && (
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
                  <p><strong>Name:</strong> {selectedOrder.user?.name}</p>
                  <p><strong>Email:</strong> {selectedOrder.user?.email}</p>
                </div>
                
                <div className="info-card">
                  <h4><Package size={18} /> Shipping Address</h4>
                  <p>{selectedOrder.shippingAddress?.street}</p>
                  <p>{selectedOrder.shippingAddress?.city}, {selectedOrder.shippingAddress?.state}</p>
                  <p>{selectedOrder.shippingAddress?.zip}, {selectedOrder.shippingAddress?.country}</p>
                </div>
              </div>

              <div className="order-items-section">
                <h4><ShoppingCart size={18} /> Order Items</h4>
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
                        <td><strong>{item.product?.name}</strong></td>
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
      )}
    </section>
  );
}
