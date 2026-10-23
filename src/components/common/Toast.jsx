import React, { useEffect } from 'react';

export default function Toast({ message, type = 'info', onClose, duration = 4000 }) {
  useEffect(() => {
    if (!duration) return;
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const typeClass = type === 'success' 
    ? 'toast-success' 
    : type === 'error' 
    ? 'toast-error' 
    : 'toast-info';

  const icon = type === 'success' ? '✓' : type === 'error' ? '⚠' : 'ℹ';

  return (
    <div className={`toast ${typeClass}`}>
      <span style={{ fontSize: 16 }}>{icon}</span>
      <span style={{ flex: 1 }}>{message}</span>
      <button
        onClick={onClose}
        style={{
          background: 'none',
          border: 'none',
          color: 'inherit',
          cursor: 'pointer',
          fontSize: 16,
          lineHeight: 1
        }}
      >
        ×
      </button>
    </div>
  );
}
