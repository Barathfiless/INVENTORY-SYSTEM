import { useEffect, useState } from 'react';
import {
  Tag,
  Boxes,
  IndianRupee,
  PackagePlus,
  PackageMinus,
  ShoppingCart,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { reportAPI } from '../../api/api';
import { formatCurrency } from '../../utils/format';

const STAT_CONFIG = [
  { key: 'productCount', label: 'Total Products', Icon: Tag, tone: 'blue' },
  { key: 'totalStock', label: 'Total Stock Units', Icon: Boxes, tone: 'indigo' },
  { key: 'inventoryValue', label: 'Inventory Value', Icon: IndianRupee, tone: 'emerald', format: 'currency' },
  { key: 'totalPurchases', label: 'Total Purchases', Icon: PackagePlus, tone: 'violet', format: 'currency' },
  { key: 'totalSales', label: 'Total Sales', Icon: PackageMinus, tone: 'sky', format: 'currency' },
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

  const isProfit = stats.profit > 0;
  const isLoss = stats.loss > 0;
  const netAmount = isProfit ? stats.profit : isLoss ? stats.loss : 0;

  return (
    <section className="admin-page">
      <header className="admin-page-header">
      </header>

      {/* Profit / Loss Banner */}
      <div className={`pnl-banner pnl-banner--${isProfit ? 'profit' : isLoss ? 'loss' : 'neutral'}`}>
        <div className="pnl-icon-wrap">
          {isProfit ? <TrendingUp size={28} strokeWidth={2} /> : <TrendingDown size={28} strokeWidth={2} />}
        </div>
        <div className="pnl-info">
          <p className="pnl-label">{isProfit ? 'Net Profit' : isLoss ? 'Net Loss' : 'Break Even'}</p>
          <p className="pnl-value">{formatCurrency(netAmount)}</p>
        </div>
        <div className="pnl-breakdown">
          <span className="pnl-breakdown-item pnl-breakdown-item--sales">
            <PackageMinus size={14} />
            Sales: {formatCurrency(stats.totalSales)}
          </span>
          <span className="pnl-breakdown-sep">−</span>
          <span className="pnl-breakdown-item pnl-breakdown-item--purchases">
            <PackagePlus size={14} />
            Purchases: {formatCurrency(stats.totalPurchases)}
          </span>
        </div>
      </div>

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
