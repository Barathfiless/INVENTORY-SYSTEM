import { useEffect, useState } from 'react';
import { orderAPI } from '../../api/api';
import { formatCurrency, formatDate } from '../../utils/format';

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);

  const load = () => orderAPI.getAll().then(({ data }) => setOrders(data));
  useEffect(() => { load(); }, []);

  const updateStatus = async (id, status) => {
    await orderAPI.updateStatus(id, { status });
    load();
  };

  return (
    <section className="admin-page">
      <h1>E-commerce Orders</h1>
      <p className="subtitle">Manage customer orders from the online store</p>
      <table className="data-table">
        <thead>
          <tr><th>Order</th><th>Customer</th><th>Date</th><th>Items</th><th>Total</th><th>Status</th><th>Actions</th></tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o._id}>
              <td>#{o._id.slice(-8).toUpperCase()}</td>
              <td>{o.user?.name}<br /><small>{o.user?.email}</small></td>
              <td>{formatDate(o.createdAt)}</td>
              <td>{o.orderItems.length}</td>
              <td>{formatCurrency(o.totalPrice)}</td>
              <td><span className={`status ${o.status}`}>{o.status}</span></td>
              <td>
                <select value={o.status} onChange={(e) => updateStatus(o._id, e.target.value)}>
                  <option value="pending">pending</option>
                  <option value="processing">processing</option>
                  <option value="shipped">shipped</option>
                  <option value="delivered">delivered</option>
                  <option value="cancelled">cancelled</option>
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
