import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuote } from '../../context/QuoteContext.jsx';
import Button from '../common/Button.jsx';
import ShimmerImage from '../common/ShimmerImage.jsx';

export default function ConfirmHome({ onBack, onContinue }) {
  const { t } = useTranslation();
  const {
    lang,
    selectedFuneralHome,
    quote,
    calculation,
    selectedChapel,
    selectChapel,
    addToast
  } = useQuote();

  const [validationError, setValidationError] = useState('');

  const home = selectedFuneralHome || calculation?.homeObj || quote?.selectedHomeObj || null;

  if (!home) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
        <p>{lang === 'es' ? 'No se ha seleccionado una funeraria. Regrese al Paso 1.' : 'No funeral home selected. Please return to Step 1.'}</p>
        <Button variant="secondary" onClick={onBack}>
          ← {t('common.back', 'Back to Search')}
        </Button>
      </div>
    );
  }

  const rawChapels = home.chapels || home.locations || [];
  const availableChapels = rawChapels.length > 0
    ? rawChapels.map((ch, idx) => ({
        id: ch._id || ch.id || `chapel-${idx}`,
        name: ch.name || `${ch.city || 'Branch'} Chapel${ch.zip ? ` (${ch.zip})` : ''}`,
        city: ch.city || home.city || '',
        zip: ch.zip || '',
        surcharge: Number(ch.surcharge) || 0
      }))
    : [
        {
          id: 'main-chapel',
          name: `${home.name} - Main Facility Chapel`,
          city: home.city || '',
          zip: home.zipCode || home.zip || '',
          surcharge: 0
        }
      ];

  const currentSelectedChapel = selectedChapel || quote?.selectedChapel || null;

  const isChapelSelected = (ch) => {
    if (!currentSelectedChapel) return false;
    if (currentSelectedChapel.id && ch.id && currentSelectedChapel.id === ch.id) return true;
    if (currentSelectedChapel.name && ch.name && currentSelectedChapel.name === ch.name) return true;
    return (
      currentSelectedChapel.city === ch.city &&
      (currentSelectedChapel.zip || '') === (ch.zip || '') &&
      (Number(currentSelectedChapel.surcharge) || 0) === (Number(ch.surcharge) || 0)
    );
  };

  const handleChapelSelect = (ch) => {
    setValidationError('');
    selectChapel(ch);
  };

  const handleContinue = () => {
    if (!currentSelectedChapel) {
      const msg = lang === 'es'
        ? 'Por favor seleccione una capilla antes de continuar.'
        : 'Please select a chapel before proceeding.';
      setValidationError(msg);
      if (addToast) addToast(msg, 'error');
      return;
    }
    setValidationError('');
    if (onContinue) {
      onContinue();
    }
  };

  const locationsCount = rawChapels.length > 0 ? rawChapels.length : 1;
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
            <ShimmerImage
              src={imageUrl}
              alt={home.name}
              width="100%"
              height="100%"
              objectFit="cover"
              fallbackSrc="https://images.unsplash.com/photo-1541829070764-84a7d30dd3f3?auto=format&fit=crop&w=800&q=80"
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
              {locationsCount} {lang === 'es' ? (locationsCount === 1 ? 'ubicación' : 'ubicaciones') : (locationsCount === 1 ? 'location' : 'locations')}
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

        {/* Associated Chapels & Service Branches - Selectable Radio Group */}
        <div style={{ marginTop: '24px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '12px',
            }}
          >
            <div
              style={{
                fontSize: '13px',
                fontWeight: 700,
                color: '#1e293b',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>{lang === 'es' ? 'Seleccionar Capilla / Sucursal de Servicio:' : 'Select Chapel / Service Branch:'}</span>
              <span style={{ color: '#dc2626', fontSize: '14px' }}>*</span>
            </div>
            {currentSelectedChapel && (
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#16a34a',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                ✓ {lang === 'es' ? 'Capilla seleccionada' : 'Chapel selected'}
              </span>
            )}
          </div>

          <div
            role="radiogroup"
            aria-label="Associated Chapels"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: '12px',
            }}
          >
            {availableChapels.map((chapel, idx) => {
              const selected = isChapelSelected(chapel);
              return (
                <label
                  key={chapel.id || idx}
                  onClick={() => handleChapelSelect(chapel)}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    padding: '14px 16px',
                    backgroundColor: selected ? '#f0fdf4' : '#ffffff',
                    border: selected ? '2px solid #16a34a' : '1px solid #cbd5e1',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease-in-out',
                    boxShadow: selected ? '0 2px 8px rgba(22, 163, 74, 0.15)' : '0 1px 3px rgba(0,0,0,0.02)',
                  }}
                >
                  <input
                    type="radio"
                    name="selectedChapelGroup"
                    checked={selected}
                    onChange={() => handleChapelSelect(chapel)}
                    style={{
                      marginTop: '3px',
                      cursor: 'pointer',
                      width: '18px',
                      height: '18px',
                      accentColor: '#16a34a',
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: '14px',
                        fontWeight: 700,
                        color: selected ? '#14532d' : '#1e293b',
                        marginBottom: '3px',
                        lineHeight: 1.3,
                      }}
                    >
                      {chapel.name}
                    </div>
                    {(chapel.city || chapel.zip) && (
                      <div
                        style={{
                          fontSize: '12px',
                          color: '#64748b',
                          marginBottom: '6px',
                        }}
                      >
                        📍 {chapel.city} {chapel.zip ? `(${chapel.zip})` : ''}
                      </div>
                    )}
                    <div>
                      {chapel.surcharge > 0 ? (
                        <span
                          style={{
                            display: 'inline-block',
                            backgroundColor: '#fef2f2',
                            color: '#b91c1c',
                            border: '1px solid #fecaca',
                            borderRadius: '6px',
                            padding: '2px 8px',
                            fontSize: '11.5px',
                            fontWeight: 700,
                          }}
                        >
                          +${chapel.surcharge.toLocaleString()} {lang === 'es' ? 'Recargo' : 'Surcharge'}
                        </span>
                      ) : (
                        <span
                          style={{
                            display: 'inline-block',
                            backgroundColor: '#f1f5f9',
                            color: '#475569',
                            border: '1px solid #e2e8f0',
                            borderRadius: '6px',
                            padding: '2px 8px',
                            fontSize: '11.5px',
                            fontWeight: 600,
                          }}
                        >
                          {lang === 'es' ? 'Sin recargo adicional' : 'Standard Location ($0 Surcharge)'}
                        </span>
                      )}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>

          {validationError && (
            <div
              style={{
                marginTop: '12px',
                padding: '10px 14px',
                backgroundColor: '#fef2f2',
                border: '1px solid #fca5a5',
                borderRadius: '8px',
                color: '#b91c1c',
                fontSize: '13px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span>⚠️</span>
              <span>{validationError}</span>
            </div>
          )}
        </div>
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
          ← {t('common.back', 'Back')}
        </Button>

        <Button
          variant="primary"
          size="lg"
          onClick={handleContinue}
          disabled={!currentSelectedChapel}
          style={{
            backgroundColor: currentSelectedChapel ? '#183655' : '#94a3b8',
            borderColor: currentSelectedChapel ? '#183655' : '#94a3b8',
            cursor: currentSelectedChapel ? 'pointer' : 'not-allowed',
            padding: '12px 32px',
            fontSize: '15px',
            fontWeight: 700,
            borderRadius: '10px',
          }}
        >
          {t('common.continue', 'Continue →')}
        </Button>
      </div>
    </div>
  );
}
