import React from 'react';
import { useQuote } from '../../context/QuoteContext.jsx';
import Button from '../common/Button.jsx';

export default function ConfirmHome({ onBack, onContinue }) {
  const { lang, selectedFuneralHome, quote, calculation } = useQuote();

  const home = selectedFuneralHome || calculation?.homeObj || quote?.selectedHomeObj || null;

  if (!home) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
        <p>No funeral home selected. Please return to Step 1.</p>
        <Button variant="secondary" onClick={onBack}>
          ← Back to Search
        </Button>
      </div>
    );
  }

  const chapels = home.chapels || home.locations || [];
  const locationsCount = chapels.length > 0 ? chapels.length : 1;
  const taxRate = home.tax !== undefined ? home.tax : 0;

  const imageUrl =
    home.imageUrl ||
    home.image ||
    'https://images.unsplash.com/photo-1541829070764-84a7d30dd3f3?auto=format&fit=crop&w=800&q=80';

  const addressText = [
    home.streetAddress || home.address,
    home.city,
    home.county ? `${home.county} County` : '',
    home.zipCode || home.zip
  ]
    .filter(Boolean)
    .join(', ');

  const shortAddress = `${home.city || 'Los Angeles'}, ${home.county || 'Los Angeles'} ${home.zipCode || home.zip || '90011'}`;

  return (
    <div>
      <h1 className="page-title">
        {lang === 'es' ? 'Confirmar Funeraria' : 'Confirm Funeral Home'}
      </h1>
      <p className="page-subtitle">
        {lang === 'es'
          ? 'Revise la funeraria seleccionada y la información de la sucursal de servicio.'
          : 'Review the selected funeral home and service branch information.'}
      </p>

      {/* Main Confirmation Card (matches user screenshot design) */}
      <div
        style={{
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          padding: 'clamp(20px, 3vw, 28px)',
          marginBottom: '32px',
          boxShadow: '0 2px 8px rgba(24, 54, 85, 0.04)',
        }}
      >
        {/* Funeral Home Image & Name Header */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
            marginBottom: '22px',
          }}
        >
          {/* Funeral Home Photo (as requested: "iss mai images v hai ju data show hu rha so in ki images v show krni hai") */}
          <div
            style={{
              width: '100%',
              height: '180px',
              borderRadius: '12px',
              overflow: 'hidden',
              backgroundColor: '#e2e8f0',
              border: '1px solid #dbe2ea',
              position: 'relative',
              boxShadow: '0 4px 12px rgba(24, 54, 85, 0.08)',
            }}
          >
            <img
              src={imageUrl}
              alt={home.name}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
              }}
              onError={(e) => {
                e.currentTarget.src =
                  'https://images.unsplash.com/photo-1541829070764-84a7d30dd3f3?auto=format&fit=crop&w=800&q=80';
              }}
            />
            {home.program && (
              <div
                style={{
                  position: 'absolute',
                  top: '12px',
                  right: '12px',
                  backgroundColor: '#16803b',
                  color: '#ffffff',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
                }}
              >
                • {home.program} Program
              </div>
            )}
          </div>

          <div>
            <h2
              style={{
                margin: '0 0 8px 0',
                color: '#183655',
                fontSize: '24px',
                fontWeight: 750,
                letterSpacing: '-0.02em',
                lineHeight: 1.25,
              }}
            >
              {home.name}
            </h2>

            <div
              style={{
                fontSize: '14.5px',
                color: '#475569',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontWeight: 500,
              }}
            >
              <span style={{ fontSize: '16px' }}>📍</span>
              <span>{shortAddress}</span>
            </div>
          </div>
        </div>

        {/* 2 White Stat Blocks (Exact match to screenshot) */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: '16px',
            marginTop: '8px',
          }}
        >
          {/* Block 1: Locations / Chapels */}
          <div
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '16px 20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            }}
          >
            <div
              style={{
                fontSize: '11px',
                color: '#8da0b3',
                fontWeight: 750,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                marginBottom: '6px',
              }}
            >
              {lang === 'es' ? 'Ubicaciones / Capillas' : 'LOCATIONS / CHAPELS'}
            </div>
            <div
              style={{
                fontSize: '22px',
                fontWeight: 800,
                color: '#183655',
                lineHeight: 1.1,
              }}
            >
              {locationsCount} {locationsCount === 1 ? 'location' : 'locations'}
            </div>
          </div>

          {/* Block 2: Local Sales Tax */}
          <div
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '12px',
              padding: '16px 20px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
            }}
          >
            <div
              style={{
                fontSize: '11px',
                color: '#8da0b3',
                fontWeight: 750,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                marginBottom: '6px',
              }}
            >
              {lang === 'es' ? 'Impuesto Sobre Ventas Local' : 'LOCAL SALES TAX'}
            </div>
            <div
              style={{
                fontSize: '22px',
                fontWeight: 800,
                color: '#183655',
                lineHeight: 1.1,
              }}
            >
              {taxRate}%
            </div>
          </div>
        </div>

        {/* Detailed Chapels List Accordion/Display */}
        {chapels.length > 0 && (
          <div style={{ marginTop: '20px' }}>
            <div
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: '#67788e',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '10px',
              }}
            >
              Associated Chapels & Service Branches:
            </div>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              {chapels.map((chapel, idx) => (
                <span
                  key={idx}
                  style={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #dbe2ea',
                    borderRadius: '8px',
                    padding: '5px 10px',
                    fontSize: '12px',
                    color: '#253851',
                    fontWeight: 500,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <span style={{ color: '#183655', fontWeight: 700 }}>•</span>
                  {chapel.city} {chapel.zip ? `(${chapel.zip})` : ''}
                  {chapel.surcharge > 0 && (
                    <span style={{ color: '#b91c1c', fontWeight: 600, fontSize: '11px' }}>
                      +${chapel.surcharge}
                    </span>
                  )}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Navigation Buttons Row (Matches screenshot: Back on left, Continue on right) */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '28px',
          paddingTop: '20px',
          borderTop: '1px solid #e2e8f0',
        }}
      >
        <Button
          variant="secondary"
          size="lg"
          onClick={onBack}
          style={{
            padding: '12px 28px',
            fontSize: '14.5px',
            fontWeight: 650,
            borderRadius: '10px',
            backgroundColor: '#ffffff',
            borderColor: '#cbd5e1',
            color: '#253851',
          }}
        >
          ← Back
        </Button>

        <Button
          variant="primary"
          size="lg"
          onClick={onContinue}
          style={{
            backgroundColor: '#183655',
            borderColor: '#183655',
            padding: '12px 32px',
            fontSize: '15px',
            fontWeight: 700,
            borderRadius: '10px',
          }}
        >
          Continue →
        </Button>
      </div>
    </div>
  );
}
