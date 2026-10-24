import React from 'react';

export default function Button({
  children,
  onClick,
  variant = 'default', // 'primary', 'secondary', 'danger', 'default'
  size = 'md',        // 'sm', 'md', 'lg'
  disabled = false,
  loading = false,
  type = 'button',
  className = '',
  id,
  title,
  icon = null,
  style = {}
}) {
  const variantClass = variant === 'primary' 
    ? 'btn-primary' 
    : variant === 'secondary' 
    ? 'btn-secondary' 
    : variant === 'danger'
    ? 'btn-danger'
    : '';

  const sizeClass = size === 'sm' ? 'btn-sm' : size === 'lg' ? 'btn-lg' : '';

  return (
    <button
      id={id}
      type={type}
      className={`btn ${variantClass} ${sizeClass} ${className}`}
      onClick={onClick}
      disabled={disabled || loading}
      title={title}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        ...style
      }}
    >
      {loading && (
        <svg
          style={{ width: 16, height: 16, animation: 'spin 0.8s linear infinite', flexShrink: 0 }}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.75"
        >
          <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
          <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
        </svg>
      )}
      {!loading && icon}
      <span>{children}</span>
    </button>
  );
}
