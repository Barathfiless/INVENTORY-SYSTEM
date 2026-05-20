import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Login from '../pages/auth/Login';

export default function LoginRoute() {
  const { user, loading } = useAuth();
  if (loading) return <div className="page-loading">Loading...</div>;
  if (user?.role === 'admin') return <Navigate to="/admin" replace />;
  if (user?.role === 'customer') return <Navigate to="/shop" replace />;
  return <Login />;
}
