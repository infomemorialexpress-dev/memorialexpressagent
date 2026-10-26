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
  const isNumber = type === 'number';
  const effectiveMin = min !== undefined ? min : (isNumber ? '0' : undefined);

  const handleKeyDown = (e) => {
    if (isNumber) {
      // Prevent entering negative sign or exponential notation
      if (e.key === '-' || e.key === 'e' || e.key === 'E') {
        e.preventDefault();
      }
    }
  };

  const handleWheel = (e) => {
    if (isNumber) {
      e.target.blur();
    }
  };

  const handleChange = (e) => {
    if (isNumber && onChange) {
      const rawVal = e.target.value;
      if (rawVal !== '' && Number(rawVal) < 0) {
        e.target.value = '0';
      }
    }
    if (onChange) {
      onChange(e);
    }
  };

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
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onWheel={handleWheel}
        placeholder={placeholder}
        disabled={disabled}
        min={effectiveMin}
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
