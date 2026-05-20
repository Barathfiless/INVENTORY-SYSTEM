import { Link } from 'react-router-dom';
import { formatCurrency } from '../utils/format';
import StarRating from './StarRating';

export default function ProductCard({ product, onAddToCart }) {
  return (
    <div className="product-card">
      <Link to={`/product/${product._id}`} className="product-image-wrap">
        <img src={product.image || 'https://via.placeholder.com/300'} alt={product.name} />
        {product.featured && <span className="deal-badge">Deal</span>}
      </Link>
      <div className="product-card-body">
        <Link to={`/product/${product._id}`} className="product-title">{product.name}</Link>
        <StarRating rating={product.rating} reviewCount={product.reviewCount} />
        <p className="product-price">{formatCurrency(product.price)}</p>
        {product.stock > 0 ? (
          <p className="stock-ok">In Stock</p>
        ) : (
          <p className="stock-out">Out of Stock</p>
        )}
        <button
          type="button"
          className="btn-add-cart"
          disabled={product.stock < 1}
          onClick={() => onAddToCart?.(product)}
        >
          Add to Cart
        </button>
      </div>
    </div>
  );
}
