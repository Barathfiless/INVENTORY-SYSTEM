import { useEffect, useState } from 'react';
import { purchaseAPI, productAPI } from '../../api/api';
import { formatCurrency, formatDate } from '../../utils/format';

export default function Purchases() {
  const [purchases, setPurchases] = useState([]);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({
    productId: '',
    quantity: 1,
    unitCost: 0,
    supplier: '',
    invoiceNumber: '',
    notes: '',
  });
  const [message, setMessage] = useState('');

  const load = async () => {
    const [pRes, prodRes] = await Promise.all([purchaseAPI.getAll(), productAPI.getAdminAll()]);
    setPurchases(pRes.data);
    setProducts(prodRes.data);
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    try {
      await purchaseAPI.create(form);
      setForm({ productId: '', quantity: 1, unitCost: 0, supplier: '', invoiceNumber: '', notes: '' });
      setMessage('Purchase recorded and stock updated.');
      load();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed');
    }
  };

  return (
    <section className="admin-page">
      <h1>Purchase Management</h1>
      <p className="subtitle">Record incoming stock from suppliers</p>
      {message && <p className="alert success">{message}</p>}
      <form className="admin-form card" onSubmit={handleSubmit}>
        <h3>New Purchase</h3>
        <label>Product</label>
        <select required value={form.productId} onChange={(e) => {
          const p = products.find((x) => x._id === e.target.value);
          setForm({ ...form, productId: e.target.value, unitCost: p?.costPrice || 0 });
        }}>
          <option value="">Select product</option>
          {products.map((p) => (
            <option key={p._id} value={p._id}>{p.name} (Stock: {p.stock})</option>
          ))}
        </select>
        <label>Quantity</label>
        <input type="number" min="1" required value={form.quantity} onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })} />
        <label>Unit Cost (₹)</label>
        <input type="number" min="0" required value={form.unitCost} onChange={(e) => setForm({ ...form, unitCost: Number(e.target.value) })} />
        <label>Supplier</label>
        <input required value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} />
        <label>Invoice #</label>
        <input value={form.invoiceNumber} onChange={(e) => setForm({ ...form, invoiceNumber: e.target.value })} />
        <label>Notes</label>
        <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        <button type="submit" className="btn-primary">Record Purchase</button>
      </form>
      <table className="data-table">
        <thead>
          <tr>
            <th>Date</th><th>Product</th><th>Qty</th><th>Unit Cost</th><th>Total</th><th>Supplier</th>
          </tr>
        </thead>
        <tbody>
          {purchases.map((p) => (
            <tr key={p._id}>
              <td>{formatDate(p.createdAt)}</td>
              <td>{p.product?.name}</td>
              <td>{p.quantity}</td>
              <td>{formatCurrency(p.unitCost)}</td>
              <td>{formatCurrency(p.totalCost)}</td>
              <td>{p.supplier}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
