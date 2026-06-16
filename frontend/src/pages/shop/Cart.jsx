import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import ShopHeader from '../../components/ShopHeader';
import { useCart } from '../../context/CartContext';
import { formatCurrency } from '../../utils/format';
import { 
  Trash2, 
  MapPin, 
  Calendar, 
  ShoppingBag, 
  ShieldCheck, 
  ArrowRight, 
  Info, 
  Truck 
} from 'lucide-react';

export default function Cart() {
  const { cartItems, updateQty, removeFromCart, cartTotal } = useCart();
  const navigate = useNavigate();

  // Pincode validation states
  const [pincode, setPincode] = useState(() => localStorage.getItem('stocksync_pincode') || '');
  const [pinEstimate, setPinEstimate] = useState(null);
  const [checkingPin, setCheckingPin] = useState(false);
  const [pinError, setPinError] = useState('');

  const shipping = cartTotal > 499 ? 0 : 49;
  const tax = Math.round(cartTotal * 0.18 * 100) / 100;
  const total = cartTotal + shipping + tax;

  // Run dynamic calculation if pincode is already cached in localStorage
  useEffect(() => {
    if (pincode && pincode.trim().length === 6 && /^\d+$/.test(pincode)) {
      calculateDelivery(pincode);
    }
  }, []);

  const calculateDelivery = (code) => {
    setCheckingPin(true);
    setPinError('');
    
    setTimeout(() => {
      if (code.length === 6 && /^\d+$/.test(code)) {
        const firstDigit = parseInt(code[0]);
        let days = 3;
        if (firstDigit === 1 || firstDigit === 2) days = 3; // North India
        else if (firstDigit === 3 || firstDigit === 4) days = 4; // West / Central
        else if (firstDigit === 5 || firstDigit === 6) days = 2; // South India (Near Hub)
        else if (firstDigit === 7 || firstDigit === 8) days = 5; // East India
        else if (firstDigit === 9) days = 6; // Northeast / Remote

        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + days);

        const options = { weekday: 'long', day: 'numeric', month: 'long' };
        const formattedDate = targetDate.toLocaleDateString('en-IN', options);

        setPinEstimate({
          dateStr: formattedDate,
          days,
          code
        });
        localStorage.setItem('stocksync_pincode', code);
      } else {
        setPinError('Invalid PIN code. Enter a 6-digit Indian PIN.');
        setPinEstimate(null);
      }
      setCheckingPin(false);
    }, 600);
  };

  const handlePinCheck = (e) => {
    e.preventDefault();
    calculateDelivery(pincode);
  };

  return (
    <>
      <ShopHeader />
      <section className="shop-page container cart-page">
        <h1 style={{ fontWeight: 800, letterSpacing: '-0.04em', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <ShoppingBag style={{ color: 'var(--brand-primary)' }} /> Shopping Cart
        </h1>

        {cartItems.length === 0 ? (
          <article className="empty-cart" style={cartStyles.emptyContainer}>
            <ShoppingBag size={48} style={{ color: 'var(--text-muted)', marginBottom: '1rem' }} />
            <p style={{ fontWeight: 650, fontSize: '1.25rem', color: 'var(--text-main)', marginBottom: '0.5rem' }}>Your Cart is Empty</p>
            <p style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '1.5rem' }}>Add products from the store directory to finalize orders.</p>
            <Link to="/shop" className="btn-primary" style={{ padding: '0.75rem 2rem' }}>Continue Shopping</Link>
          </article>
        ) : (
          <section className="cart-layout">
            <ul className="cart-items">
              {cartItems.map((item) => (
                <li key={item._id} className="cart-item">
                  <div style={cartStyles.imageWrap}>
                    <img src={item.image} alt={item.name} style={cartStyles.image} />
                  </div>
                  
                  <article className="cart-item-info">
                    <Link to={`/product/${item._id}`} style={cartStyles.itemTitle}>
                      {item.name}
                    </Link>
                    <p style={cartStyles.priceText}>{formatCurrency(item.price)}</p>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginTop: '0.25rem' }}>
                      <div className="qty-controls" style={{ margin: 0 }}>
                        <button type="button" onClick={() => updateQty(item._id, item.qty - 1)}>−</button>
                        <span>{item.qty}</span>
                        <button type="button" onClick={() => updateQty(item._id, item.qty + 1)}>+</button>
                      </div>
                      
                      <button 
                        type="button" 
                        onClick={() => removeFromCart(item._id)}
                        style={cartStyles.btnTrash}
                        aria-label="Remove item"
                      >
                        <Trash2 size={16} /> <span>Remove</span>
                      </button>
                    </div>
                  </article>
                  
                  <p className="item-total" style={{ fontWeight: 800 }}>
                    {formatCurrency(item.price * item.qty)}
                  </p>
                </li>
              ))}
            </ul>

            <aside className="cart-summary">
              <h3>Order Summary</h3>
              <p><span>Subtotal Items:</span> <strong>{formatCurrency(cartTotal)}</strong></p>
              <p><span>Shipping Rates:</span> <strong style={{ color: shipping === 0 ? 'var(--success)' : 'inherit' }}>{shipping === 0 ? 'FREE' : formatCurrency(shipping)}</strong></p>
              <p><span>Estimated Tax (18%):</span> <strong>{formatCurrency(tax)}</strong></p>
              <hr />
              <p className="total-row"><span>Cart Total:</span> <span>{formatCurrency(total)}</span></p>

              {/* Advanced Pincode Availability Checker */}
              <div style={cartStyles.pincodeCard}>
                <div style={cartStyles.pincodeHeader}>
                  <Truck size={16} style={{ color: 'var(--brand-primary)' }} />
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)' }}>Delivery Serviceability</span>
                </div>
                
                <form onSubmit={handlePinCheck} style={cartStyles.pincodeForm}>
                  <input 
                    placeholder="Enter 6-digit Pincode"
                    maxLength={6}
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                    style={cartStyles.pincodeInput}
                  />
                  <button 
                    type="submit" 
                    disabled={checkingPin || pincode.length !== 6}
                    style={cartStyles.pincodeBtn}
                  >
                    {checkingPin ? '...' : 'Check'}
                  </button>
                </form>

                {pinError && (
                  <div style={{ ...cartStyles.estimateBadge, color: 'var(--danger)', background: 'rgba(239, 68, 68, 0.05)' }}>
                    <Info size={14} />
                    <span>{pinError}</span>
                  </div>
                )}

                {pinEstimate && (
                  <div style={cartStyles.estimateBadge}>
                    <Calendar size={14} style={{ color: 'var(--success)' }} />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.8rem', color: '#065f46' }}>Expected Delivery by {pinEstimate.dateStr}</div>
                      <div style={{ fontSize: '0.72rem', color: '#047857' }}>Standard Ground Shipping to {pinEstimate.code}</div>
                    </div>
                  </div>
                )}
              </div>

              <Link to="/checkout" className="btn-primary full" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <span>Proceed to Checkout</span> <ArrowRight size={16} />
              </Link>

              <div style={cartStyles.safetyBadge}>
                <ShieldCheck size={16} style={{ color: 'var(--success)' }} />
                <span>Genuine Products & Hassle-Free Returns</span>
              </div>
            </aside>
          </section>
        )}
      </section>
    </>
  );
}

