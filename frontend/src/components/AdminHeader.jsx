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
  Store,
  Check,
  Trash2,
  Clock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { reportAPI, orderAPI, productAPI } from '../api/api';
import { formatCurrency } from '../utils/format';

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

function formatTimeAgo(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
}

export default function AdminHeader({ storeName, onEditStore }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  
  const [readIds, setReadIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('stocksync_read_notifications') || '[]');
    } catch {
      return [];
    }
  });
  
  const [deletedIds, setDeletedIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('stocksync_deleted_notifications') || '[]');
    } catch {
      return [];
    }
  });

  const notifRef = useRef(null);
  const profileRef = useRef(null);

  useEffect(() => {
    const load = async () => {
      const items = [];
      try {
        const [{ data: stockData }, { data: orders }] = await Promise.all([
          productAPI.getStock(),
          orderAPI.getAll(),
        ]);

        // 1. Process individual low stock / out of stock items
        if (stockData && stockData.products) {
          stockData.products.forEach((p) => {
            const isOut = p.stock === 0;
            const isLow = p.stock > 0 && p.stock <= p.lowStockThreshold;
            if (isOut || isLow) {
              items.push({
                id: `stock-${p._id}-${p.stock}`,
                title: isOut ? 'Out of stock alert' : 'Low stock alert',
                message: isOut 
                  ? `${p.name} is completely out of stock` 
                  : `${p.name} has only ${p.stock} units left`,
                link: '/admin/stock',
                Icon: AlertTriangle,
                tone: 'warn',
                timestamp: p.updatedAt || p.createdAt || new Date().toISOString(),
              });
            }
          });
        }

        // 2. Process e-commerce orders (take up to 15 latest orders)
        if (orders && orders.length > 0) {
          const sortedOrders = [...orders].sort(
            (a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt)
          );
          
          const latestOrders = sortedOrders.slice(0, 15);
          latestOrders.forEach((order) => {
            const shortId = (order._id || '').slice(-8).toUpperCase();
            const customerName = order.user?.name || 'Customer';
            const price = formatCurrency(order.totalPrice);
            
            let title = 'Order Update';
            let message = `Order #${shortId} status updated`;
            let tone = 'info';
            let icon = ShoppingCart;

            if (order.status === 'pending') {
              title = 'New Order Received';
              message = `Order #${shortId} by ${customerName} is pending approval (${price})`;
              tone = 'info';
              icon = ShoppingCart;
            } else if (order.status === 'processing') {
              title = 'Order Processing';
              message = `Order #${shortId} is now processing (${price})`;
              tone = 'info';
              icon = ShoppingCart;
            } else if (order.status === 'shipped') {
              title = 'Order Shipped';
              message = `Order #${shortId} has been shipped`;
              tone = 'info';
              icon = ShoppingCart;
            } else if (order.status === 'delivered') {
              title = 'Order Delivered';
              message = `Order #${shortId} was delivered successfully`;
              tone = 'muted';
              icon = Package;
            } else if (order.status === 'cancelled') {
              title = 'Order Cancelled';
              message = `Order #${shortId} by ${customerName} was cancelled`;
              tone = 'warn';
              icon = AlertTriangle;
            }

            items.push({
              id: `order-${order._id}-${order.status}`,
              title,
              message,
              link: '/admin/orders',
              Icon: icon,
              tone,
              timestamp: order.updatedAt || order.createdAt || new Date().toISOString(),
            });
          });
        }

        // 3. Fallback if no notifications exist at all
        if (items.length === 0) {
          items.push({
            id: 'orders-ok',
            title: 'All caught up',
            message: 'No active stock alerts or order updates',
            link: '/admin/orders',
            Icon: Package,
            tone: 'muted',
            timestamp: null,
          });
        }
      } catch (err) {
        items.push({
          id: 'error',
          title: 'Could not load alerts',
          message: 'Refresh the page to try again',
          link: null,
          Icon: AlertTriangle,
          tone: 'muted',
          timestamp: null,
        });
      }

      // Sort all notifications by timestamp descending (null timestamps go to the bottom)
      items.sort((a, b) => {
        if (!a.timestamp) return 1;
        if (!b.timestamp) return -1;
        return new Date(b.timestamp) - new Date(a.timestamp);
      });

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

  const handleMarkAsRead = (id) => {
    setReadIds((prev) => {
      const next = [...new Set([...prev, id])];
      localStorage.setItem('stocksync_read_notifications', JSON.stringify(next));
      return next;
    });
  };

  const handleMarkAllAsRead = () => {
    const visibleUnreadIds = notifications
      .filter((n) => !deletedIds.includes(n.id) && !readIds.includes(n.id) && n.id !== 'orders-ok' && n.id !== 'error')
      .map((n) => n.id);
    
    if (visibleUnreadIds.length === 0) return;

    setReadIds((prev) => {
      const next = [...new Set([...prev, ...visibleUnreadIds])];
      localStorage.setItem('stocksync_read_notifications', JSON.stringify(next));
      return next;
    });
  };

  const handleDeleteNotification = (id) => {
    setDeletedIds((prev) => {
      const next = [...new Set([...prev, id])];
      localStorage.setItem('stocksync_deleted_notifications', JSON.stringify(next));
      return next;
    });
  };

  const handleDeleteAll = () => {
    const visibleIds = notifications
      .filter((n) => !deletedIds.includes(n.id) && n.id !== 'orders-ok' && n.id !== 'error')
      .map((n) => n.id);
    
    if (visibleIds.length === 0) return;

    setDeletedIds((prev) => {
      const next = [...new Set([...prev, ...visibleIds])];
      localStorage.setItem('stocksync_deleted_notifications', JSON.stringify(next));
      return next;
    });
  };

  const visibleNotifications = notifications.filter((n) => !deletedIds.includes(n.id));

  const hasActiveNotifications = visibleNotifications.some(
    (n) => n.id !== 'orders-ok' && n.id !== 'error'
  );

  const unreadCount = visibleNotifications.filter(
    (n) => !readIds.includes(n.id) && n.id !== 'orders-ok' && n.id !== 'error'
  ).length;

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
                  <div className="notif-header-left">
                    <span>Notifications</span>
                    {unreadCount > 0 && <span className="dropdown-count">{unreadCount} new</span>}
                  </div>
                  {hasActiveNotifications && (
                    <div className="notif-header-actions">
                      {unreadCount > 0 && (
                        <button
                          type="button"
                          className="notif-header-btn"
                          onClick={handleMarkAllAsRead}
                        >
                          Mark all as read
                        </button>
                      )}
                      {unreadCount > 0 && <span className="notif-header-sep">|</span>}
                      <button
                        type="button"
                        className="notif-header-btn notif-header-btn--danger"
                        onClick={handleDeleteAll}
                      >
                        Delete all
                      </button>
                    </div>
                  )}
                </div>
                <ul className="notification-list">
                  {visibleNotifications.length === 0 ? (
                    <li className="notification-empty">No notifications</li>
                  ) : (
                    visibleNotifications.map(({ id, title, message, link, Icon, tone, timestamp }) => {
                      const isRead = readIds.includes(id) || id === 'orders-ok' || id === 'error';
                      return (
                        <li key={id} className={`notification-row ${isRead ? 'read' : 'unread'}`}>
                          {link ? (
                            <Link
                              to={link}
                              className={`notification-item notification-item--${tone}`}
                              onClick={() => setNotificationsOpen(false)}
                            >
                              <span className="notification-icon">
                                <Icon size={16} />
                              </span>
                              <span className="notification-content">
                                <strong>{title}</strong>
                                <small>{message}</small>
                                {timestamp && (
                                  <span className="notification-time">
                                    <Clock size={10} />
                                    {formatTimeAgo(timestamp)}
                                  </span>
                                )}
                              </span>
                            </Link>
                          ) : (
                            <div className={`notification-item notification-item--${tone}`}>
                              <span className="notification-icon">
                                <Icon size={16} />
                              </span>
                              <span className="notification-content">
                                <strong>{title}</strong>
                                <small>{message}</small>
                                {timestamp && (
                                  <span className="notification-time">
                                    <Clock size={10} />
                                    {formatTimeAgo(timestamp)}
                                  </span>
                                )}
                              </span>
                            </div>
                          )}
                          
                          {!isRead && <span className="unread-indicator-dot" />}

                          <div className="notification-actions">
                            {!isRead && (
                              <button
                                type="button"
                                className="notif-action-btn notif-action-btn--read"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  handleMarkAsRead(id);
                                }}
                                title="Mark as read"
                              >
                                <Check size={12} />
                              </button>
                            )}
                            {id !== 'orders-ok' && id !== 'error' && (
                              <button
                                type="button"
                                className="notif-action-btn notif-action-btn--delete"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  handleDeleteNotification(id);
                                }}
                                title="Delete notification"
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                        </li>
                      );
                    })
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
