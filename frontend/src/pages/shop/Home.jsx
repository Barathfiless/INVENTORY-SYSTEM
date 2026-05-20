import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ShopHeader from '../../components/ShopHeader';
import ProductCard from '../../components/ProductCard';
import { productAPI } from '../../api/api';
import { useCart } from '../../context/CartContext';

export default function Home() {
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addToCart } = useCart();

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
      <div className="hero-banner">
        <div className="hero-content">
          <h1>Welcome to StockSync</h1>
          <p>Your one-stop shop — electronics, fashion, sports & more</p>
          <a href="/shop?featured=true" className="btn-hero">Shop Today&apos;s Deals</a>
        </div>
      </div>
      <div className="shop-container">
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
        <section className="products-section">
          <div className="products-header">
            <h2>
              {searchParams.get('search')
                ? `Results for "${searchParams.get('search')}"`
                : searchParams.get('category') || 'All Products'}
            </h2>
            <select
              onChange={(e) => {
                const url = new URL(window.location);
                url.searchParams.set('sort', e.target.value);
                window.location = url;
              }}
              defaultValue={searchParams.get('sort') || ''}
            >
              <option value="">Sort: Featured</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="rating">Avg. Rating</option>
            </select>
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
      <footer className="shop-footer">
        <p>© 2026 StockSync — Inventory & E-commerce Platform</p>
      </footer>
    </div>
  );
}
