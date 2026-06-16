import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ShopHeader from '../../components/ShopHeader';
import ProductCard from '../../components/ProductCard';
import { productAPI } from '../../api/api';
import { useCart } from '../../context/CartContext';
import { ChevronDown } from 'lucide-react';

export default function Home() {
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCart();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const sortOptions = [
    { value: '', label: 'Sort: Featured' },
    { value: 'price-asc', label: 'Price: Low to High' },
    { value: 'price-desc', label: 'Price: High to Low' },
    { value: 'rating', label: 'Avg. Rating' }
  ];

  const currentSort = searchParams.get('sort') || '';
  const activeOption = sortOptions.find(opt => opt.value === currentSort) || sortOptions[0];
  const isFiltering = !!(searchParams.get('search') || searchParams.get('category') || searchParams.get('featured'));

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const params = {
        search: searchParams.get('search') || undefined,
        category: searchParams.get('category') || undefined,
        featured: searchParams.get('featured') || undefined,
        sort: searchParams.get('sort') || undefined,
      };
      const { data } = await productAPI.getAll(params);
      setProducts(data);
      setLoading(false);
    };
    load();
  }, [searchParams]);

  return (
    <div className="shop-page">
      <ShopHeader />
      {!isFiltering && (
        <div className="hero-banner">
          <div className="hero-content">
            <h1>Welcome to StockSync</h1>
            <p>Your one-stop shop — electronics, fashion, sports & more</p>
            <a href="/shop?featured=true" className="btn-hero">Shop Today&apos;s Deals</a>
          </div>
        </div>
      )}
      <div className={`shop-container ${isFiltering ? 'full-width' : ''}`}>
        {!isFiltering && (
          <aside className="filters-sidebar">
            <h3>Filter by</h3>
            <a href="/shop">All Products</a>
            <a href="/shop?category=Electronics">Electronics</a>
            <a href="/shop?category=Fashion">Fashion</a>
            <a href="/shop?category=Sports">Sports</a>
            <a href="/shop?category=Home">Home</a>
            <a href="/shop?category=Accessories">Accessories</a>
            <a href="/shop?featured=true">Deals</a>
          </aside>
        )}
        <section className="products-section">
          <div className="products-header">
            <h2>
              {isFiltering ? (
                <span>
                  {products.length > 0 ? `1-${products.length}` : '0'} of {products.length} results for{' '}
                  <span className="search-query-highlight">
                    "{searchParams.get('search') || searchParams.get('category') || 'Deals'}"
                  </span>
                </span>
              ) : (
                'All Products'
              )}
            </h2>
            
            <div className="custom-select-container">
              <button 
                type="button" 
                className="custom-select-trigger" 
                onClick={() => setDropdownOpen(!dropdownOpen)}
              >
                <span>{activeOption.label}</span>
                <ChevronDown size={16} className={`chevron-icon ${dropdownOpen ? 'rotated' : ''}`} />
              </button>
              
              {dropdownOpen && (
                <>
                  <div className="custom-select-backdrop" onClick={() => setDropdownOpen(false)} />
                  <ul className="custom-select-options">
                    {sortOptions.map((opt) => (
                      <li 
                        key={opt.value}
                        className={`custom-select-option ${opt.value === currentSort ? 'active' : ''}`}
                        onClick={() => {
                          const url = new URL(window.location);
                          if (opt.value) {
                            url.searchParams.set('sort', opt.value);
                          } else {
                            url.searchParams.delete('sort');
                          }
                          window.location = url;
                          setDropdownOpen(false);
                        }}
                      >
                        {opt.label}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </div>
          {loading ? (
            <p className="loading-text">Loading products...</p>
          ) : products.length === 0 ? (
            <p className="empty-text">No products found.</p>
          ) : (
            <div className="products-grid">
              {products.map((p) => (
                <ProductCard key={p._id} product={p} onAddToCart={addToCart} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
