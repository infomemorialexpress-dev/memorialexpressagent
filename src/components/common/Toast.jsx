import React, { useEffect, useState, useRef } from 'react';

/**
 * Auto-dismissing Toast component with smooth entrance and exit animations
 */
export default function Toast({ message, type = 'info', onClose, duration = 3500 }) {
  const [isClosing, setIsClosing] = useState(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const triggerClose = () => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      onCloseRef.current?.();
    }, 220);
  };

  useEffect(() => {
    if (!duration || duration <= 0) return;
    const timer = setTimeout(() => {
      triggerClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration]); // Intentionally omitting onClose so parent re-renders don't reset timer

  const typeClass = type === 'success' 
    ? 'toast-success' 
    : type === 'error' 
    ? 'toast-error' 
    : 'toast-info';

  const icon = type === 'success' ? '✓' : type === 'error' ? '⚠' : 'ℹ';

  return (
    <div
      className={`toast ${typeClass} ${isClosing ? 'toast-closing' : ''}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 18px',
        borderRadius: '10px',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.16)',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        cursor: 'pointer',
        userSelect: 'none'
      }}
      onClick={triggerClose}
      title="Click to dismiss"
    >
      <span style={{ fontSize: 16, flexShrink: 0, fontWeight: 800 }}>{icon}</span>
      <span style={{ flex: 1, fontSize: '13.5px', lineHeight: 1.35, fontWeight: 550 }}>{message}</span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          triggerClose();
        }}
        style={{
          background: 'none',
          border: 'none',
          color: 'rgba(255, 255, 255, 0.75)',
          cursor: 'pointer',
          fontSize: 18,
          lineHeight: 1,
          padding: '0 4px',
          marginLeft: '4px',
          transition: 'color 0.15s'
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = '#ffffff'; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = 'rgba(255, 255, 255, 0.75)'; }}
        aria-label="Close notification"
      >
        ×
      </button>
    </div>
  );
}
