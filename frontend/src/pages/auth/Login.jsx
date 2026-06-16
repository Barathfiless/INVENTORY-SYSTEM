import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getPortalPath } from '../../utils/portalPaths';
import { ROLE_OPTIONS } from '../../constants/roleOptions';

export default function Login() {
  const [role, setRole] = useState('customer');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, logout } = useAuth();
  const navigate = useNavigate();

  const handleRoleChange = (nextRole) => {
    setRole(nextRole);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);
      if (user.role !== role) {
        logout();
        const expected = ROLE_OPTIONS.find((r) => r.value === role);
        setError(
          `Invalid credentials for ${expected?.portal}. Use the ${user.role === 'admin' ? 'Admin' : 'Customer'} role instead.`
        );
        return;
      }
      navigate(getPortalPath(user.role));
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const selectedRole = ROLE_OPTIONS.find((r) => r.value === role);

  return (
    <div className="auth-page">
      <div className="auth-card auth-card-wide">
        <h1>Sign In</h1>
        <p className="auth-subtitle">Choose your role to access the correct portal</p>

        <div className="role-selector">
          <span className="role-selector-label">Sign in as</span>
          <div className="role-selector-options">
            {ROLE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`role-option${role === option.value ? ' active' : ''}`}
                onClick={() => handleRoleChange(option.value)}
                aria-pressed={role === option.value}
              >
                <span className="role-option-title">{option.label}</span>
                <span className="role-option-portal">{option.portal}</span>
              </button>
            ))}
          </div>
        </div>

        {error && <div className="alert error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
          <button type="submit" className="btn-primary full" disabled={loading}>
            {loading ? 'Signing in...' : `Sign In to ${selectedRole?.portal}`}
          </button>
        </form>
        <p className="auth-footer">
          Don&apos;t have an account? <Link to="/register">Create account</Link>
        </p>
      </div>
    </div>
  );
}
