import { useEffect, useState } from 'react';
import { reportAPI } from '../../api/api';
import { formatCurrency, formatDate } from '../../utils/format';

export default function Reports() {
  const [range, setRange] = useState({ startDate: '', endDate: '' });
  const [report, setReport] = useState(null);

  const load = async () => {
    const params = {};
    if (range.startDate) params.startDate = range.startDate;
    if (range.endDate) params.endDate = range.endDate;
    const { data } = await reportAPI.getReports(params);
    setReport(data);
  };

  useEffect(() => { load(); }, []);

  return (
    <section className="admin-page">
      <h1>Reports</h1>
      <p className="subtitle">Purchase, sales, and order analytics</p>
      <form className="filter-bar" onSubmit={(e) => { e.preventDefault(); load(); }}>
        <label>From</label>
        <input type="date" value={range.startDate} onChange={(e) => setRange({ ...range, startDate: e.target.value })} />
        <label>To</label>
        <input type="date" value={range.endDate} onChange={(e) => setRange({ ...range, endDate: e.target.value })} />
        <button type="submit" className="btn-primary">Apply Filter</button>
      </form>
      {report && (
        <>
          <ul className="stats-grid compact">
            <li className="stat-card"><p className="stat-value">{formatCurrency(report.summary.purchaseTotal)}</p><p className="stat-label">Purchases ({report.summary.purchaseCount})</p></li>
            <li className="stat-card"><p className="stat-value">{formatCurrency(report.summary.saleTotal)}</p><p className="stat-label">Sales ({report.summary.saleCount})</p></li>
            <li className="stat-card"><p className="stat-value">{formatCurrency(report.summary.orderTotal)}</p><p className="stat-label">Orders ({report.summary.orderCount})</p></li>
          </ul>
          <h3>Top Selling Products</h3>
          <table className="data-table">
            <thead><tr><th>Product</th><th>Qty Sold</th><th>Revenue</th></tr></thead>
            <tbody>
              {report.topProducts.map((p) => (
                <tr key={p._id}><td>{p.name}</td><td>{p.totalQty}</td><td>{formatCurrency(p.revenue)}</td></tr>
              ))}
            </tbody>
          </table>
          <h3>Recent Sales</h3>
          <table className="data-table">
            <thead><tr><th>Date</th><th>Product</th><th>Amount</th></tr></thead>
            <tbody>
              {report.sales.slice(0, 10).map((s) => (
                <tr key={s._id}><td>{formatDate(s.createdAt)}</td><td>{s.product?.name}</td><td>{formatCurrency(s.totalAmount)}</td></tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </section>
  );
}