const cartStyles = {
  emptyContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--bg-surface)',
    border: '1px solid var(--border-light)',
    borderRadius: '16px',
    padding: '4rem 2rem',
    boxShadow: 'var(--shadow-sm)',
    textAlign: 'center',
    marginTop: '2rem',
  },
  imageWrap: {
    background: '#fff',
    borderRadius: '8px',
    border: '1px solid var(--border-light)',
    width: '100px',
    height: '100px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0.25rem',
    overflow: 'hidden',
  },
  image: {
    maxWidth: '100%',
    maxHeight: '100%',
    objectFit: 'contain',
  },
  itemTitle: {
    fontWeight: 750,
    fontSize: '1.05rem',
    color: 'var(--text-main)',
    lineHeight: '1.35',
  },
  priceText: {
    fontSize: '0.95rem',
    fontWeight: 600,
    color: 'var(--brand-primary)',
    margin: '0.15rem 0',
  },
  btnTrash: {
    background: 'rgba(239, 68, 68, 0.06)',
    border: '1px solid rgba(239, 68, 68, 0.15)',
    borderRadius: '8px',
    color: 'var(--danger)',
    padding: '0.35rem 0.75rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.35rem',
    fontSize: '0.8rem',
    fontWeight: 700,
    transition: 'var(--transition-normal)',
    cursor: 'pointer',
  },
  pincodeCard: {
    background: '#f8fafc',
    border: '1px solid var(--border-light)',
    borderRadius: '12px',
    padding: '1.15rem',
    marginTop: '1.25rem',
    marginBottom: '1.25rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  pincodeHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  pincodeForm: {
    display: 'flex',
    gap: '0.5rem',
    width: '100%',
  },
  pincodeInput: {
    margin: 0,
    padding: '0.5rem 0.75rem',
    fontSize: '0.85rem',
    fontFamily: 'monospace',
    flex: 1,
  },
  pincodeBtn: {
    background: 'var(--brand-primary)',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    padding: '0 0.85rem',
    fontSize: '0.82rem',
    fontWeight: 700,
    height: '38px',
  },
  estimateBadge: {
    background: 'rgba(16, 185, 129, 0.05)',
    border: '1px solid rgba(16, 185, 129, 0.15)',
    borderRadius: '8px',
    padding: '0.65rem 0.85rem',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.5rem',
    fontSize: '0.78rem',
    lineHeight: '1.35',
  },
  safetyBadge: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.4rem',
    marginTop: '1.25rem',
    fontSize: '0.75rem',
    color: '#64748b',
    fontWeight: 500,
  }
};
