import { useState } from 'react';
import { Link, Outlet, useLocation, Navigate } from 'react-router-dom';
import {
  LayoutDashboard,
  PackagePlus,
  PackageMinus,
  Boxes,
  BarChart3,
  Tag,
  ShoppingCart,
  Package,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import AdminHeader from './AdminHeader';

const navItems = [
  { path: '/admin', label: 'Dashboard', Icon: LayoutDashboard },
  { path: '/admin/purchases', label: 'Purchases', Icon: PackagePlus },
  { path: '/admin/sales', label: 'Sales', Icon: PackageMinus },
  { path: '/admin/stock', label: 'Stock Available', Icon: Boxes },
  { path: '/admin/reports', label: 'Reports', Icon: BarChart3 },
  { path: '/admin/orders', label: 'E-commerce Orders', Icon: ShoppingCart },
];

export default function AdminLayout() {
  const { user, isAdmin } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  if (!isAdmin) return <Navigate to={user ? '/shop' : '/'} replace />;

  return (
    <div className="admin-layout">
      <aside className={`admin-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-brand">
          <Link to="/admin" className="brand-link">
            <Package size={22} strokeWidth={2.25} aria-hidden />
            <span>StockSync</span>
          </Link>
          <span className="badge">Inventory</span>
        </div>
        <nav>
          {navItems.map(({ path, label, Icon }) => {
            const active =
              path === '/admin'
                ? location.pathname === '/admin'
                : location.pathname.startsWith(path);
            return (
              <Link key={path} to={path} className={active ? 'active' : ''}>
                <Icon size={18} strokeWidth={2} aria-hidden />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className={`admin-content ${sidebarOpen ? '' : 'sidebar-closed'}`}>
        <AdminHeader sidebarOpen={sidebarOpen} toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
        <main className="admin-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
