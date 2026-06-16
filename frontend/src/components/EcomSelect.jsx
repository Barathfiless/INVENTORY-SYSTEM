import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

export default function EcomSelect({ value, onChange, disabled }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (val) => {
    if (!disabled) {
      onChange(val);
    }
    setOpen(false);
  };

  const handleKeyDown = (e) => {
    if (disabled) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setOpen((o) => !o);
    }
    if (e.key === 'Escape') setOpen(false);
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      handleSelect(value === 'live' ? 'off' : 'live');
    }
  };

  const isLive = value === 'live';

  return (
    <div className={`ecom-dropdown${open ? ' ecom-dropdown--open' : ''}`} ref={ref}>
      <button
        type="button"
        className={`ecom-select-btn ecom-select-btn--${value}`}
        onClick={() => !disabled && setOpen((o) => !o)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="ecom-select-label">{isLive ? 'On Sale' : 'Off Sale'}</span>
        <ChevronDown size={14} className="ecom-select-chevron" />
      </button>

      {open && (
        <ul className="ecom-options-list" role="listbox">
          <li
            role="option"
            aria-selected={value === 'off'}
            className={`ecom-option ecom-option--off${value === 'off' ? ' selected' : ''}`}
            onMouseDown={(e) => {
              e.preventDefault();
              handleSelect('off');
            }}
          >
            <span>Off Sale</span>
            {value === 'off' && <span className="ecom-option-check">✓</span>}
          </li>
          <li
            role="option"
            aria-selected={value === 'live'}
            className={`ecom-option ecom-option--live${value === 'live' ? ' selected' : ''}`}
            onMouseDown={(e) => {
              e.preventDefault();
              handleSelect('live');
            }}
          >
            <span>On Sale</span>
            {value === 'live' && <span className="ecom-option-check">✓</span>}
          </li>
        </ul>
      )}
    </div>
  );
}
