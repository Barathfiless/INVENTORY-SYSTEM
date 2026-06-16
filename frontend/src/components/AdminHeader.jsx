import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  PackagePlus,
  PackageMinus,
  Boxes,
  BarChart3,
  Bell,
  ChevronDown,
  LogOut,
  User,
  Package,
  AlertTriangle,
  ShoppingCart,
  Pencil,
  Store
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { reportAPI, orderAPI } from '../api/api';

const navItems = [
  { path: '/admin', label: 'Dashboard', Icon: LayoutDashboard },
  { path: '/admin/purchases', label: 'Purchases', Icon: PackagePlus },
  { path: '/admin/sales', label: 'Sales', Icon: PackageMinus },
  { path: '/admin/stock', label: 'Stock Available', Icon: Boxes },
  { path: '/admin/reports', label: 'Reports', Icon: BarChart3 },
  { path: '/admin/orders', label: 'E-commerce Orders', Icon: ShoppingCart },
];

function getInitials(name) {
  if (!name) return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export default function AdminHeader({ storeName, onEditStore }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const notifRef = useRef(null);
  const profileRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      const items = [];
      try {
        const [{ data: stats }, { data: orders }] = await Promise.all([
          reportAPI.getDashboard(),
          orderAPI.getAll(),
        ]);

        if (stats.lowStockCount > 0) {
          items.push({
            id: 'low-stock',
            title: 'Low stock alert',
            message: `${stats.lowStockCount} product${stats.lowStockCount > 1 ? 's' : ''} below threshold`,
            link: '/admin/stock',
            Icon: AlertTriangle,
            tone: 'warn',
          });
        }

        const pending = orders.filter((o) => o.status === 'pending' || o.status === 'processing');
        if (pending.length > 0) {
          items.push({
            id: 'pending-orders',
            title: 'Orders need attention',
            message: `${pending.length} order${pending.length > 1 ? 's' : ''} pending or processing`,
            link: '/admin/orders',
            Icon: ShoppingCart,
            tone: 'info',
          });
        }

        if (stats.orderCount > 0 && items.length === 0) {
          items.push({
            id: 'orders-ok',
            title: 'All caught up',
            message: 'No urgent inventory or order alerts',
            link: '/admin/orders',
            Icon: Package,
            tone: 'muted',
          });
        }
      } catch {
        items.push({
          id: 'error',
          title: 'Could not load alerts',
          message: 'Refresh the page to try again',
          link: null,
          Icon: AlertTriangle,
          tone: 'muted',
        });
      }
      setNotifications(items);
    };
    load();
  }, [location.pathname]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotificationsOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const unreadCount = notifications.filter((n) => n.tone !== 'muted').length;

  return (
    <header className="admin-header-unified">
      <div className="admin-topbar">
        <div className="admin-topbar-left">
          <Link to="/admin" className="admin-logo-vercel">
            <span className="logo-text">StockSync</span>
          </Link>
          <span className="vercel-separator">/</span>
          <div className="admin-store-select">
            <span className="topbar-store-name">{storeName || 'My Store'}</span>
            <button
              type="button"
              className="topbar-store-edit-btn"
              onClick={onEditStore}
              aria-label="Edit store name"
              title="Edit store name"
            >
              <Pencil size={11} />
            </button>
          </div>
        </div>

        <div className="admin-topbar-actions">
          <div className="admin-dropdown-wrap" ref={notifRef}>
            <button
              type="button"
              className="admin-topbar-btn"
              onClick={() => {
                setNotificationsOpen((o) => !o);
                setProfileOpen(false);
              }}
              aria-label="Notifications"
              aria-expanded={notificationsOpen}
            >
              <Bell size={18} />
              {unreadCount > 0 && <span className="topbar-badge">{unreadCount}</span>}
            </button>

            {notificationsOpen && (
              <div className="admin-dropdown admin-dropdown--notifications">
                <div className="admin-dropdown-header">
                  <span>Notifications</span>
                  {unreadCount > 0 && <span className="dropdown-count">{unreadCount} new</span>}
                </div>
                <ul className="notification-list">
                  {notifications.length === 0 ? (
                    <li className="notification-empty">No notifications</li>
                  ) : (
                    notifications.map(({ id, title, message, link, Icon, tone }) => (
                      <li key={id}>
                        {link ? (
                          <Link
                            to={link}
                            className={`notification-item notification-item--${tone}`}
                            onClick={() => setNotificationsOpen(false)}
                          >
                            <span className="notification-icon">
                              <Icon size={16} />
                            </span>
                            <span>
                              <strong>{title}</strong>
                              <small>{message}</small>
                            </span>
                          </Link>
                        ) : (
                          <div className={`notification-item notification-item--${tone}`}>
                            <span className="notification-icon">
                              <Icon size={16} />
                            </span>
                            <span>
                              <strong>{title}</strong>
                              <small>{message}</small>
                            </span>
                          </div>
                        )}
                      </li>
                    ))
                  )}
                </ul>
              </div>
            )}
          </div>

          <div className="admin-dropdown-wrap" ref={profileRef}>
            <button
              type="button"
              className="admin-profile-trigger"
              onClick={() => {
                setProfileOpen((o) => !o);
                setNotificationsOpen(false);
              }}
              aria-expanded={profileOpen}
            >
              <span className="profile-avatar">{getInitials(user?.name)}</span>
              <span className="profile-meta">
                <span className="profile-name">{user?.name}</span>
                <span className="profile-role">Admin</span>
              </span>
              <ChevronDown size={14} className={profileOpen ? 'chevron-open' : ''} />
            </button>

            {profileOpen && (
              <div className="admin-dropdown admin-dropdown--profile">
                <div className="profile-dropdown-head">
                  <span className="profile-avatar profile-avatar--lg">{getInitials(user?.name)}</span>
                  <div>
                    <p className="profile-dropdown-name">{user?.name}</p>
                    <p className="profile-dropdown-email">{user?.email}</p>
                  </div>
                </div>
                <div className="profile-dropdown-divider" />
                <button type="button" className="profile-dropdown-item" disabled>
                  <User size={16} />
                  My Profile
                  <span className="coming-soon">Soon</span>
                </button>
                <button type="button" className="profile-dropdown-item profile-dropdown-item--danger" onClick={handleLogout}>
                  <LogOut size={16} />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <nav className="admin-nav">
        {navItems.map(({ path, label, Icon }) => {
          const active =
            path === '/admin'
              ? location.pathname === '/admin'
              : location.pathname.startsWith(path);
          return (
            <Link key={path} to={path} className={`admin-nav-item ${active ? 'active' : ''}`}>
              <Icon size={14} strokeWidth={2} aria-hidden="true" />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
