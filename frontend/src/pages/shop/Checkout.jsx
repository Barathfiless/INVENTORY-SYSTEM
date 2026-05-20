import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import ShopHeader from '../../components/ShopHeader';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { orderAPI } from '../../api/api';
import { formatCurrency } from '../../utils/format';

export default function Checkout() {
  const { cartItems, cartTotal, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [address, setAddress] = useState({
    street: user?.address?.street || '',
    city: user?.address?.city || '',
    state: user?.address?.state || '',
    zip: user?.address?.zip || '',
    country: 'India',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const shipping = cartTotal > 499 ? 0 : 49;
  const tax = Math.round(cartTotal * 0.18 * 100) / 100;
  const total = cartTotal + shipping + tax;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      navigate('/');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const orderItems = cartItems.map((i) => ({ product: i._id, quantity: i.qty }));
      const { data } = await orderAPI.create({
        orderItems,
        shippingAddress: address,
        paymentMethod: 'COD',
      });
      clearCart();
      navigate(`/orders/${data._id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Order failed');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <>
        <ShopHeader />
        <section className="container">
          <p>Please <Link to="/">sign in</Link> to checkout.</p>
        </section>
      </>
    );
  }

  return (
    <>
      <ShopHeader />
      <section className="container checkout-page">
        <h1>Checkout</h1>
        {error && <p className="alert error">{error}</p>}
        <form onSubmit={handleSubmit} className="checkout-layout">
          <fieldset className="checkout-form">
            <h3>Shipping Address</h3>
            <label>Street</label>
            <input required value={address.street} onChange={(e) => setAddress({ ...address, street: e.target.value })} />
            <label>City</label>
            <input required value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} />
            <label>State</label>
            <input required value={address.state} onChange={(e) => setAddress({ ...address, state: e.target.value })} />
            <label>ZIP</label>
            <input required value={address.zip} onChange={(e) => setAddress({ ...address, zip: e.target.value })} />
            <label>Payment</label>
            <p className="cod-note">Cash on Delivery (COD)</p>
            <button type="submit" className="btn-primary" disabled={loading || cartItems.length === 0}>
              {loading ? 'Placing Order...' : 'Place Order'}
            </button>
          </fieldset>
          <aside className="checkout-summary">
            <h3>Order ({cartItems.length} items)</h3>
            {cartItems.map((i) => (
              <p key={i._id}>{i.name} x{i.qty}</p>
            ))}
            <hr />
            <p>Subtotal: {formatCurrency(cartTotal)}</p>
            <p>Shipping: {shipping === 0 ? 'FREE' : formatCurrency(shipping)}</p>
            <p>Tax: {formatCurrency(tax)}</p>
            <p className="total-row">Total: {formatCurrency(total)}</p>
          </aside>
        </form>
      </section>
    </>
  );
}
