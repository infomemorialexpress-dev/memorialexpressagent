import React, { useState } from 'react';
import { formatMoney } from '../../utils/quoteLogic.js';
import ShimmerImage from '../common/ShimmerImage.jsx';

export default function MerchandiseCard({
  casket,
  isSelected,
  onSelect,
  onZoomInspect,
  lang = 'en'
}) {
  const [isHovered, setIsHovered] = useState(false);

  // Parse description parts (construction, finish, interior)
  const descParts = (casket.description || '')
    .split(';')
    .map(p => p.trim())
    .filter(Boolean);

  return (
    <div
      className={`merchandise-card ${isSelected ? 'selected' : ''}`}
      onClick={() => onSelect(casket.id)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="casket-img-frame">
        <ShimmerImage
          src={casket.image}
          alt={casket.name}
          width="100%"
          height="100%"
          objectFit="contain"
          imgStyle={{
            transform: isHovered ? 'scale(1.12)' : 'scale(1.02)',
            transition: 'transform 0.25s ease'
          }}
          fallbackText="No photo available"
        />
      </div>

      <div className="merchandise-info">
        <div className="merchandise-title">{casket.name}</div>
        <div className="merchandise-desc">
          {descParts.map((part, idx) => (
            <div key={idx} style={{ marginTop: 2 }}>
              • {part}
            </div>
          ))}
          {casket.productCode && (
            <div style={{ color: '#94a3b8', fontSize: 11, marginTop: 4 }}>
              Code: {casket.productCode}
            </div>
          )}
        </div>

        <div className="merchandise-price-row">
          <div className="merchandise-price">{formatMoney(casket.price)}</div>
          <span className="merchandise-badge badge-guaranteed">
            {lang === 'es' ? 'Garantizado' : 'Guaranteed'}
          </span>
        </div>
      </div>

      {onZoomInspect && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onZoomInspect(casket);
          }}
          className="btn btn-secondary btn-sm"
          style={{ marginTop: 10, width: '100%', fontSize: 12 }}
        >
          🔍 {lang === 'es' ? 'Ver en Detalle' : 'Zoom & Inspect'}
        </button>
      )}
    </div>
  );
}
