import { useEffect, useState } from 'react';
import { productAPI } from '../../api/api';
import { formatCurrency } from '../../utils/format';

const emptyProduct = {
  name: '',
  description: '',
  sku: '',
  category: 'Electronics',
  brand: '',
  price: 0,
  costPrice: 0,
  stock: 0,
  lowStockThreshold: 10,
  image: '',
  featured: false,
  isActive: true,
};

export default function Products() {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(emptyProduct);
  const [editing, setEditing] = useState(null);
  const [message, setMessage] = useState('');

  const load = () => productAPI.getAdminAll().then(({ data }) => setProducts(data));
  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    try {
      if (editing) {
        await productAPI.update(editing, form);
        setMessage('Product updated');
      } else {
        await productAPI.create(form);
        setMessage('Product created');
      }
      setForm(emptyProduct);
      setEditing(null);
      load();
    } catch (err) {
      setMessage(err.response?.data?.message || 'Failed');
    }
  };

  const startEdit = (p) => {
    setEditing(p._id);
    setForm({
      name: p.name,
      description: p.description,
      sku: p.sku,
      category: p.category,
      brand: p.brand,
      price: p.price,
      costPrice: p.costPrice,
      stock: p.stock,
      lowStockThreshold: p.lowStockThreshold,
      image: p.image,
      featured: p.featured,
      isActive: p.isActive,
    });
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this product?')) return;
    await productAPI.delete(id);
    load();
  };

  return (
    <section className="admin-page">
      {message && <p className="alert success">{message}</p>}
      <form className="admin-form card" onSubmit={handleSubmit}>
        <h3>{editing ? 'Edit Product' : 'Add Product'}</h3>
        <label>Name</label>
        <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <label>SKU</label>
        <input required disabled={!!editing} value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
        <label>Description</label>
        <textarea required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <label>Category</label>
        <input required value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
        <label>Brand</label>
        <input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
        <label>Price / Cost / Stock</label>
        <p className="inline-inputs">
          <input type="number" placeholder="Price" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
          <input type="number" placeholder="Cost" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: Number(e.target.value) })} />
          <input type="number" placeholder="Stock" value={form.stock} onChange={(e) => setForm({ ...form, stock: Number(e.target.value) })} />
        </p>
        <label>Image URL</label>
        <input value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} />
        <label><input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} /> Featured</label>
        <button type="submit" className="btn-primary">{editing ? 'Update' : 'Create'}</button>
        {editing && <button type="button" className="btn-secondary" onClick={() => { setEditing(null); setForm(emptyProduct); }}>Cancel</button>}
      </form>
      <table className="data-table">
        <thead><tr><th>Name</th><th>SKU</th><th>Stock</th><th>Price</th><th>Actions</th></tr></thead>
        <tbody>
          {products.map((p) => (
            <tr key={p._id}>
              <td>{p.name}</td><td>{p.sku}</td><td>{p.stock}</td><td>{formatCurrency(p.price)}</td>
              <td>
                <button type="button" onClick={() => startEdit(p)}>Edit</button>
                <button type="button" className="btn-danger" onClick={() => handleDelete(p._id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
