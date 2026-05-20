import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getPortalPath } from '../../utils/portalPaths';
import { ROLE_OPTIONS } from '../../constants/roleOptions';

export default function Register() {
  const [role, setRole] = useState('customer');
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleRoleChange = (nextRole) => {
    setRole(nextRole);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) {
      setError('Passwords do not match');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const user = await register({
        name: form.name,
        email: form.email,
        password: form.password,
        role,
      });
      navigate(getPortalPath(user.role));
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const selectedRole = ROLE_OPTIONS.find((r) => r.value === role);

  return (
    <div className="auth-page">
      <div className="auth-card auth-card-wide">
        <h1>Create Account</h1>
        <p className="auth-subtitle">Choose your role to register for the correct portal</p>

        <div className="role-selector">
          <span className="role-selector-label">Register as</span>
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
          <label>Name</label>
          <input name="name" value={form.name} onChange={handleChange} required />
          <label>Email</label>
          <input
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            autoComplete="email"
            required
          />
          <label>Password</label>
          <input
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            autoComplete="new-password"
            required
            minLength={6}
          />
          <label>Confirm Password</label>
          <input
            name="confirm"
            type="password"
            value={form.confirm}
            onChange={handleChange}
            autoComplete="new-password"
            required
          />
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Creating...' : `Register for ${selectedRole?.portal}`}
          </button>
        </form>
        <p className="auth-footer">
          Already have an account? <Link to="/">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
