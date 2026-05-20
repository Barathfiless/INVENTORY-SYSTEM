import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ShopHeader from '../../components/ShopHeader';
import { orderAPI } from '../../api/api';
import { formatCurrency, formatDate } from '../../utils/format';

export default function Orders() {
  const { id } = useParams();
  const [orders, setOrders] = useState([]);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (id) {
        const { data } = await orderAPI.getById(id);
        setOrder(data);
      } else {
        const { data } = await orderAPI.getMy();
        setOrders(data);
      }
      setLoading(false);
    };
    load();
  }, [id]);

  if (loading) {
    return (
      <>
        <ShopHeader />
        <p className="loading-text container">Loading...</p>
      </>
    );
  }

  if (id && order) {
    return (
      <>
        <ShopHeader />
        <section className="container order-detail">
          <Link to="/orders">← Back to orders</Link>
          <h1>Order #{order._id.slice(-8).toUpperCase()}</h1>
          <p>Placed on {formatDate(order.createdAt)}</p>
          <p>Status: <span className={`status ${order.status}`}>{order.status}</span></p>
          <h3>Items</h3>
          <ul>
            {order.orderItems.map((item, idx) => (
              <li key={idx}>
                {item.name} x{item.quantity} — {formatCurrency(item.price * item.quantity)}
              </li>
            ))}
          </ul>
          <p><strong>Total:</strong> {formatCurrency(order.totalPrice)}</p>
          <h3>Shipping to</h3>
          <p>
            {order.shippingAddress.street}, {order.shippingAddress.city},{' '}
            {order.shippingAddress.state} {order.shippingAddress.zip}
          </p>
        </section>
      </>
    );
  }

  return (
    <>
      <ShopHeader />
      <section className="container orders-page">
        <h1>Your Orders</h1>
        {orders.length === 0 ? (
          <p>No orders yet. <Link to="/shop">Start shopping</Link></p>
        ) : (
          <ul className="orders-list">
            {orders.map((o) => (
              <li key={o._id} className="order-card">
                <p><strong>Order</strong> #{o._id.slice(-8).toUpperCase()}</p>
                <p>{formatDate(o.createdAt)}</p>
                <p>{formatCurrency(o.totalPrice)} — {o.orderItems.length} items</p>
                <p className={`status ${o.status}`}>{o.status}</p>
                <Link to={`/orders/${o._id}`}>View details</Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
