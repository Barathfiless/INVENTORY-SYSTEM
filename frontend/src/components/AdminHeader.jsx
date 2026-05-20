import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Bell, ChevronDown, LogOut, User, Package, AlertTriangle, ShoppingCart, Menu } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { reportAPI, orderAPI } from '../api/api';

const PAGE_TITLES = {
  '/admin': 'Dashboard',
  '/admin/purchases': 'Purchases',
  '/admin/sales': 'Sales',
  '/admin/stock': 'Stock Available',
  '/admin/reports': 'Reports',
  '/admin/orders': 'E-commerce Orders',
};

function getInitials(name) {
  if (!name) return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export default function AdminHeader({ sidebarOpen, toggleSidebar }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const notifRef = useRef(null);
  const profileRef = useRef(null);

  const pageTitle =
    Object.entries(PAGE_TITLES).find(([path]) =>
      path === '/admin' ? location.pathname === '/admin' : location.pathname.startsWith(path)
    )?.[1] || 'Inventory';

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
    <header className="admin-topbar">
      <div className="admin-topbar-left">
        <button
          type="button"
          className="sidebar-toggle-btn"
          onClick={toggleSidebar}
          aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
        >
          <Menu size={20} />
        </button>
        <div className="admin-topbar-title">
          <h2>{pageTitle}</h2>
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
            <Bell size={20} />
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
              <span className="profile-role">Administrator</span>
            </span>
            <ChevronDown size={16} className={profileOpen ? 'chevron-open' : ''} />
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
    </header>
  );
}
