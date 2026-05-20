import { Link, useNavigate } from 'react-router-dom';
import { Package, Search, ShoppingCart } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useState } from 'react';

export default function ShopHeader() {
  const { user, logout } = useAuth();
  const { cartCount } = useCart();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleSearch = (e) => {
    e.preventDefault();
    navigate(`/shop?search=${encodeURIComponent(search)}`);
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
        </div>
      </div>
      <nav className="shop-nav">
        <Link to="/shop">All Products</Link>
        <Link to="/shop?featured=true">Today&apos;s Deals</Link>
        <Link to="/shop?category=Electronics">Electronics</Link>
        <Link to="/shop?category=Fashion">Fashion</Link>
        <Link to="/shop?category=Sports">Sports</Link>
        <Link to="/shop?category=Home">Home</Link>
      </nav>
    </header>
  );
}
