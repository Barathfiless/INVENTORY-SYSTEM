import { useEffect, useState } from 'react';
import { saleAPI, productAPI } from '../../api/api';
import { formatCurrency, formatDate } from '../../utils/format';

export default function Sales() {
  const [sales, setSales] = useState([]);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({
    productId: '',
    quantity: 1,
    unitPrice: 0,
    customerName: '',
    notes: '',
  });
  const [message, setMessage] = useState('');

  const load = async () => {
    const [sRes, prodRes] = await Promise.all([
      saleAPI.getAll({ channel: 'inventory' }),
      productAPI.getAdminAll(),
    ]);
    setSales(sRes.data);
    setProducts(prodRes.data);
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    try {
      await saleAPI.create(form);
      setForm({ productId: '', quantity: 1, unitPrice: 0, customerName: '', notes: '' });
      setMessage('Sale recorded and stock reduced.');
      load();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed');
    }
  };

  return (
    <section className="admin-page">
      <h1>Sales Management</h1>
      <p className="subtitle">Record offline / direct inventory sales</p>
      {message && <p className="alert success">{message}</p>}
      <form className="admin-form card" onSubmit={handleSubmit}>
        <h3>New Sale (Inventory Channel)</h3>
        <label>Product</label>
        <select required value={form.productId} onChange={(e) => {
          const p = products.find((x) => x._id === e.target.value);
          setForm({ ...form, productId: e.target.value, unitPrice: p?.price || 0 });
        }}>
          <option value="">Select product</option>
          {products.map((p) => (
            <option key={p._id} value={p._id}>{p.name} (Stock: {p.stock})</option>
          ))}
        </select>
        <label>Quantity</label>
        <input type="number" min="1" required value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} />
        <label>Unit Price (₹)</label>
        <input type="number" min="0" required value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: Number(e.target.value) })} />
        <label>Customer Name</label>
        <input value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} />
        <label>Notes</label>
        <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        <button type="submit" className="btn-primary">Record Sale</button>
      </form>
      <table className="data-table">
        <thead>
          <tr>
            <th>Date</th><th>Product</th><th>Qty</th><th>Price</th><th>Total</th><th>Customer</th><th>Channel</th>
          </tr>
        </thead>
        <tbody>
          {sales.map((s) => (
            <tr key={s._id}>
              <td>{formatDate(s.createdAt)}</td>
              <td>{s.product?.name}</td>
              <td>{s.quantity}</td>
              <td>{formatCurrency(s.unitPrice)}</td>
              <td>{formatCurrency(s.totalAmount)}</td>
              <td>{s.customerName || '—'}</td>
              <td>{s.channel}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
