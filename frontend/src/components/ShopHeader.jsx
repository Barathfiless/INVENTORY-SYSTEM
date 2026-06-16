import { Link, useNavigate } from 'react-router-dom';
import { Package, Search, ShoppingCart, Menu, X, MapPin, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useState } from 'react';

export default function ShopHeader() {
  const { user, logout } = useAuth();
  const { cartCount } = useCart();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  const pincode = localStorage.getItem('stocksync_pincode') || user?.address?.zip || '560038';
  
  const getCityFromPincode = (pin, userCity) => {
    if (userCity) return userCity;
    if (!pin || pin.length < 1) return 'Bengaluru';
    const firstDigit = pin[0];
    const cityMap = {
      '1': 'Delhi',
      '2': 'Noida',
      '3': 'Mumbai',
      '4': 'Pune',
      '5': 'Bengaluru',
      '6': 'Chennai',
      '7': 'Kolkata',
      '8': 'Patna',
      '9': 'Guwahati'
    };
    return cityMap[firstDigit] || 'Bengaluru';
  };

  const city = localStorage.getItem('stocksync_city') || getCityFromPincode(pincode, user?.address?.city);

  const [locationModalOpen, setLocationModalOpen] = useState(false);
  const [tempPincode, setTempPincode] = useState(pincode);
  const [modalError, setModalError] = useState('');
  const [resolvingLocation, setResolvingLocation] = useState(false);

  const handleLocationClick = () => {
    setTempPincode(pincode);
    setModalError('');
    setLocationModalOpen(true);
  };

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    if (tempPincode.length !== 6 || !/^\d+$/.test(tempPincode)) {
      setModalError('Invalid PIN code. Enter a 6-digit Indian PIN.');
      return;
    }
    
    setResolvingLocation(true);
    setModalError('');
    
    try {
      const response = await fetch(`https://api.postalpincode.in/pincode/${tempPincode}`);
      const data = await response.json();
      
      if (data[0] && data[0].Status === 'Success' && data[0].PostOffice && data[0].PostOffice[0]) {
        const pos = data[0].PostOffice;
        const diffBlockPO = pos.find(po => po.Block && po.Block !== po.District && po.Block !== 'Not Available');
        const rawCity = diffBlockPO ? diffBlockPO.Block : pos[0].District;
        const resolvedCity = rawCity
          .replace(/\s+(North|South|East|West|Taluk|Tehsil|City|Rural|Urban)$/i, '')
          .trim();
        localStorage.setItem('stocksync_pincode', tempPincode);
        localStorage.setItem('stocksync_city', resolvedCity);
        setLocationModalOpen(false);
        window.location.reload();
      } else {
        setModalError('Pincode not found. Enter a valid 6-digit Indian PIN.');
      }
    } catch (err) {
      // Offline / API failure fallback using static mapping
      const resolvedCity = getCityFromPincode(tempPincode);
      localStorage.setItem('stocksync_pincode', tempPincode);
      localStorage.setItem('stocksync_city', resolvedCity);
      setLocationModalOpen(false);
      window.location.reload();
    } finally {
      setResolvingLocation(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
    setMenuOpen(false);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    navigate(`/shop?search=${encodeURIComponent(search)}`);
    setMenuOpen(false);
  };

  return (
    <>
      <header className="shop-header">
        <div className="shop-header-top">
          <Link to="/shop" className="logo">
            <Package size={22} className="logo-icon" aria-hidden />
            <span className="logo-text">StockSync</span>
          </Link>

          <div className="header-location" onClick={handleLocationClick} title="Click to change delivery pincode">
            <MapPin size={18} className="location-icon" />
            <div className="location-info">
              <span className="location-label">Delivering to {city} {pincode}</span>
              <span className="location-value">Update location</span>
            </div>
          </div>

          <form className="search-bar" onSubmit={handleSearch}>
            <select defaultValue="all" className="search-category" aria-label="Category">
              <option value="all">All</option>
            </select>
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button type="submit" className="search-submit" aria-label="Search">
              <Search size={18} />
            </button>
          </form>

          <div className="header-actions">
            <div className="user-menu">
              <span>Hello, {user?.name.split(' ')[0]}</span>
              <div className="dropdown">
                <Link to="/orders">Your Orders</Link>
                <button type="button" onClick={handleLogout}>Sign Out</button>
              </div>
            </div>
            <Link to="/cart" className="cart-link" aria-label={`Cart, ${cartCount} items`}>
              <ShoppingCart size={20} />
              <span className="cart-count">{cartCount}</span>
            </Link>
            {/* Mobile menu toggle */}
            <button
              type="button"
              className="mobile-menu-btn"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            >
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile search — shown below header on small screens */}
        <form className="mobile-search-bar" onSubmit={handleSearch}>
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit" className="search-submit" aria-label="Search">
            <Search size={18} />
          </button>
        </form>

        {/* Mobile location bar — visible only on mobile viewports */}
        <div className="mobile-location-bar" onClick={handleLocationClick} title="Click to change delivery pincode">
          <MapPin size={14} className="location-icon" />
          <span className="mobile-location-text">Delivering to {city} {pincode} - Update</span>
        </div>

        <nav className={`shop-nav${menuOpen ? ' shop-nav--open' : ''}`}>
          <Link to="/shop" onClick={() => setMenuOpen(false)}>All Products</Link>
          <Link to="/shop?featured=true" onClick={() => setMenuOpen(false)}>Today&apos;s Deals</Link>
          <Link to="/shop?category=Electronics" onClick={() => setMenuOpen(false)}>Electronics</Link>
          <Link to="/shop?category=Fashion" onClick={() => setMenuOpen(false)}>Fashion</Link>
          <Link to="/shop?category=Sports" onClick={() => setMenuOpen(false)}>Sports</Link>
          <Link to="/shop?category=Home" onClick={() => setMenuOpen(false)}>Home</Link>
          {/* Mobile-only links */}
          <Link to="/orders" className="mobile-nav-only" onClick={() => setMenuOpen(false)}>Your Orders</Link>
          <button type="button" className="mobile-nav-only mobile-signout" onClick={handleLogout}>Sign Out</button>
        </nav>
      </header>

      {locationModalOpen && (
        <div className="modal-overlay" onClick={() => !resolvingLocation && setLocationModalOpen(false)}>
          <div className="modal-content modal-content-small" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ background: '#f3f4f6', borderBottom: '1px solid var(--border-light)', padding: '1rem 1.5rem' }}>
              <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>Choose your location</h2>
              <button 
                type="button" 
                className="modal-close-btn" 
                onClick={() => setLocationModalOpen(false)}
                disabled={resolvingLocation}
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleModalSubmit} className="modal-form" style={{ padding: '1.5rem' }}>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.25rem', lineHeight: '1.45' }}>
                Select a delivery location to see product availability and delivery options
              </p>
              
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <input 
                  type="text" 
                  maxLength={6}
                  placeholder="Enter pincode"
                  value={tempPincode}
                  disabled={resolvingLocation}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '');
                    setTempPincode(val);
                    setModalError('');
                  }}
                  style={{
                    margin: 0,
                    padding: '0.65rem 1rem',
                    fontSize: '0.95rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-light)',
                    flex: '1',
                    boxSizing: 'border-box'
                  }}
                  autoFocus
                />
                
                <button 
                  type="submit" 
                  className="location-modal-apply"
                  disabled={resolvingLocation || tempPincode.length !== 6}
                >
                  {resolvingLocation ? (
                    <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                  ) : (
                    <span>Apply</span>
                  )}
                </button>
              </div>

              {modalError && (
                <p style={{ color: 'var(--danger)', fontSize: '0.8rem', fontWeight: 550, marginTop: '0.5rem' }}>
                  {modalError}
                </p>
              )}
            </form>
          </div>
        </div>
      )}
    </>
  );
}
