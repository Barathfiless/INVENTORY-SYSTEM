import { Link } from 'react-router-dom';
import ShopHeader from '../../components/ShopHeader';
import { useCart } from '../../context/CartContext';
import { formatCurrency } from '../../utils/format';

export default function Cart() {
  const { cartItems, updateQty, removeFromCart, cartTotal } = useCart();
  const shipping = cartTotal > 499 ? 0 : 49;
  const tax = Math.round(cartTotal * 0.18 * 100) / 100;
  const total = cartTotal + shipping + tax;

  return (
    <>
      <ShopHeader />
      <section className="shop-page container cart-page">
        <h1>Shopping Cart</h1>
        {cartItems.length === 0 ? (
          <article className="empty-cart">
            <p>Your cart is empty.</p>
            <Link to="/shop" className="btn-primary">Continue Shopping</Link>
          </article>
        ) : (
          <section className="cart-layout">
            <ul className="cart-items">
              {cartItems.map((item) => (
                <li key={item._id} className="cart-item">
                  <img src={item.image} alt={item.name} />
                  <article className="cart-item-info">
                    <Link to={`/product/${item._id}`}>{item.name}</Link>
                    <p>{formatCurrency(item.price)}</p>
                    <p className="qty-controls">
                      <button type="button" onClick={() => updateQty(item._id, item.qty - 1)}>−</button>
                      <span>{item.qty}</span>
                      <button type="button" onClick={() => updateQty(item._id, item.qty + 1)}>+</button>
                    </p>
                    <button type="button" className="btn-link" onClick={() => removeFromCart(item._id)}>
                      Delete
                    </button>
                  </article>
                  <p className="item-total">{formatCurrency(item.price * item.qty)}</p>
                </li>
              ))}
            </ul>
            <aside className="cart-summary">
              <h3>Order Summary</h3>
              <p><span>Items:</span> <span>{formatCurrency(cartTotal)}</span></p>
              <p><span>Shipping:</span> <span>{shipping === 0 ? 'FREE' : formatCurrency(shipping)}</span></p>
              <p><span>Tax (18%):</span> <span>{formatCurrency(tax)}</span></p>
              <hr />
              <p className="total-row"><span>Total:</span> <span>{formatCurrency(total)}</span></p>
              <Link to="/checkout" className="btn-primary full">Proceed to Checkout</Link>
            </aside>
          </section>
        )}
      </section>
    </>
  );
}
