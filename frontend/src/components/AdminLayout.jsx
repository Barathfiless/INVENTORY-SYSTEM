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
  const [storePincode, setStorePincode] = useState(
    () => localStorage.getItem('stocksync_store_pincode') || ''
  );
  const [storeCity, setStoreCity] = useState(
    () => localStorage.getItem('stocksync_store_city') || ''
  );
  const [storeState, setStoreState] = useState(
    () => localStorage.getItem('stocksync_store_state') || ''
  );

  // Theme state for Admin portal
  const [theme, setTheme] = useState(
    () => localStorage.getItem('stocksync_admin_theme') || 'light'
  );

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      localStorage.setItem('stocksync_admin_theme', next);
      return next;
    });
  };

  // Modal state
  const [modalStep, setModalStep] = useState(null); // null | 'password' | 'edit'
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [draftPincode, setDraftPincode] = useState('');
  const [draftCity, setDraftCity] = useState('');
  const [draftState, setDraftState] = useState('');
  const [detecting, setDetecting] = useState(false);
  const [detectError, setDetectError] = useState('');
  const [nameError, setNameError] = useState('');
  const nameInputRef = useRef(null);

  useEffect(() => {
    if (modalStep === 'edit' && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [modalStep]);

  // Automate location lookup when draft pincode reaches 6 digits
  useEffect(() => {
    const cleanZip = draftPincode.trim();
    if (cleanZip.length === 6 && /^\d+$/.test(cleanZip)) {
      const detectStoreLocation = async () => {
        setDetecting(true);
        setDetectError('');
        try {
          const res = await fetch(`https://api.postalpincode.in/pincode/${cleanZip}`);
          const data = await res.json();
          if (data[0] && data[0].Status === 'Success' && data[0].PostOffice && data[0].PostOffice[0]) {
            const pos = data[0].PostOffice;
            const diffBlockPO = pos.find(po => po.Block && po.Block !== po.District && po.Block !== 'Not Available');
            const rawCity = diffBlockPO ? diffBlockPO.Block : pos[0].District;
            const resolvedCity = rawCity
              .replace(/\s+(North|South|East|West|Taluk|Tehsil|City|Rural|Urban)$/i, '')
              .trim();
            const resolvedState = pos[0].State;

            setDraftCity(resolvedCity);
            setDraftState(resolvedState);
            setDetectError('');
          } else {
            setDetectError('Pincode not found. Please try another.');
            setDraftCity('');
            setDraftState('');
          }
        } catch (err) {
          console.warn('Store Pincode lookup failed:', err);
          // Fallback static mapping
          const firstDigit = cleanZip[0];
          const cityMap = {
            '1': { city: 'Delhi', state: 'Delhi' },
            '2': { city: 'Noida', state: 'Uttar Pradesh' },
            '3': { city: 'Mumbai', state: 'Maharashtra' },
            '4': { city: 'Pune', state: 'Maharashtra' },
            '5': { city: 'Bengaluru', state: 'Karnataka' },
            '6': { city: 'Chennai', state: 'Tamil Nadu' },
            '7': { city: 'Kolkata', state: 'West Bengal' },
            '8': { city: 'Patna', state: 'Bihar' },
            '9': { city: 'Guwahati', state: 'Assam' }
          };
          const resolved = cityMap[firstDigit] || { city: 'Coimbatore', state: 'Tamil Nadu' };
          setDraftCity(resolved.city);
          setDraftState(resolved.state);
          setDetectError('');
        } finally {
          setDetecting(false);
        }
      };
      detectStoreLocation();
    } else {
      if (cleanZip.length < 6) {
        setDraftCity('');
        setDraftState('');
      }
    }
  }, [draftPincode]);

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
    setDraftPincode('');
    setDraftCity('');
    setDraftState('');
    setDetectError('');
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
      setDraftPincode(storePincode);
      setDraftCity(storeCity);
      setDraftState(storeState);
      setDetectError('');
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
    
    const cleanZip = draftPincode.trim();
    if (cleanZip.length > 0 && (cleanZip.length !== 6 || !/^\d+$/.test(cleanZip))) {
      setNameError('Pincode must be exactly 6 digits');
      return;
    }

    setStoreName(trimmed);
    localStorage.setItem(STORE_NAME_KEY, trimmed);

    setStorePincode(cleanZip);
    localStorage.setItem('stocksync_store_pincode', cleanZip);

    setStoreCity(draftCity);
    localStorage.setItem('stocksync_store_city', draftCity);

    setStoreState(draftState);
    localStorage.setItem('stocksync_store_state', draftState);

    closeModal();
  };

  return (
    <div className={`admin-layout ${theme === 'dark' ? 'dark-theme' : ''}`}>
      <div className="admin-content">
        <AdminHeader
          storeName={storeName}
          storeCity={storeCity}
          onEditStore={openModal}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
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

                <div className="sn-field" style={{ marginTop: '1rem' }}>
                  <label htmlFor="sn-pincode">Store Pincode</label>
                  <input
                    id="sn-pincode"
                    type="text"
                    value={draftPincode}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setDraftPincode(val);
                      setNameError('');
                    }}
                    placeholder="Enter 6-digit Pincode"
                    maxLength={6}
                  />
                  {detecting && (
                    <p style={{ fontSize: '0.8rem', color: 'var(--brand-primary)', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <span className="location-detecting-spinner" style={{ width: '12px', height: '12px', border: '2px solid var(--brand-primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                      Detecting store location...
                    </p>
                  )}
                  {detectError && (
                    <p style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
                      {detectError}
                    </p>
                  )}
                  {draftCity && (
                    <div style={{
                      marginTop: '0.5rem',
                      padding: '0.5rem 0.75rem',
                      backgroundColor: 'rgba(16, 185, 129, 0.1)',
                      border: '1px solid rgba(16, 185, 129, 0.25)',
                      borderRadius: '6px',
                      fontSize: '0.85rem',
                      color: '#047857',
                      fontWeight: 600
                    }}>
                      Detected Location: {draftCity}, {draftState}
                    </div>
                  )}
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
