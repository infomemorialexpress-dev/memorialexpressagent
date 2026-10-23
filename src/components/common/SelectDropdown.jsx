import React from 'react';

export default function SelectDropdown({
  label,
  value,
  onChange,
  options = [], // [{ value, label, disabled }] or [value, label]
  id,
  name,
  disabled = false,
  required = false,
  error = '',
  hint = '',
  className = '',
  style = {}
}) {
  return (
    <div className={`form-group ${className}`} style={style}>
      {label && (
        <label htmlFor={id} className="form-label">
          <span>{label} {required && <span style={{ color: '#dc2626' }}>*</span>}</span>
        </label>
      )}
      <select
        id={id}
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={`form-select ${error ? 'has-error' : ''}`}
      >
        {options.map((opt, i) => {
          if (Array.isArray(opt)) {
            return (
              <option key={opt[0] || i} value={opt[0]}>
                {opt[1]}
              </option>
            );
          }
          return (
            <option key={opt.value || i} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </option>
          );
        })}
      </select>
      {hint && !error && <span className="form-hint">{hint}</span>}
      {error && <span className="form-error">{error}</span>}
    </div>
  );
}
