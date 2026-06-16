import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * CustomSelect — fully styled dropdown replacing native <select>
 *
 * Props:
 *   options      : [{ value, label }]  or  ['string', ...]
 *   value        : current value
 *   onChange     : (value) => void
 *   placeholder  : string
 *   required     : bool
 *   id           : string (for label association)
 */
export default function CustomSelect({
  options = [],
  value,
  onChange,
  placeholder = 'Select an option',
  required = false,
  id,
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Normalise options to { value, label }
  const normalised = options.map((o) =>
    typeof o === 'string' ? { value: o, label: o } : o
  );

  const selected = normalised.find((o) => o.value === value) || null;

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen((o) => !o); }
    if (e.key === 'Escape') setOpen(false);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const idx = normalised.findIndex((o) => o.value === value);
      const next = normalised[Math.min(idx + 1, normalised.length - 1)];
      if (next) onChange(next.value);
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const idx = normalised.findIndex((o) => o.value === value);
      const prev = normalised[Math.max(idx - 1, 0)];
      if (prev) onChange(prev.value);
    }
  };

  return (
    <div className={`cselect${open ? ' cselect--open' : ''}`} ref={ref}>
      {/* Hidden native input for form validation */}
      {required && (
        <input
          tabIndex={-1}
          required
          value={value || ''}
          onChange={() => {}}
          style={{ position: 'absolute', opacity: 0, width: 0, height: 0, pointerEvents: 'none' }}
          aria-hidden="true"
        />
      )}

      <button
        type="button"
        id={id}
        className="cselect__trigger"
        onClick={() => setOpen((o) => !o)}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={selected ? 'cselect__value' : 'cselect__placeholder'}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown size={16} className="cselect__chevron" />
      </button>

      {open && (
        <ul className="cselect__list" role="listbox">
          {normalised.map((opt) => (
            <li
              key={opt.value}
              role="option"
              aria-selected={opt.value === value}
              className={`cselect__option${opt.value === value ? ' cselect__option--selected' : ''}`}
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(opt.value);
                setOpen(false);
              }}
            >
              {opt.label}
              {opt.value === value && (
                <span className="cselect__check">✓</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
