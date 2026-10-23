import React from 'react';

export default function InputField({
  label,
  value,
  onChange,
  placeholder = '',
  type = 'text',
  error = '',
  hint = '',
  id,
  name,
  disabled = false,
  required = false,
  min,
  max,
  step,
  className = '',
  autoFocus = false,
  style = {}
}) {
  return (
    <div className={`form-group ${className}`} style={style}>
      {label && (
        <label htmlFor={id} className="form-label">
          <span>{label} {required && <span style={{ color: '#dc2626' }}>*</span>}</span>
        </label>
      )}
      <input
        id={id}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        min={min}
        max={max}
        step={step}
        autoFocus={autoFocus}
        className={`form-input ${error ? 'has-error' : ''}`}
      />
      {hint && !error && <span className="form-hint">{hint}</span>}
      {error && <span className="form-error">{error}</span>}
    </div>
  );
}
