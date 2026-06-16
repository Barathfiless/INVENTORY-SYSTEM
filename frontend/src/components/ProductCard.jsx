import { Link } from 'react-router-dom';
import { formatCurrency } from '../utils/format';
import StarRating from './StarRating';

export default function ProductCard({ product, onAddToCart }) {
  // Calculate delivery estimate dynamically based on local pincode
  const pincode = localStorage.getItem('stocksync_pincode') || '560038';
  const firstDigit = parseInt(pincode[0]) || 5;
  let days = 3;
  if (firstDigit === 1 || firstDigit === 2) days = 3;
  else if (firstDigit === 3 || firstDigit === 4) days = 4;
  else if (firstDigit === 5 || firstDigit === 6) days = 2;
  else if (firstDigit === 7 || firstDigit === 8) days = 5;
  else if (firstDigit === 9) days = 6;

  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + days);
  const options = { weekday: 'short', day: 'numeric', month: 'short' };
  const formattedDate = targetDate.toLocaleDateString('en-US', options); // E.g., Thu, Jun 18

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
          <div className="delivery-estimate-row">
            <span className="delivery-highlight">FREE delivery </span>
            <span className="delivery-date">{formattedDate}</span>
          </div>
        ) : (
          <p className="stock-out" style={{ margin: '0.25rem 0 0.5rem', fontWeight: 600 }}>Currently Unavailable</p>
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
