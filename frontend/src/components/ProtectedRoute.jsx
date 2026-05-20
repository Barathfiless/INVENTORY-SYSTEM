import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getPortalPath } from '../utils/portalPaths';

export const ProtectedRoute = ({ children, roles }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="page-loading">Loading...</div>;
  if (!user) return <Navigate to="/" replace />;
  if (roles && !roles.includes(user.role)) {
    return <Navigate to={getPortalPath(user.role)} replace />;
  }
  return children;
};
