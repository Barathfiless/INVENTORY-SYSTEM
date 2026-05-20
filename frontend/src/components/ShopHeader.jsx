import { Link, useNavigate } from 'react-router-dom';
import { Package, Search, ShoppingCart, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useState } from 'react';

export default function ShopHeader() {
  const { user, logout } = useAuth();
  const { cartCount } = useCart();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

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
    <header className="shop-header">
      <div className="shop-header-top">
        <Link to="/shop" className="logo">
          <Package size={22} className="logo-icon" aria-hidden />
          <span className="logo-text">StockSync</span>
        </Link>

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
  );
}
