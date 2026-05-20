import { Star } from 'lucide-react';

export default function StarRating({ rating, reviewCount }) {
  const full = Math.floor(rating);
  const stars = Array.from({ length: 5 }, (_, i) => i < full);

  return (
    <div className="product-rating">
      <span className="stars" aria-label={`${rating} out of 5 stars`}>
        {stars.map((filled, i) => (
          <Star
            key={i}
            size={14}
            className={filled ? 'star-filled' : 'star-empty'}
            fill={filled ? 'currentColor' : 'none'}
          />
        ))}
      </span>
      {reviewCount != null && <span className="review-count">({reviewCount})</span>}
    </div>
  );
}
