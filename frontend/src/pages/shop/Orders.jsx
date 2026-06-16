import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ShopHeader from '../../components/ShopHeader';
import DeliveryMap from '../../components/DeliveryMap';
import { orderAPI } from '../../api/api';
import { formatCurrency, formatDate } from '../../utils/format';
import { AlertTriangle, Trash2, Calendar, ShieldCheck, ArrowLeft } from 'lucide-react';

export default function Orders() {
  const { id } = useParams();
  const [orders, setOrders] = useState([]);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        if (id) {
          const { data } = await orderAPI.getById(id);
          setOrder(data);
        } else {
          const { data } = await orderAPI.getMy();
          setOrders(data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id]);

  const handleCancelOrder = async () => {
    if (!window.confirm('Are you sure you want to cancel this order? This action will immediately restore stock units back to our catalog.')) {
      return;
    }
    setCancelling(true);
    setCancelError('');
    try {
      const { data } = await orderAPI.cancel(order._id);
      setOrder(data);
    } catch (err) {
      setCancelError(err.response?.data?.message || 'Order cancellation failed.');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <>
        <ShopHeader />
        <p className="loading-text container">Loading orders details...</p>
      </>
    );
  }

  if (id && order) {
    const isCancellable = order.status === 'pending' || order.status === 'processing';

    return (
      <>
        <ShopHeader />
        <section className="container order-detail" style={{ maxWidth: '1000px' }}>
          <Link to="/orders" style={detailStyles.backLink}>
            <ArrowLeft size={16} /> <span>Back to Orders</span>
          </Link>
          
          <div style={detailStyles.headerCard}>
            <div>
              <h1 style={detailStyles.orderTitle}>Order #{order._id.slice(-8).toUpperCase()}</h1>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '0.4rem', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                <span>Placed: <strong>{formatDate(order.createdAt)}</strong></span>
                <span>Payment: <strong>{order.paymentMethod} {order.isPaid ? ' (Paid ✅)' : ''}</strong></span>
              </div>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span className={`status ${order.status}`} style={{ margin: 0, textTransform: 'uppercase', fontWeight: 800, fontSize: '0.85rem' }}>
                {order.status}
              </span>
              
              {isCancellable && (
                <button 
                  type="button" 
                  onClick={handleCancelOrder}
                  disabled={cancelling}
                  style={detailStyles.btnCancel}
                >
                  <Trash2 size={15} />
                  <span>{cancelling ? 'Cancelling...' : 'Cancel Order'}</span>
                </button>
              )}
            </div>
          </div>

          {cancelError && (
            <div className="alert error" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem' }}>
              <AlertTriangle size={16} /> <span>{cancelError}</span>
            </div>
          )}
          
          {/* Swiggy-Style Live Delivery Map Tracker */}
          <DeliveryMap order={order} />

          <div style={detailStyles.detailsGrid}>
            <div style={detailStyles.card}>
              <h3 style={detailStyles.cardTitle}>Product Summary</h3>
              <ul style={detailStyles.itemsList}>
                {order.orderItems.map((item, idx) => (
                  <li key={idx} style={detailStyles.itemRow}>
                    <span style={{ fontWeight: 650, color: 'var(--text-main)' }}>{item.name} <strong style={{ color: 'var(--text-muted)' }}>x{item.quantity}</strong></span>
                    <strong>{formatCurrency(item.price * item.quantity)}</strong>
                  </li>
                ))}
              </ul>
              <div style={detailStyles.totalRow}>
                <span>Order Total:</span>
                <span>{formatCurrency(order.totalPrice)}</span>
              </div>
            </div>

            <div style={detailStyles.card}>
              <h3 style={detailStyles.cardTitle}>Shipping Details</h3>
              <div style={detailStyles.addressBox}>
                <div style={{ fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                  {order.user?.name || 'Customer Address'}
                </div>
                <p style={{ color: '#475569', fontSize: '0.92rem', lineHeight: '1.5' }}>
                  {order.shippingAddress.street}, {order.shippingAddress.city},<br />
                  {order.shippingAddress.state} — <strong>{order.shippingAddress.zip}</strong><br />
                  {order.shippingAddress.country}
                </p>
              </div>
              <div style={detailStyles.safetyBadge}>
                <ShieldCheck size={16} style={{ color: 'var(--success)' }} />
                <span>Stocksync Verified Order Tracking</span>
              </div>
            </div>
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      <ShopHeader />
      <section className="container orders-page" style={{ maxWidth: '1000px' }}>
        <h1 style={{ fontWeight: 800, letterSpacing: '-0.04em', marginBottom: '1.5rem' }}>Your Orders</h1>
        {orders.length === 0 ? (
          <article className="empty-cart" style={{ textAlign: 'center', padding: '3rem', background: '#fff', borderRadius: '16px', border: '1px solid var(--border-light)' }}>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontWeight: 650 }}>No orders placed yet.</p>
            <Link to="/shop" className="btn-primary">Start Shopping</Link>
          </article>
        ) : (
          <ul className="orders-list" style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {orders.map((o) => (
              <li key={o._id} className="order-card" style={listStyles.card}>
                <div style={listStyles.body}>
                  <div>
                    <p style={listStyles.hash}>Order <strong>#{o._id.slice(-8).toUpperCase()}</strong></p>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                      Placed on {formatDate(o.createdAt)}
                    </p>
                  </div>
                  <div>
                    <span style={listStyles.price}>{formatCurrency(o.totalPrice)}</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}> ({o.orderItems.length} items)</span>
                  </div>
                  <span className={`status ${o.status}`} style={{ margin: 0, textTransform: 'uppercase', fontSize: '0.75rem', fontWeight: 800 }}>
                    {o.status}
                  </span>
                  <Link to={`/orders/${o._id}`} style={listStyles.viewLink}>
                    View Tracker ➔
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

const detailStyles = {
  backLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.35rem',
    fontSize: '0.9rem',
    fontWeight: 600,
    marginBottom: '1rem',
  },
  headerCard: {
    background: '#fff',
    border: '1px solid var(--border-light)',
    borderRadius: '16px',
    padding: '1.25rem 1.5rem',
    boxShadow: 'var(--shadow-sm)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '1rem',
  },
  orderTitle: {
    fontSize: '1.5rem',
    fontWeight: 850,
    color: '#0f172a',
    letterSpacing: '-0.03em',
    margin: 0,
  },
  btnCancel: {
    background: 'rgba(239, 68, 68, 0.08)',
    border: '1px solid rgba(239, 68, 68, 0.25)',
    borderRadius: '8px',
    color: 'var(--danger)',
    padding: '0.45rem 1rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    fontSize: '0.85rem',
    fontWeight: 700,
    transition: 'var(--transition-normal)',
    cursor: 'pointer',
  },
  detailsGrid: {
    display: 'grid',
    gridTemplateColumns: '1.2fr 0.8fr',
    gap: '1.5rem',
    marginTop: '1.5rem',
  },
  card: {
    background: '#fff',
    border: '1px solid var(--border-light)',
    borderRadius: '16px',
    padding: '1.5rem',
    boxShadow: 'var(--shadow-sm)',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  cardTitle: {
    fontSize: '1.05rem',
    fontWeight: 800,
    color: '#0f172a',
    borderBottom: '1px solid var(--border-light)',
    paddingBottom: '0.65rem',
    marginBottom: '1rem',
  },
  itemsList: {
    listStyle: 'none',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  itemRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '0.92rem',
  },
  totalRow: {
    marginTop: 'auto',
    borderTop: '1px solid var(--border-light)',
    paddingTop: '0.85rem',
    display: 'flex',
    justifyContent: 'space-between',
    fontWeight: 800,
    fontSize: '1.1rem',
    color: 'var(--text-main)',
  },
  addressBox: {
    background: '#f8fafc',
    border: '1px solid var(--border-light)',
    borderRadius: '12px',
    padding: '1rem',
  },
  safetyBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    marginTop: '1rem',
    fontSize: '0.75rem',
    color: '#64748b',
    fontWeight: 500,
  }
};

const listStyles = {
  card: {
    background: '#fff',
    border: '1px solid var(--border-light)',
    borderRadius: '14px',
    padding: '1.25rem',
    boxShadow: 'var(--shadow-sm)',
    transition: 'var(--transition-normal)',
  },
  body: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '1rem',
  },
  hash: {
    fontSize: '0.95rem',
    color: '#0f172a',
    margin: 0,
  },
  price: {
    fontWeight: 800,
    color: 'var(--text-main)',
    fontSize: '1.05rem',
  },
  viewLink: {
    fontWeight: 700,
    fontSize: '0.88rem',
    color: 'var(--brand-primary)',
  }
};
