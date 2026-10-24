import React from 'react';

/**
 * Premium Loading Spinner Component for MemorialExpress
 * Provides smooth, non-blocking hardware-accelerated spinning with optional label
 */
export default function LoadingSpinner({
  size = 'md', // 'sm', 'md', 'lg', 'xl' or number
  color = 'primary', // 'primary', 'accent', 'white', 'blue'
  label = null,
  subtext = null,
  fullHeight = false,
  minHeight = null,
  style = {},
  className = ''
}) {
  const sizeMap = {
    sm: 16,
    md: 24,
    lg: 38,
    xl: 52
  };

  const pxSize = typeof size === 'number' ? size : (sizeMap[size] || 24);
  const borderWidth = pxSize <= 18 ? 2 : pxSize <= 32 ? 2.8 : 3.5;

  const colorStyles = {
    primary: {
      border: `${borderWidth}px solid rgba(24, 54, 85, 0.14)`,
      borderTopColor: '#183655',
    },
    accent: {
      border: `${borderWidth}px solid rgba(212, 175, 55, 0.2)`,
      borderTopColor: '#d4af37',
    },
    white: {
      border: `${borderWidth}px solid rgba(255, 255, 255, 0.25)`,
      borderTopColor: '#ffffff',
    },
    blue: {
      border: `${borderWidth}px solid rgba(37, 99, 235, 0.15)`,
      borderTopColor: '#2563eb',
    }
  };

  const activeColor = colorStyles[color] || colorStyles.primary;

  const containerStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: label ? '24px 16px' : '8px',
    ...(fullHeight ? { minHeight: '60vh' } : {}),
    ...(minHeight ? { minHeight } : {}),
    ...style
  };

  return (
    <div className={`loading-spinner-container ${className}`} style={containerStyle}>
      <div
        className="app-spinner"
        style={{
          width: `${pxSize}px`,
          height: `${pxSize}px`,
          borderRadius: '50%',
          ...activeColor,
          flexShrink: 0
        }}
        role="status"
        aria-label={label || 'Loading...'}
      />
      {label && (
        <div
          style={{
            marginTop: pxSize >= 32 ? 14 : 10,
            fontSize: pxSize >= 32 ? 14.5 : 13,
            fontWeight: 650,
            color: color === 'white' ? '#ffffff' : '#183655',
            textAlign: 'center',
            letterSpacing: '-0.01em'
          }}
        >
          {label}
        </div>
      )}
      {subtext && (
        <div
          style={{
            marginTop: 4,
            fontSize: 12,
            color: color === 'white' ? 'rgba(255,255,255,0.7)' : '#64748b',
            textAlign: 'center'
          }}
        >
          {subtext}
        </div>
      )}
    </div>
  );
}
