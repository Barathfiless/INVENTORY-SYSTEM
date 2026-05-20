import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function GuestRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="page-loading">Loading...</div>;
  if (user?.role === 'admin') return <Navigate to="/admin" replace />;
  if (user?.role === 'customer') return <Navigate to="/shop" replace />;
  return children;
}
