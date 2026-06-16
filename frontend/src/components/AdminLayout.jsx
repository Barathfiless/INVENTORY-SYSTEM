import { useState, useEffect, useRef } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import {
  Package,
  Pencil,
  X,
  Check,
  Eye,
  EyeOff,
  Store,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../api/api';
import AdminHeader from './AdminHeader';

const STORE_NAME_KEY = 'stocksync_store_name';

export default function AdminLayout() {
  const { user, isAdmin } = useAuth();

  // Store name state
  const [storeName, setStoreName] = useState(
    () => localStorage.getItem(STORE_NAME_KEY) || 'My Store'
  );

  // Modal state
  const [modalStep, setModalStep] = useState(null); // null | 'password' | 'edit'
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [nameError, setNameError] = useState('');
  const nameInputRef = useRef(null);

  useEffect(() => {
    if (modalStep === 'edit' && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [modalStep]);

  if (!isAdmin) return <Navigate to={user ? '/shop' : '/'} replace />;

  const openModal = () => {
    setPassword('');
    setPasswordError('');
    setShowPassword(false);
    setModalStep('password');
  };

  const closeModal = () => {
    setModalStep(null);
    setPassword('');
    setPasswordError('');
    setDraftName('');
    setNameError('');
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    if (!password) { setPasswordError('Password is required'); return; }
    setPasswordLoading(true);
    setPasswordError('');
    try {
      await authAPI.login({ email: user.email, password });
      setDraftName(storeName);
      setModalStep('edit');
    } catch {
      setPasswordError('Incorrect password. Please try again.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleNameSave = (e) => {
    e.preventDefault();
    const trimmed = draftName.trim();
    if (!trimmed) { setNameError('Store name cannot be empty'); return; }
    if (trimmed.length > 40) { setNameError('Store name must be 40 characters or less'); return; }
    setStoreName(trimmed);
    localStorage.setItem(STORE_NAME_KEY, trimmed);
    closeModal();
  };

  return (
    <div className="admin-layout">
      <div className="admin-content">
        <AdminHeader storeName={storeName} onEditStore={openModal} />
        <main className="admin-main">
          <Outlet />
        </main>
      </div>

      {/* Store Name Modal */}
      {modalStep && (
        <div className="sn-overlay" onClick={closeModal} role="dialog" aria-modal="true">
          <div className="sn-modal" onClick={(e) => e.stopPropagation()}>
            <div className="sn-modal-header">
              <div className="sn-modal-title-wrap">
                <span className="sn-modal-icon">
                  {modalStep === 'password' ? <Store size={18} /> : <Pencil size={18} />}
                </span>
                <h3 className="sn-modal-title">
                  {modalStep === 'password' ? 'Confirm your password' : 'Edit store name'}
                </h3>
              </div>
              <button type="button" className="sn-modal-close" onClick={closeModal} aria-label="Close">
                <X size={18} />
              </button>
            </div>

            {modalStep === 'password' && (
              <form onSubmit={handlePasswordSubmit} noValidate>
                <p className="sn-modal-desc">
                  Enter your admin password to edit the store name.
                </p>
                <div className="sn-field">
                  <label htmlFor="sn-password">Password</label>
                  <div className="sn-password-wrap">
                    <input
                      id="sn-password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setPasswordError(''); }}
                      placeholder="Enter your password"
                      autoFocus
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      className="sn-password-toggle"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {passwordError && <p className="sn-field-error">{passwordError}</p>}
                </div>
                <div className="sn-modal-actions">
                  <button type="button" className="sn-btn sn-btn--ghost" onClick={closeModal}>
                    Cancel
                  </button>
                  <button type="submit" className="sn-btn sn-btn--primary" disabled={passwordLoading}>
                    {passwordLoading ? 'Verifying…' : 'Continue'}
                  </button>
                </div>
              </form>
            )}

            {modalStep === 'edit' && (
              <form onSubmit={handleNameSave} noValidate>
                <p className="sn-modal-desc">
                  This name appears in the sidebar and header.
                </p>
                <div className="sn-field">
                  <label htmlFor="sn-name">Store name</label>
                  <input
                    id="sn-name"
                    ref={nameInputRef}
                    type="text"
                    value={draftName}
                    onChange={(e) => { setDraftName(e.target.value); setNameError(''); }}
                    placeholder="e.g. Sunrise Electronics"
                    maxLength={40}
                  />
                  <div className="sn-field-meta">
                    {nameError
                      ? <p className="sn-field-error">{nameError}</p>
                      : <span />
                    }
                    <span className="sn-char-count">{draftName.length}/40</span>
                  </div>
                </div>
                <div className="sn-modal-actions">
                  <button type="button" className="sn-btn sn-btn--ghost" onClick={closeModal}>
                    Cancel
                  </button>
                  <button type="submit" className="sn-btn sn-btn--primary">
                    <Check size={15} />
                    Save
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
