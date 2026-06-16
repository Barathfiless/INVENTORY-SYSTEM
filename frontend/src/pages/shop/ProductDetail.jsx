import { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import ShopHeader from '../../components/ShopHeader';
import { productAPI } from '../../api/api';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { formatCurrency } from '../../utils/format';
import StarRating from '../../components/StarRating';
import { MapPin, Lock, Loader2, ChevronDown, ChevronLeft, ChevronRight, Star } from 'lucide-react';

const getBreakdown = (r) => {
  const rounded = Math.round(r);
  if (rounded === 5) return { 5: 100, 4: 0, 3: 0, 2: 0, 1: 0 };
  if (rounded === 4) return { 5: 40, 4: 30, 3: 20, 2: 10, 1: 0 };
  if (rounded === 3) return { 5: 15, 4: 20, 3: 30, 2: 20, 1: 15 };
  if (rounded === 2) return { 5: 0, 4: 10, 3: 20, 2: 30, 1: 40 };
  return { 5: 0, 4: 0, 3: 0, 2: 0, 1: 100 };
};

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [product, setProduct] = useState(null);
  const [qty, setQty] = useState(1);
  const { addToCart } = useCart();

  // Location and delivery estimate states
  const [pincode, setPincode] = useState(() => localStorage.getItem('stocksync_pincode') || '560038');
  const [city, setCity] = useState(() => localStorage.getItem('stocksync_city') || 'Bengaluru');
  const [updatingLocation, setUpdatingLocation] = useState(false);
  const [tempPincode, setTempPincode] = useState(pincode);
  const [inlineError, setInlineError] = useState('');
  const [inlineLoading, setInlineLoading] = useState(false);

  // Gallery active image
  const [activeImgIndex, setActiveImgIndex] = useState(0);

  // Related products carousel
  const [relatedProducts, setRelatedProducts] = useState([]);
  const carouselRef = useRef(null);

  // Review states
  const [reviews, setReviews] = useState([]);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewerName, setReviewerName] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [formError, setFormError] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    productAPI.getById(id).then(({ data: mainProduct }) => {
      setProduct(mainProduct);
      
      // Fetch related products in the same category
      productAPI.getAll({ category: mainProduct.category }).then(({ data: categoryProducts }) => {
        const filtered = categoryProducts.filter(p => p._id !== mainProduct._id);
        if (filtered.length === 0) {
          productAPI.getAll().then(({ data: allProducts }) => {
            setRelatedProducts(allProducts.filter(p => p._id !== mainProduct._id).slice(0, 12));
          });
        } else {
          setRelatedProducts(filtered.slice(0, 12));
        }
      });
    });

    // Load local reviews
    const storedReviews = JSON.parse(localStorage.getItem(`reviews_${id}`)) || [];
    setReviews(storedReviews);
    setShowReviewForm(false);
  }, [id]);

  if (!product) {
    return (
      <div className="shop-page">
        <ShopHeader />
        <p className="loading-text">Loading...</p>
      </div>
    );
  }

  const brandName = product.brand || 'StockSync';

  // Same delivery estimation logic as ProductCard
  const firstDigit = parseInt(pincode[0]) || 5;
  let days = 3;
  if (firstDigit === 1 || firstDigit === 2) days = 3;
  else if (firstDigit === 3 || firstDigit === 4) days = 4;
  else if (firstDigit === 5 || firstDigit === 6) days = 2;
  else if (firstDigit === 7 || firstDigit === 8) days = 5;
  else if (firstDigit === 9) days = 6;

  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + days);
  const options = { weekday: 'long', month: 'long', day: 'numeric' };
  const formattedDate = targetDate.toLocaleDateString('en-US', options);

  // Mock list of gallery images (4 thumbnails total using crops to simulate alternate views)
  const galleryImages = [
    product.image || 'https://via.placeholder.com/500',
    product.image || 'https://via.placeholder.com/500',
    product.image || 'https://via.placeholder.com/500',
    product.image || 'https://via.placeholder.com/500',
  ];

  const handleInlineLocationSubmit = async (e) => {
    e.preventDefault();
    if (tempPincode.length !== 6 || !/^\d+$/.test(tempPincode)) {
      setInlineError('Enter a 6-digit Indian PIN.');
      return;
    }
    setInlineLoading(true);
    setInlineError('');

    const getCityFromPincode = (pin) => {
      const cityMap = {
        '1': 'Delhi', '2': 'Noida', '3': 'Mumbai', '4': 'Pune',
        '5': 'Bengaluru', '6': 'Chennai', '7': 'Kolkata', '8': 'Patna', '9': 'Guwahati'
      };
      return cityMap[pin[0]] || 'Bengaluru';
    };

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
        setPincode(tempPincode);
        setCity(resolvedCity);
        setUpdatingLocation(false);
        window.location.reload();
      } else {
        setInlineError('Pincode not found.');
      }
    } catch (err) {
      const resolved = getCityFromPincode(tempPincode);
      localStorage.setItem('stocksync_pincode', tempPincode);
      localStorage.setItem('stocksync_city', resolved);
      setPincode(tempPincode);
      setCity(resolved);
      setUpdatingLocation(false);
      window.location.reload();
    } finally {
      setInlineLoading(false);
    }
  };

  const handleScroll = (direction) => {
    if (carouselRef.current) {
      const { scrollLeft, clientWidth } = carouselRef.current;
      const scrollAmount = clientWidth * 0.75;
      carouselRef.current.scrollTo({
        left: direction === 'left' ? scrollLeft - scrollAmount : scrollLeft + scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  const handleReviewSubmit = (e) => {
    e.preventDefault();
    if (!reviewerName.trim() || !reviewComment.trim()) {
      setFormError('Please fill out all fields.');
      return;
    }

    const newReview = {
      id: Date.now(),
      name: reviewerName.trim(),
      rating: reviewRating,
      comment: reviewComment.trim(),
      date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    };

    const updatedReviews = [newReview, ...reviews];
    setReviews(updatedReviews);
    localStorage.setItem(`reviews_${id}`, JSON.stringify(updatedReviews));

    // Recalculate average rating & counts locally in the product state
    setProduct((prev) => {
      const currentCount = prev.reviewCount || 0;
      const newCount = currentCount + 1;
      const newRating = parseFloat(
        ((prev.rating * currentCount + reviewRating) / newCount).toFixed(1)
      );
      return {
        ...prev,
        reviewCount: newCount,
        rating: newRating
      };
    });

    setShowReviewForm(false);
    setReviewerName('');
    setReviewComment('');
    setFormError('');
    setToastMessage('Review submitted successfully!');
    setTimeout(() => setToastMessage(''), 3000);
  };

  return (
    <div className="shop-page">
      <ShopHeader />
      
      {toastMessage && (
        <div className="toast-notification show">
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="product-detail container">

        <div className="amazon-detail-layout">
          {/* Column 1: Image Gallery */}
          <div className="amazon-detail-gallery">
            <div className="thumbnail-strip">
              {galleryImages.map((imgUrl, idx) => {
                return (
                  <div
                    key={idx}
                    className={`thumb-wrap ${activeImgIndex === idx ? 'active' : ''}`}
                    onMouseEnter={() => setActiveImgIndex(idx)}
                    onClick={() => setActiveImgIndex(idx)}
                  >
                    <div className="thumb-crop-container">
                      <img src={imgUrl} alt={`${product.name} view ${idx + 1}`} />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="main-image-viewport">
              <div className="main-image-container">
                {(() => {
                  let mainStyle = {};
                  if (activeImgIndex === 1) mainStyle = { transform: 'scale(1.4)', objectFit: 'contain' };
                  else if (activeImgIndex === 2) mainStyle = { transform: 'scale(1.7)', transformOrigin: 'top left', objectFit: 'contain' };
                  else if (activeImgIndex === 3) mainStyle = { transform: 'scale(1.3)', transformOrigin: 'bottom right', objectFit: 'contain' };

                  return (
                    <img 
                      src={galleryImages[activeImgIndex]} 
                      alt={product.name} 
                      className="zoom-image"
                      style={mainStyle}
                    />
                  );
                })()}
              </div>
              <p className="gallery-tip">Hover over thumbnail/image to explore details</p>
            </div>
          </div>

          {/* Column 2: Product Core Information */}
          <div className="amazon-detail-info">
            <h1 className="amazon-title">{product.name}</h1>
            <p className="brand-store-link">
              Brand: <Link to={`/shop?search=${encodeURIComponent(brandName)}`}>{brandName}</Link>
            </p>

            <div className="rating-row">
              <StarRating rating={product.rating} />
              <span className="rating-count">{product.rating} out of 5 stars | {product.reviewCount} customer reviews</span>
            </div>

            <hr className="amazon-divider" />

            <div className="price-analysis">
              <div className="mrp-row">
                <span className="mrp-label">M.R.P.:</span>
                <span className="mrp-value">{formatCurrency(product.price * 1.25)}</span>
              </div>
              <div className="price-row">
                <span className="price-label">Price:</span>
                <span className="price-value">{formatCurrency(product.price)}</span>
              </div>
              <div className="save-row">
                <span className="save-label">You Save:</span>
                <span className="save-value">{formatCurrency(product.price * 0.25)} (20%)</span>
              </div>
              <p className="tax-label">Inclusive of all taxes</p>
            </div>
          </div>

          {/* Column 3: Buy Box Sidebar */}
          <div className="amazon-detail-buybox">
            <div className="buybox-price">{formatCurrency(product.price)}</div>

            {product.stock > 0 && (
              <div className="buybox-delivery">
                <span className="delivery-highlight">FREE delivery </span>
                <span className="delivery-date">{formattedDate}</span>.
                <p className="fastest-delivery-badge">Or fastest delivery <b>Tomorrow</b> if ordered within 5 hours.</p>
              </div>
            )}

            <div className="buybox-location">
              <div className="location-pin-row">
                <MapPin size={16} className="location-icon" />
                <span>Deliver to {city} {pincode}</span>
              </div>

              {!updatingLocation ? (
                <button 
                  type="button" 
                  className="update-location-link"
                  onClick={() => {
                    setTempPincode(pincode);
                    setInlineError('');
                    setUpdatingLocation(true);
                  }}
                >
                  Update location
                </button>
              ) : (
                <form onSubmit={handleInlineLocationSubmit} className="inline-location-form">
                  <div className="inline-input-group">
                    <input 
                      type="text" 
                      maxLength={6}
                      placeholder="Pincode" 
                      value={tempPincode}
                      disabled={inlineLoading}
                      onChange={(e) => {
                        setTempPincode(e.target.value.replace(/\D/g, ''));
                        setInlineError('');
                      }}
                    />
                    <button type="submit" disabled={inlineLoading || tempPincode.length !== 6}>
                      {inlineLoading ? '...' : 'Apply'}
                    </button>
                  </div>
                  {inlineError && <span className="inline-error">{inlineError}</span>}
                  <button 
                    type="button" 
                    className="inline-cancel-btn"
                    disabled={inlineLoading}
                    onClick={() => setUpdatingLocation(false)}
                  >
                    Cancel
                  </button>
                </form>
              )}
            </div>

            <div className="buybox-stock">
              {product.stock > 0 ? (
                <span className="stock-in-label">In Stock.</span>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <span className="stock-out-label" style={{ display: 'block', fontSize: '1.25rem' }}>Currently Unavailable.</span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                    We don't know when or if this item will be back in stock.
                  </span>
                </div>
              )}
            </div>

            {product.stock > 0 && (
              <div className="buybox-actions">
                <div className="qty-row">
                  <label htmlFor="qty-select">Qty:</label>
                  <select 
                    id="qty-select" 
                    value={qty} 
                    onChange={(e) => setQty(Number(e.target.value))}
                  >
                    {[...Array(Math.min(10, product.stock))].map((_, i) => (
                      <option key={i + 1} value={i + 1}>{i + 1}</option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  className="btn-amazon-add-to-cart"
                  onClick={() => addToCart(product, qty)}
                >
                  Add to Cart
                </button>
                
                <button
                  type="button"
                  className="btn-amazon-buy-now"
                  onClick={() => {
                    addToCart(product, qty);
                    navigate('/cart');
                  }}
                >
                  Buy Now
                </button>
              </div>
            )}

            <div className="buybox-security">
              <div className="security-item">
                <Lock size={14} />
                <span>Secure transaction</span>
              </div>
            </div>

            <table className="buybox-details-table">
              <tbody>
                <tr>
                  <td className="label">Ships from</td>
                  <td className="val">StockSync</td>
                </tr>
                <tr>
                  <td className="label">Sold by</td>
                  <td className="val">{brandName}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Divider between top layout and bottom parallel layout */}
        <hr className="amazon-divider" style={{ margin: '2rem 0 1.5rem' }} />

        {/* Parallel Layout Row for Reviews, About, and Technical Specs */}
        <div className="amazon-detail-bottom-layout">
          {/* Bottom Column 1: Customer reviews */}
          <div className="customer-reviews-section" style={{ margin: 0, maxWidth: '100%' }}>
            <h2 className="reviews-section-title">Customer reviews</h2>
            
            <div className="reviews-summary-row">
              <StarRating rating={product.rating} />
              <span className="reviews-average-text">{product.rating} out of 5</span>
            </div>
            
            <p className="global-ratings-count">
              {product.reviewCount || 1} global {product.reviewCount === 1 ? 'rating' : 'ratings'}
            </p>

            <div className="ratings-breakdown-chart">
              {(() => {
                const breakdown = getBreakdown(product.rating);
                return [5, 4, 3, 2, 1].map((stars) => {
                  const percent = breakdown[stars];
                  return (
                    <div key={stars} className="breakdown-row">
                      <span className="star-label-text">{stars} star</span>
                      <div className="rating-progress-bar-track">
                        <div 
                          className="rating-progress-bar-fill" 
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <span className="percentage-text">{percent}%</span>
                    </div>
                  );
                });
              })()}
            </div>

            <div className="ratings-calculated-link">
              <span>How are ratings calculated?</span>
              <ChevronDown size={14} className="chevron-icon" />
            </div>

            <hr className="amazon-divider" />

            <div className="write-review-block">
              <h3 className="write-review-title">Review this product</h3>
              <p className="write-review-desc">Share your thoughts with other customers</p>
              
              {!showReviewForm ? (
                <button 
                  type="button" 
                  className="btn-write-review"
                  onClick={() => {
                    setReviewerName(user?.name || '');
                    setReviewRating(5);
                    setReviewComment('');
                    setFormError('');
                    setShowReviewForm(true);
                  }}
                >
                  Write a product review
                </button>
              ) : (
                <form onSubmit={handleReviewSubmit} className="review-submit-form" style={{ marginTop: '1rem', border: '1px solid var(--border-light)', padding: '1rem', borderRadius: '8px', background: '#f9fafb', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Write your review</h4>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Your Rating</label>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      {[1, 2, 3, 4, 5].map((stars) => {
                        const isFilled = stars <= reviewRating;
                        return (
                          <button
                            key={stars}
                            type="button"
                            onClick={() => setReviewRating(stars)}
                            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: isFilled ? '#008060' : '#cbd5e1' }}
                          >
                            <Star
                              size={22}
                              fill={isFilled ? 'currentColor' : 'none'}
                              className={isFilled ? 'star-filled' : 'star-empty'}
                            />
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <label htmlFor="reviewer-name-input" style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Your Name</label>
                    <input
                      id="reviewer-name-input"
                      type="text"
                      placeholder="E.g. Barath"
                      value={reviewerName}
                      onChange={(e) => setReviewerName(e.target.value)}
                      style={{ margin: 0, padding: '0.55rem', borderRadius: '4px', border: '1px solid var(--border-light)' }}
                      required
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                    <label htmlFor="review-comment-textarea" style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Review Comments</label>
                    <textarea
                      id="review-comment-textarea"
                      rows={4}
                      placeholder="What did you like or dislike?"
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      style={{ margin: 0, padding: '0.55rem', borderRadius: '4px', border: '1px solid var(--border-light)', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit' }}
                      required
                    />
                  </div>

                  {formError && (
                    <p style={{ color: 'var(--danger)', fontSize: '0.8rem', fontWeight: 550 }}>
                      {formError}
                    </p>
                  )}

                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
                    <button 
                      type="submit" 
                      className="btn-amazon-buy-now" 
                      style={{ flex: 1, padding: '0.55rem', borderRadius: '99px', fontSize: '0.85rem' }}
                    >
                      Submit Review
                    </button>
                    <button 
                      type="button" 
                      className="btn-write-review" 
                      style={{ flex: 1, padding: '0.55rem', borderRadius: '99px', margin: 0, fontSize: '0.85rem' }}
                      onClick={() => setShowReviewForm(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Reviews list */}
            {reviews.length > 0 ? (
              <div className="user-reviews-list" style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <h3 className="section-subtitle" style={{ borderBottom: '1px solid var(--border-light)', paddingBottom: '0.5rem' }}>Top reviews from India</h3>
                {reviews.map((rev) => (
                  <div key={rev.id} className="user-review-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <div className="reviewer-info" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div className="reviewer-avatar" style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--brand-primary)', color: '#fff', display: 'flex', alignItems: 'center', justify: 'center', fontSize: '0.85rem', fontWeight: 700 }}>
                        {rev.name[0]?.toUpperCase()}
                      </div>
                      <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>{rev.name}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <StarRating rating={rev.rating} />
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#c45500' }}>Verified Purchase</span>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Reviewed in India on {rev.date}</p>
                    <p style={{ fontSize: '0.88rem', lineHeight: '1.45', color: 'var(--text-main)', marginTop: '0.15rem' }}>{rev.comment}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-reviews-placeholder" style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '1.5rem', background: '#f9fafb', borderRadius: '8px', border: '1px solid var(--border-light)', alignItems: 'center', textAlign: 'center' }}>
                <p style={{ margin: 0, fontSize: '0.92rem', color: 'var(--text-muted)', fontWeight: 550 }}>No review have posted, start with your 1st review</p>
                <button
                  type="button"
                  className="btn-write-review"
                  style={{ width: 'auto', marginTop: '0.5rem', padding: '0.4rem 1.2rem' }}
                  onClick={() => {
                    setReviewerName(user?.name || '');
                    setReviewRating(5);
                    setReviewComment('');
                    setFormError('');
                    setShowReviewForm(true);
                  }}
                >
                  Write the first review
                </button>
              </div>
            )}
          </div>

          {/* Bottom Column 2: About this item */}
          <div className="about-section" style={{ margin: 0 }}>
            <h3 className="section-subtitle">About this item</h3>
            <ul className="bullets-list">
              {product.description.split('.').map((s, idx) => {
                const cleaned = s.trim();
                if (!cleaned) return null;
                return <li key={idx}>{cleaned}.</li>;
              })}
            </ul>
          </div>

          {/* Bottom Column 3: Technical Details */}
          <div className="specs-section" style={{ margin: 0 }}>
            <h3 className="section-subtitle">Technical Details</h3>
            <table className="specs-table">
              <tbody>
                <tr>
                  <td className="spec-name">Brand</td>
                  <td className="spec-val">{brandName}</td>
                </tr>
                <tr>
                  <td className="spec-name">Model</td>
                  <td className="spec-val">{product.name}</td>
                </tr>
                <tr>
                  <td className="spec-name">SKU</td>
                  <td className="spec-val">{product.sku}</td>
                </tr>
                <tr>
                  <td className="spec-name">Category</td>
                  <td className="spec-val">{product.category}</td>
                </tr>
                <tr>
                  <td className="spec-name">Condition</td>
                  <td className="spec-val">New</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Amazon-style Related Products Carousel */}
        {relatedProducts.length > 0 && (
          <div className="related-products-carousel-section">
            <hr className="amazon-divider" style={{ margin: '2rem 0 1.5rem' }} />
            <div className="carousel-header">
              <h2 className="carousel-title">Customers who viewed items in your browsing history also viewed</h2>
            </div>
            
            <div className="carousel-container-wrapper">
              <button 
                type="button" 
                className="carousel-nav-btn prev" 
                onClick={() => handleScroll('left')}
                aria-label="Previous suggestions"
              >
                <ChevronLeft size={24} />
              </button>
              
              <div className="carousel-scroll-track" ref={carouselRef}>
                {relatedProducts.map((p) => {
                  const firstDigitVal = parseInt(pincode[0]) || 5;
                  let cardDays = 3;
                  if (firstDigitVal === 1 || firstDigitVal === 2) cardDays = 3;
                  else if (firstDigitVal === 3 || firstDigitVal === 4) cardDays = 4;
                  else if (firstDigitVal === 5 || firstDigitVal === 6) cardDays = 2;
                  else if (firstDigitVal === 7 || firstDigitVal === 8) cardDays = 5;
                  else if (firstDigitVal === 9) cardDays = 6;

                  const cardTargetDate = new Date();
                  cardTargetDate.setDate(cardTargetDate.getDate() + cardDays);
                  const cardOptions = { weekday: 'short', month: 'short', day: 'numeric' };
                  const cardFormattedDate = cardTargetDate.toLocaleDateString('en-US', cardOptions);

                  return (
                    <div key={p._id} className="carousel-product-card">
                      <Link to={`/product/${p._id}`} className="carousel-card-img-wrap" onClick={() => window.scrollTo(0, 0)}>
                        <img src={p.image || 'https://via.placeholder.com/150'} alt={p.name} />
                      </Link>
                      <div className="carousel-card-body">
                        <Link to={`/product/${p._id}`} className="carousel-card-title" onClick={() => window.scrollTo(0, 0)}>
                          {p.name}
                        </Link>
                        
                        <div className="carousel-card-rating">
                          <StarRating rating={p.rating} />
                          <span className="count">({p.reviewCount})</span>
                        </div>
                        
                        <div className="carousel-card-price">{formatCurrency(p.price)}</div>
                        
                        <div className="carousel-card-delivery">
                          <span className="delivery-muted">Get it by </span>
                          <span className="delivery-bold">{cardFormattedDate}</span>
                          <p className="delivery-free">FREE Delivery by StockSync</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              <button 
                type="button" 
                className="carousel-nav-btn next" 
                onClick={() => handleScroll('right')}
                aria-label="Next suggestions"
              >
                <ChevronRight size={24} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
