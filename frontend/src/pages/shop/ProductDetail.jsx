import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import ShopHeader from '../../components/ShopHeader';
import { productAPI } from '../../api/api';
import { useCart } from '../../context/CartContext';
import { formatCurrency } from '../../utils/format';
import StarRating from '../../components/StarRating';

export default function ProductDetail() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [qty, setQty] = useState(1);
  const { addToCart } = useCart();

  useEffect(() => {
    productAPI.getById(id).then(({ data }) => setProduct(data));
  }, [id]);

  if (!product) {
    return (
      <div className="shop-page">
        <ShopHeader />
        <p className="loading-text">Loading...</p>
      </div>
    );
  }

  return (
    <div className="shop-page">
      <ShopHeader />
      <div className="product-detail container">
        <div className="breadcrumb">
          <Link to="/shop">Home</Link> › <span>{product.category}</span> › <span>{product.name}</span>
        </div>
        <div className="product-detail-grid">
          <div className="product-detail-image">
            <img src={product.image} alt={product.name} />
          </div>
          <div className="product-detail-info">
            <h1>{product.name}</h1>
            <p className="brand">Brand: {product.brand}</p>
            <div className="rating-row">
              <StarRating rating={product.rating} reviewCount={product.reviewCount} />
              <span>{product.rating} ({product.reviewCount} reviews)</span>
            </div>
            <hr />
            <p className="detail-price">{formatCurrency(product.price)}</p>
            <p className={product.stock > 0 ? 'in-stock' : 'out-stock'}>
              {product.stock > 0 ? `In Stock (${product.stock} available)` : 'Currently unavailable'}
            </p>
            <p className="description">{product.description}</p>
            {product.stock > 0 && (
              <div className="add-section">
                <label>Qty:</label>
                <select value={qty} onChange={(e) => setQty(Number(e.target.value))}>
                  {[...Array(Math.min(10, product.stock))].map((_, i) => (
                    <option key={i + 1} value={i + 1}>{i + 1}</option>
                  ))}
                </select>
                <button
                  type="button"
                  className="btn-add-cart large"
                  onClick={() => addToCart(product, qty)}
                >
                  Add to Cart
                </button>
                <Link to="/cart" className="btn-buy-now">Buy Now</Link>
              </div>
            )}
            <div className="product-meta">
              <p><strong>SKU:</strong> {product.sku}</p>
              <p><strong>Category:</strong> {product.category}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
