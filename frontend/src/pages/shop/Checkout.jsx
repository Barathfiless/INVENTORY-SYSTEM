import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import ShopHeader from '../../components/ShopHeader';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { orderAPI } from '../../api/api';
import { formatCurrency } from '../../utils/format';
import { 
  MapPin, 
  Compass, 
  Sparkles, 
  Smartphone, 
  QrCode, 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  ShieldCheck, 
  Loader2, 
  ArrowRight,
  Info
} from 'lucide-react';

export default function Checkout() {
  const { cartItems, cartTotal, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Address State
  const [address, setAddress] = useState({
    street: user?.address?.street || '',
    city: user?.address?.city || '',
    state: user?.address?.state || '',
    zip: localStorage.getItem('stocksync_pincode') || user?.address?.zip || '',
    country: 'India',
  });

  // Geolocation detection states
  const [detecting, setDetecting] = useState(false);
  const [detectError, setDetectError] = useState('');
  const [autofilledFields, setAutofilledFields] = useState({});

  // Delivery Estimate State
  const [deliveryEstimate, setDeliveryEstimate] = useState(null);

  // Payment states
  const [paymentMethod, setPaymentMethod] = useState('COD'); // 'COD' or 'UPI'
  const [selectedUpiApp, setSelectedUpiApp] = useState(''); // 'phonepe', 'gpay', 'paytm', 'bhim'
  const [upiId, setUpiId] = useState('');
  const [upiVerifyState, setUpiVerifyState] = useState(''); // '', 'verifying', 'success', 'error'
  const [upiVerifyMsg, setUpiVerifyMsg] = useState('');
  const [upiMethodType, setUpiMethodType] = useState('apps'); // 'apps' or 'qr'

  // Payment simulation states
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [transactionId, setTransactionId] = useState('');

  // QR countdown state
  const [qrCountdown, setQrCountdown] = useState(300); // 5 minutes
  const [qrTimerActive, setQrTimerActive] = useState(false);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const shipping = cartTotal > 499 ? 0 : 49;
  const tax = Math.round(cartTotal * 0.18 * 100) / 100;
  const total = cartTotal + shipping + tax;

  // Track ZIP input and compute delivery estimates dynamically
  useEffect(() => {
    const cleanZip = address.zip.trim();
    if (cleanZip.length === 6 && /^\d+$/.test(cleanZip)) {
      const firstDigit = parseInt(cleanZip[0]);
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

      setDeliveryEstimate({
        dateStr: formattedDate,
        days,
        isValid: true
      });
    } else if (cleanZip.length > 0 && cleanZip.length !== 6) {
      setDeliveryEstimate({
        isValid: false,
        message: 'Please enter a valid 6-digit PIN code.'
      });
    } else {
      setDeliveryEstimate(null);
    }
  }, [address.zip]);

  // QR Code Timer Effect
  useEffect(() => {
    let interval = null;
    if (qrTimerActive && qrCountdown > 0) {
      interval = setInterval(() => {
        setQrCountdown((prev) => prev - 1);
      }, 1000);
    } else if (qrCountdown === 0) {
      setQrTimerActive(false);
    }
    return () => clearInterval(interval);
  }, [qrTimerActive, qrCountdown]);

  // Geolocation detector utilizing OSM Nominatim reverse-geocoding API
  const detectLocation = () => {
    if (!navigator.geolocation) {
      setDetectError('Geolocation is not supported by your browser.');
      return;
    }
    setDetecting(true);
    setDetectError('');
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`
          );
          if (!response.ok) throw new Error('OSM geocoding failed.');
          const data = await response.json();
          const addr = data.address || {};

          const streetParts = [
            addr.road,
            addr.neighbourhood,
            addr.suburb,
            addr.village,
            addr.industrial
          ].filter(Boolean);
          const streetStr = streetParts.join(', ') || addr.amenity || 'Indiranagar';

          const newAddress = {
            street: streetStr,
            city: addr.city || addr.town || addr.municipality || 'Bengaluru',
            state: addr.state || 'Karnataka',
            zip: addr.postcode || '560038',
            country: 'India',
          };

          setAddress(newAddress);
          setAutofilledFields({ street: true, city: true, state: true, zip: true });
          setTimeout(() => setAutofilledFields({}), 2000);
        } catch (err) {
          // Fallback to a high-fidelity mock Indian address if network or API fails
          fallbackToMockAddress();
        } finally {
          setDetecting(false);
        }
      },
      (error) => {
        // Fallback gracefully to mock address if permissions are denied or timed out
        fallbackToMockAddress();
        setDetecting(false);
      },
      { enableHighAccuracy: true, timeout: 6000 }
    );
  };

  const fallbackToMockAddress = () => {
    const mockAddr = {
      street: '12th Main Road, HAL 2nd Stage, Indiranagar',
      city: 'Bengaluru',
      state: 'Karnataka',
      zip: '560038',
      country: 'India',
    };
    setAddress(mockAddr);
    setAutofilledFields({ street: true, city: true, state: true, zip: true });
    setTimeout(() => setAutofilledFields({}), 2000);
  };

  // UPI verification simulation
  const verifyUpiId = () => {
    if (!upiId || !upiId.includes('@')) {
      setUpiVerifyState('error');
      setUpiVerifyMsg('Invalid UPI ID format. E.g., user@okhdfcbank');
      return;
    }
    setUpiVerifyState('verifying');
    setUpiVerifyMsg('Pinging NPCI server to resolve details...');

    setTimeout(() => {
      setUpiVerifyState('success');
      setUpiVerifyMsg('Verified: Barath Maruthavel (stocksync@okhdfcbank) ✅');
    }, 1200);
  };

  // Run countdown when QR option is selected
  useEffect(() => {
    if (paymentMethod === 'UPI' && upiMethodType === 'qr') {
      setQrCountdown(300);
      setQrTimerActive(true);
    } else {
      setQrTimerActive(false);
    }
  }, [paymentMethod, upiMethodType]);

  // Main order submission
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
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
        paymentMethod: paymentMethod,
      });
      clearCart();
      navigate(`/orders/${data._id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Order placement failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Premium UPI payment success simulator
  const simulatePaymentAndOrder = () => {
    setPaymentLoading(true);
    setError('');

    setTimeout(() => {
      const mockTxn = 'TXN' + Math.floor(100000000000 + Math.random() * 900000000000);
      setTransactionId(mockTxn);
      setPaymentSuccess(true);
      setPaymentLoading(false);

      // Submit actual order after showing success visual confirmation
      setTimeout(() => {
        handleSubmit();
      }, 1800);
    }, 2000);
  };

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const rSecs = secs % 60;
    return `${mins}:${rSecs.toString().padStart(2, '0')}`;
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
      
      {/* Visual Overlay for Simulated UPI Processing */}
      {(paymentLoading || paymentSuccess) && (
        <div style={overlayStyles.container}>
          <div style={overlayStyles.card}>
            {paymentLoading && (
              <>
                <Loader2 size={48} style={overlayStyles.spinner} />
                <h3 style={overlayStyles.title}>Processing Secure UPI Payment</h3>
                <p style={overlayStyles.subtitle}>Contacting payment gateway. Please do not close or refresh this page.</p>
                <div style={overlayStyles.badgeContainer}>
                  <ShieldCheck size={16} /> <span>100% Secured by NPCI UPI Gateway</span>
                </div>
              </>
            )}
            
            {paymentSuccess && (
              <>
                <div style={overlayStyles.successIconBox}>
                  <CheckCircle2 size={48} fill="#10b981" color="#fff" />
                </div>
                <h3 style={{ ...overlayStyles.title, color: '#10b981' }}>Payment Successful!</h3>
                <p style={overlayStyles.subtitle}>
                  Amount Paid: <strong>{formatCurrency(total)}</strong>
                </p>
                <div style={overlayStyles.receipt}>
                  <div><strong>Transaction ID:</strong> <span style={{ fontFamily: 'monospace' }}>{transactionId}</span></div>
                  <div><strong>Status:</strong> Paid ✅</div>
                </div>
                <p style={{ ...overlayStyles.subtitle, fontSize: '0.85rem', color: '#64748b', marginTop: '1rem' }}>
                  Finalizing and saving your order catalog...
                </p>
              </>
            )}
          </div>
        </div>
      )}

      <section className="container checkout-page">
        <h1 style={{ fontWeight: 800, letterSpacing: '-0.04em', marginBottom: '1.5rem' }}>Checkout Securely</h1>
        {error && <p className="alert error">{error}</p>}
        
        <form onSubmit={(e) => {
          e.preventDefault();
          if (paymentMethod === 'UPI') {
            simulatePaymentAndOrder();
          } else {
            handleSubmit();
          }
        }} className="checkout-layout">
          
          <div className="checkout-form">
            
            {/* Step 1: Shipping Address */}
            <div className="checkout-step-container">
              <div className="checkout-step-header">
                <span className="checkout-step-num">1</span>
                <h3 className="checkout-step-title">Shipping Address</h3>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label>Street Address</label>
                <div className="location-detect-wrapper">
                  <input 
                    required 
                    className={autofilledFields.street ? 'autofilled' : ''}
                    placeholder="House No, Building, Apartment, Road" 
                    value={address.street} 
                    onChange={(e) => setAddress({ ...address, street: e.target.value })} 
                  />
                  <button 
                    type="button" 
                    className="btn-location-detect" 
                    onClick={detectLocation}
                    disabled={detecting}
                  >
                    {detecting ? (
                      <span className="location-detecting-spinner" />
                    ) : (
                      <MapPin size={18} />
                    )}
                    <span>{detecting ? 'Locating...' : 'Auto-Detect'}</span>
                  </button>
                </div>
              </div>

              <div className="checkout-grid-2">
                <div>
                  <label>City</label>
                  <input 
                    required 
                    className={autofilledFields.city ? 'autofilled' : ''}
                    value={address.city} 
                    onChange={(e) => setAddress({ ...address, city: e.target.value })} 
                  />
                </div>
                <div>
                  <label>State</label>
                  <input 
                    required 
                    className={autofilledFields.state ? 'autofilled' : ''}
                    value={address.state} 
                    onChange={(e) => setAddress({ ...address, state: e.target.value })} 
                  />
                </div>
              </div>

              <div className="checkout-grid-2">
                <div>
                  <label>ZIP / PIN Code</label>
                  <input 
                    required 
                    maxLength={6}
                    placeholder="6-digit PIN code"
                    className={autofilledFields.zip ? 'autofilled' : ''}
                    value={address.zip} 
                    onChange={(e) => setAddress({ ...address, zip: e.target.value.replace(/\D/g, '') })} 
                  />
                </div>
                <div>
                  <label>Country</label>
                  <input required disabled value={address.country} />
                </div>
              </div>
            </div>

            {/* Step 2: Shipping Method & Date Verification */}
            <div className="checkout-step-container">
              <div className="checkout-step-header">
                <span className="checkout-step-num">2</span>
                <h3 className="checkout-step-title">Delivery Estimation</h3>
              </div>

              {deliveryEstimate ? (
                deliveryEstimate.isValid ? (
                  <div className="pincode-delivery-alert">
                    <span className="icon-box">
                      <Calendar size={14} />
                    </span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Expected Delivery by {deliveryEstimate.dateStr}</div>
                      <div style={{ fontSize: '0.8rem', opacity: 0.85 }}>Standard Ground Shipping (Dispatched in {deliveryEstimate.days - 1}–{deliveryEstimate.days} days)</div>
                    </div>
                  </div>
                ) : (
                  <div className="pincode-delivery-alert error">
                    <span className="icon-box">
                      <AlertCircle size={14} />
                    </span>
                    <div>{deliveryEstimate.message}</div>
                  </div>
                )
              ) : (
                <div style={estimateFallbackStyles.container}>
                  <Info size={16} style={{ color: 'var(--brand-primary)' }} />
                  <span>Enter a valid 6-digit Indian PIN/ZIP code above to calculate delivery options.</span>
                </div>
              )}
            </div>

            {/* Step 3: Payment details */}
            <div className="checkout-step-container">
              <div className="checkout-step-header">
                <span className="checkout-step-num">3</span>
                <h3 className="checkout-step-title">Payment Method</h3>
              </div>

              <div className="payment-tab-group">
                <button 
                  type="button" 
                  className={`payment-tab ${paymentMethod === 'COD' ? 'active' : ''}`}
                  onClick={() => setPaymentMethod('COD')}
                >
                  <Smartphone size={16} /> Cash on Delivery (COD)
                </button>
                <button 
                  type="button" 
                  className={`payment-tab ${paymentMethod === 'UPI' ? 'active' : ''}`}
                  onClick={() => setPaymentMethod('UPI')}
                >
                  <QrCode size={16} /> Fast UPI Payment
                </button>
              </div>

              {paymentMethod === 'COD' && (
                <div style={codPanelStyles.container}>
                  <p className="cod-note">Cash on Delivery (COD) Selected</p>
                  <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
                    Pay in cash or card when your order arrives. Standard COD delivery takes 3–5 working days depending on logistics traffic.
                  </p>
                </div>
              )}

              {paymentMethod === 'UPI' && (
                <div className="upi-payment-panel">
                  <div style={upiHeaderStyles.tabs}>
                    <button 
                      type="button" 
                      onClick={() => setUpiMethodType('apps')}
                      style={{
                        ...upiHeaderStyles.tab, 
                        borderBottomColor: upiMethodType === 'apps' ? 'var(--brand-primary)' : 'transparent',
                        color: upiMethodType === 'apps' ? 'var(--brand-primary)' : '#64748b'
                      }}
                    >
                      Instant Pay Apps
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setUpiMethodType('qr')}
                      style={{
                        ...upiHeaderStyles.tab, 
                        borderBottomColor: upiMethodType === 'qr' ? 'var(--brand-primary)' : 'transparent',
                        color: upiMethodType === 'qr' ? 'var(--brand-primary)' : '#64748b'
                      }}
                    >
                      Scan QR Code
                    </button>
                  </div>

                  {upiMethodType === 'apps' && (
                    <div>
                      <div className="upi-app-grid">
                        <button 
                          type="button" 
                          onClick={() => { setSelectedUpiApp('phonepe'); setUpiId(user?.email?.split('@')[0] + '@ybl'); }}
                          className={`upi-app-btn ${selectedUpiApp === 'phonepe' ? 'active' : ''}`}
                        >
                          {/* Custom Inline SVG for PhonePe */}
                          <svg viewBox="0 0 24 24" width="24" height="24" fill="none">
                            <rect width="24" height="24" rx="6" fill="#5f259f" />
                            <path d="M12 5v14M8 9h8M8 13h5.5" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
                          </svg>
                          <span>PhonePe</span>
                        </button>

                        <button 
                          type="button" 
                          onClick={() => { setSelectedUpiApp('gpay'); setUpiId(user?.email?.split('@')[0] + '@okaxis'); }}
                          className={`upi-app-btn ${selectedUpiApp === 'gpay' ? 'active' : ''}`}
                        >
                          {/* Custom Inline SVG for Google Pay */}
                          <svg viewBox="0 0 24 24" width="24" height="24" fill="none">
                            <rect width="24" height="24" rx="6" fill="#fff" stroke="#e2e8f0" strokeWidth="1" />
                            <path d="M6 12c0-3.3 2.7-6 6-6s6 2.7 6 6-2.7 6-6 6" stroke="#4285F4" strokeWidth="2.5" />
                            <path d="M10 12l2 2 4-4" stroke="#0F9D58" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                          <span>Google Pay</span>
                        </button>

                        <button 
                          type="button" 
                          onClick={() => { setSelectedUpiApp('paytm'); setUpiId(user?.email?.split('@')[0] + '@paytm'); }}
                          className={`upi-app-btn ${selectedUpiApp === 'paytm' ? 'active' : ''}`}
                        >
                          {/* Custom Inline SVG for Paytm */}
                          <svg viewBox="0 0 24 24" width="24" height="24" fill="none">
                            <rect width="24" height="24" rx="6" fill="#00baf2" />
                            <text x="12" y="16" fill="#fff" fontSize="8" fontWeight="900" textAnchor="middle">paytm</text>
                          </svg>
                          <span>Paytm</span>
                        </button>

                        <button 
                          type="button" 
                          onClick={() => { setSelectedUpiApp('bhim'); setUpiId(user?.email?.split('@')[0] + '@upi'); }}
                          className={`upi-app-btn ${selectedUpiApp === 'bhim' ? 'active' : ''}`}
                        >
                          {/* Custom Inline SVG for BHIM */}
                          <svg viewBox="0 0 24 24" width="24" height="24" fill="none">
                            <rect width="24" height="24" rx="6" fill="#f58220" />
                            <path d="M6 18l6-12 6 12" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M12 18V6" stroke="#097969" strokeWidth="3" strokeLinecap="round" />
                          </svg>
                          <span>BHIM</span>
                        </button>
                      </div>

                      <label>Enter UPI ID (VPA)</label>
                      <div className="upi-input-wrapper">
                        <input 
                          placeholder="e.g. username@okhdfcbank"
                          value={upiId}
                          onChange={(e) => {
                            setUpiId(e.target.value);
                            setUpiVerifyState('');
                          }}
                        />
                        <button 
                          type="button" 
                          onClick={verifyUpiId}
                          disabled={!upiId}
                          className="btn-upi-verify"
                        >
                          Verify VPA
                        </button>
                      </div>

                      {upiVerifyState && (
                        <div className={`upi-verify-status ${upiVerifyState}`}>
                          {upiVerifyState === 'verifying' && <Loader2 size={14} className="location-detecting-spinner" />}
                          {upiVerifyState === 'success' && <CheckCircle2 size={14} />}
                          {upiVerifyState === 'error' && <AlertCircle size={14} />}
                          <span>{upiVerifyMsg}</span>
                        </div>
                      )}

                      <p style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '0.5rem' }}>
                        *A payment request notification will be sent immediately to your UPI app once you click "Pay and Place Order" below.
                      </p>
                    </div>
                  )}

                  {upiMethodType === 'qr' && (
                    <div className="qr-code-scanner-card">
                      <div className="qr-code-box">
                        <div className="qr-code-laser" />
                        {/* Custom High-Fidelity SVG QR Code */}
                        <svg viewBox="0 0 100 100" width="100%" height="100%">
                          <path d="M0 0h30v8H8v22H0zm70 0h30v30h-8V8H70zm30 70v30H70v-8h22V70zM0 70h8v22h22v8H0z" fill="#0f172a" />
                          <rect x="6" y="6" width="18" height="18" fill="none" stroke="#0f172a" strokeWidth="4" />
                          <rect x="11" y="11" width="8" height="8" fill="#0f172a" />
                          
                          <rect x="76" y="6" width="18" height="18" fill="none" stroke="#0f172a" strokeWidth="4" />
                          <rect x="81" y="81" width="8" height="8" fill="#0f172a" />

                          <rect x="6" y="76" width="18" height="18" fill="none" stroke="#0f172a" strokeWidth="4" />
                          <rect x="11" y="81" width="8" height="8" fill="#0f172a" />

                          <rect x="76" y="76" width="18" height="18" fill="none" stroke="#0f172a" strokeWidth="4" />
                          <path d="M35 15h5v5h-5zm10 0h5v10h-5zm10 5h5v5h-5zm0-10h10v5H55zm-20 20h10v5H35zm15 5h5v10h-5zm10-5h5v5h-5zm10 0h10v5H70zm5 10h5v5h-5zm-30 10h5v5h-5zm10 0h10v5H50zm15 5h5v10h-5zm-25 10h10v5H40zm20 5h5v5h-5zm10-10h5v10h-5zm5 15h5v5h-5zm15-15h5v5h-5zm0 10h5v5h-5z" fill="#0f172a" />
                          <path d="M15 35h5v10h-5zm5 15h10v5H20zm15 5h5v5h-5zm10-10h5v5h-5zm10 0h10v5H55zm5-15h5v5h-5zm15 5h5v10h-5zm5 15h5v5h-5z" fill="#0f172a" opacity="0.85" />
                          <circle cx="50" cy="50" r="10" fill="#fff" />
                          <path d="M47 51v4h6v-4zm3-3a2.5 2.5 0 0 0-2.5 2.5V51h5v-.5A2.5 2.5 0 0 0 50 48z" fill="#6366f1" />
                        </svg>
                      </div>

                      <div className="qr-countdown">
                        <Loader2 size={14} className="location-detecting-spinner" style={{ color: 'var(--brand-primary)' }} />
                        <span>Code expires in <strong style={{ color: 'var(--danger)', fontFamily: 'monospace' }}>{formatTime(qrCountdown)}</strong></span>
                      </div>

                      <div style={{ textAlign: 'center', width: '100%' }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: 650, color: '#475569', marginBottom: '0.5rem' }}>
                          Scan using GPay, PhonePe, Paytm or BHIM
                        </div>
                        <button 
                          type="button" 
                          onClick={simulatePaymentAndOrder}
                          className="btn-simulate-success"
                        >
                          Simulate UPI Payment Success (Demo)
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <button 
              type="submit" 
              className="btn-primary" 
              style={{ padding: '0.9rem', fontSize: '1rem', marginTop: '1.25rem' }}
              disabled={
                loading || 
                cartItems.length === 0 || 
                (paymentMethod === 'UPI' && upiMethodType === 'apps' && upiVerifyState !== 'success')
              }
            >
              {loading ? 'Processing Catalog...' : paymentMethod === 'UPI' ? `Pay ${formatCurrency(total)} via UPI & Place Order` : 'Place Order (COD)'}
            </button>
          </div>

          <aside className="checkout-summary">
            <h3>Order ({cartItems.length} items)</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '200px', overflowY: 'auto', marginBottom: '1.25rem', paddingRight: '0.25rem' }}>
              {cartItems.map((i) => (
                <div key={i._id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                  <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>{i.name} <strong style={{ color: 'var(--text-muted)' }}>x{i.qty}</strong></span>
                  <span style={{ fontWeight: 600 }}>{formatCurrency(i.price * i.qty)}</span>
                </div>
              ))}
            </div>
            
            <hr />
            
            <p><span>Subtotal:</span> <strong>{formatCurrency(cartTotal)}</strong></p>
            <p><span>Shipping:</span> <strong style={{ color: shipping === 0 ? 'var(--success)' : 'inherit' }}>{shipping === 0 ? 'FREE' : formatCurrency(shipping)}</strong></p>
            <p><span>Tax (18%):</span> <strong>{formatCurrency(tax)}</strong></p>
            <p className="total-row"><span>Total Amount:</span> <span>{formatCurrency(total)}</span></p>

            <div style={safetyBadgeStyles.container}>
              <ShieldCheck size={18} style={{ color: 'var(--success)' }} />
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                <strong>Secure Checkout</strong><br />
                Your transaction details are encrypted with 256-bit SSL technology.
              </div>
            </div>
          </aside>
        </form>
      </section>
    </>
  );
}

// Inline styling configurations for rich simulated components
const overlayStyles = {
  container: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    background: 'rgba(15, 23, 42, 0.75)',
    backdropFilter: 'blur(8px)',
    zIndex: 9999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1.5rem',
  },
  card: {
    background: '#fff',
    borderRadius: '24px',
    padding: '2.5rem',
    width: '100%',
    maxWith: '450px',
    maxWidth: '460px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textAlign: 'center',
    animation: 'slideInDown 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
  },
  spinner: {
    color: 'var(--brand-primary)',
    animation: 'spin 1s infinite linear',
    marginBottom: '1.5rem',
  },
  successIconBox: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    background: 'rgba(16, 185, 129, 0.1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '1.5rem',
  },
  title: {
    fontSize: '1.45rem',
    fontWeight: '850',
    color: '#0f172a',
    margin: '0 0 0.5rem 0',
  },
  subtitle: {
    fontSize: '0.92rem',
    color: '#475569',
    margin: 0,
    lineHeight: '1.5',
  },
  badgeContainer: {
    marginTop: '1.5rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    fontSize: '0.78rem',
    color: '#64748b',
    background: '#f1f5f9',
    padding: '0.4rem 0.85rem',
    borderRadius: '99px',
    fontWeight: 600,
  },
  receipt: {
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '1rem',
    width: '100%',
    textAlign: 'left',
    marginTop: '1.25rem',
    fontSize: '0.85rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  }
};

