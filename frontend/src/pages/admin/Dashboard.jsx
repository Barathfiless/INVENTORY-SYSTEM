import { useEffect, useState } from 'react';
import {
  Tag,
  Boxes,
  IndianRupee,
  PackagePlus,
  PackageMinus,
  ShoppingCart,
  AlertTriangle,
} from 'lucide-react';
import { reportAPI } from '../../api/api';
import { formatCurrency } from '../../utils/format';

const STAT_CONFIG = [
  { key: 'productCount', label: 'Total Products', Icon: Tag, tone: 'blue' },
  { key: 'totalStock', label: 'Total Stock Units', Icon: Boxes, tone: 'indigo' },
  { key: 'inventoryValue', label: 'Inventory Value', Icon: IndianRupee, tone: 'emerald', format: 'currency' },
  { key: 'totalPurchases', label: 'Total Purchases', Icon: PackagePlus, tone: 'violet' },
  { key: 'totalSales', label: 'Total Sales', Icon: PackageMinus, tone: 'sky' },
  { key: 'orderCount', label: 'E-commerce Orders', Icon: ShoppingCart, tone: 'amber' },
  { key: 'lowStockCount', label: 'Low Stock Items', Icon: AlertTriangle, tone: 'rose', warn: true },
];

export default function Dashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    reportAPI.getDashboard().then(({ data }) => setStats(data));
  }, []);

  if (!stats) {
    return (
      <section className="admin-page">
        <p className="page-loading">Loading dashboard...</p>
      </section>
    );
  }

  return (
    <section className="admin-page">
      <header className="admin-page-header">
      </header>
      <ul className="stats-grid">
        {STAT_CONFIG.map(({ key, label, Icon, tone, format, warn }) => {
          const raw = stats[key];
          const value = format === 'currency' ? formatCurrency(raw) : raw;
          const isWarn = warn && raw > 0;
          return (
            <li key={key} className={`stat-card stat-card--${tone}${isWarn ? ' warn' : ''}`}>
              <span className="stat-icon-wrap">
                <Icon size={20} strokeWidth={2} aria-hidden />
              </span>
              <p className="stat-value">{value}</p>
              <p className="stat-label">{label}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
