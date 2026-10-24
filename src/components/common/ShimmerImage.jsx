import React, { useState } from 'react';

/**
 * Image component with built-in shimmer placeholder while downloading
 */
export default function ShimmerImage({
  src,
  alt = '',
  className = '',
  style = {},
  fallbackSrc = null,
  fallbackText = 'No image available',
  imgStyle = {},
  aspectRatio = null,
  height = '100%',
  width = '100%',
  objectFit = 'contain',
  ...rest
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const containerStyle = {
    position: 'relative',
    width,
    height,
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    ...(aspectRatio ? { aspectRatio } : {}),
    ...style
  };

  const handleLoad = () => {
    setIsLoaded(true);
  };

  const handleError = () => {
    if (fallbackSrc && src !== fallbackSrc) {
      setHasError(false);
    } else {
      setHasError(true);
      setIsLoaded(true);
    }
  };

  return (
    <div style={containerStyle} className={`shimmer-img-container ${className}`}>
      {/* Shimmer Placeholder while loading */}
      {!isLoaded && !hasError && (
        <div
          className="skeleton-shimmer"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            zIndex: 1
          }}
        />
      )}

      {/* Fallback Display if Error */}
      {hasError ? (
        <div
          style={{
            color: '#94a3b8',
            fontSize: '12px',
            fontStyle: 'italic',
            textAlign: 'center',
            padding: '12px'
          }}
        >
          {fallbackText}
        </div>
      ) : (
        <img
          src={src || fallbackSrc}
          alt={alt}
          onLoad={handleLoad}
          onError={handleError}
          style={{
            width: '100%',
            height: '100%',
            objectFit,
            opacity: isLoaded ? 1 : 0,
            transition: 'opacity 0.25s ease-in-out',
            ...imgStyle
          }}
          {...rest}
        />
      )}
    </div>
  );
}