const estimateFallbackStyles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.65rem',
    background: 'rgba(99, 102, 241, 0.05)',
    border: '1px solid rgba(99, 102, 241, 0.15)',
    borderRadius: '12px',
    padding: '1rem 1.25rem',
    color: 'var(--brand-primary)',
    fontSize: '0.88rem',
    fontWeight: 500,
  }
};

const codPanelStyles = {
  container: {
    background: 'rgba(16, 185, 129, 0.03)',
    border: '1px solid rgba(16, 185, 129, 0.12)',
    borderRadius: '12px',
    padding: '1.25rem',
    animation: 'fadeIn 0.25s ease-out',
  }
};

const upiHeaderStyles = {
  tabs: {
    display: 'flex',
    gap: '1.5rem',
    borderBottom: '1px solid #e2e8f0',
    marginBottom: '1.25rem',
  },
  tab: {
    border: 'none',
    borderBottom: '2.5px solid transparent',
    background: 'none',
    padding: '0.5rem 0.1rem 0.75rem 0.1rem',
    fontWeight: 700,
    fontSize: '0.9rem',
    cursor: 'pointer',
    transition: 'var(--transition-normal)',
  }
};

const safetyBadgeStyles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.65rem',
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '0.85rem 1rem',
    marginTop: '1.5rem',
  }
};
