import React, { useState, useEffect } from 'react';
import { useQuote } from '../../context/QuoteContext.jsx';
import Button from '../common/Button.jsx';
import api from '../../services/api.js';
import { formatMoney, CATALOG_CASKETS, isEligibleCasket } from '../../utils/quoteLogic.js';

// Canonical fallback caskets generator for instantaneous zero-delay rendering
const getInitialFallbackCaskets = (homeId, service) => {
  const fallbackList = (CATALOG_CASKETS || []).map((cat) => ({
    _id: cat.id,
    id: cat.id,
    name: cat.name,
    listPrice: cat.price,
    price: cat.price,
    imageUrl: cat.image,
    image: cat.image,
    specifications: cat.description,
    description: cat.description,
    productCode: cat.productCode,
    assignment: 'Global (*)',
    home: cat.home || 'optima'
  }));

  const eligible = fallbackList.filter((c) =>
    isEligibleCasket(c, homeId || 'optima', service || 'one_day')
  );
  return eligible.length > 0 ? eligible : fallbackList;
};

export default function ChooseCasket({ onBack, onContinue }) {
  const {
    lang,
    quote,
    selectedFuneralHome,
    selectedCasket,
    selectCasket,
    addToast
  } = useQuote();

  // Retrieve funeralHomeId from QuoteContext
  const funeralHomeId =
    selectedFuneralHome?._id ||
    selectedFuneralHome?.id ||
    quote.home ||
    quote.homeId ||
    '';

  const [caskets, setCaskets] = useState(() => getInitialFallbackCaskets(funeralHomeId, quote.service));
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState(null);
  const [localSelectedCasket, setLocalSelectedCasket] = useState(
    selectedCasket || quote.selectedCasketObject || null
  );

  // Zoom modal state
  const [zoomModalCasket, setZoomModalCasket] = useState(null);
  const [customZoom, setCustomZoom] = useState(1.2);

  // Hover states for card image zoom
  const [hoveredCardId, setHoveredCardId] = useState(null);

  // Priority sort matching the exact design reference
  const canonicalOrder = {
    'pieta — polished dark walnut': 1,
    'linsan — antique mahogany': 2,
    'linsan — medium walnut': 3,
    'glaston — medium satin': 4,
    'baron / 85 — blue': 5,
    'baron / 85 — silver': 6
  };

  useEffect(() => {
    let isMounted = true;

    async function fetchCaskets() {
      setIsSyncing(true);
      setError(null);

      // Prepare canonical fallback items
      const fallbackList = (CATALOG_CASKETS || []).map((cat) => ({
        _id: cat.id,
        id: cat.id,
        name: cat.name,
        listPrice: cat.price,
        price: cat.price,
        imageUrl: cat.image,
        image: cat.image,
        specifications: cat.description,
        description: cat.description,
        productCode: cat.productCode,
        assignment: 'Global (*)',
        home: cat.home || 'optima'
      }));

      try {
        let backendItems = [];
        if (funeralHomeId) {
          try {
            const response = await api.get(`/catalog/location/${funeralHomeId}?type=CASKET`);
            backendItems = Array.isArray(response.data) ? response.data : [];
          } catch (apiErr) {
            console.warn('[ChooseCasket] Live backend fetch error, falling back to catalog:', apiErr);
          }
        }

        // Combine backend items with canonical catalog items to guarantee complete selection
        const rawCombined = [...backendItems];
        for (const cat of fallbackList) {
          const catName = (cat.name || '').trim().toLowerCase();
          const alreadyExists = rawCombined.some(
            (item) => (item.name || '').trim().toLowerCase() === catName
          );
          if (!alreadyExists) {
            rawCombined.push(cat);
          }
        }

        // Filter eligible caskets for this home / service
        const eligible = rawCombined.filter((c) =>
          isEligibleCasket(c, funeralHomeId || quote.home, quote.service)
        );

        const listToProcess = eligible.length > 0 ? eligible : (rawCombined.length > 0 ? rawCombined : fallbackList);

        // Deduplicate and canonicalize
        const unique = [];
        const seen = new Set();
        for (const item of listToProcess) {
          const key = (item.name || '').trim().toLowerCase();
          if (key && !seen.has(key)) {
            seen.add(key);
            unique.push(item);
          }
        }

        // Sort: canonical favorites first, then by listPrice descending
        unique.sort((a, b) => {
          const wA = canonicalOrder[(a.name || '').toLowerCase()] || 999;
          const wB = canonicalOrder[(b.name || '').toLowerCase()] || 999;
          if (wA !== wB) return wA - wB;
          return (b.listPrice || b.price || 0) - (a.listPrice || a.price || 0);
        });

        if (isMounted) {
          setCaskets(unique);

          // Reconcile current selection if already in state
          if (localSelectedCasket) {
            const found = unique.find(
              c =>
                c._id === localSelectedCasket._id ||
                c.id === localSelectedCasket.id ||
                c.name === localSelectedCasket.name
            );
            if (found) {
              setLocalSelectedCasket(found);
            }
          }
        }
      } catch (err) {
        console.error('[ChooseCasket] Failed to process caskets:', err);
        if (isMounted) {
          setCaskets(fallbackList);
        }
      } finally {
        if (isMounted) {
          setIsSyncing(false);
        }
      }
    }

    fetchCaskets();

    return () => {
      isMounted = false;
    };
  }, [funeralHomeId, quote.service]);

  const handleCardClick = (casket) => {
    setLocalSelectedCasket(casket);
  };

  const handleContinue = () => {
    if (!localSelectedCasket) {
      addToast(
        lang === 'es' ? 'Por favor seleccione un ataúd para continuar.' : 'Please select a casket to continue.',
        'error'
      );
      return;
    }

    // Save the selected casket object (including its listPrice) into QuoteContext
    selectCasket(localSelectedCasket);
    onContinue();
  };

  const isContinueDisabled = !localSelectedCasket;

  return (
    <div>
      <h1 className="page-title">
        {lang === 'es' ? 'Selección de Mercancía y Ataúdes' : 'Casket & Merchandise Selection'}
      </h1>
      <p className="page-subtitle">
        {lang === 'es'
          ? 'Tarjetas ampliadas de mercancía en alta resolución con especificaciones detalladas de construcción e interiores.'
          : 'Enlarged high-resolution merchandise cards with detailed construction and interior specs.'}
      </p>

      {/* Non-blocking background sync badge */}
      {isSyncing && (
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 14px',
            backgroundColor: '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: '20px',
            color: '#1d4ed8',
            fontSize: '12px',
            fontWeight: 600,
            marginBottom: '18px',
          }}
        >
          <div
            style={{
              width: '12px',
              height: '12px',
              border: '2px solid #93c5fd',
              borderTopColor: '#1d4ed8',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
            }}
          />
          <span>{lang === 'es' ? 'Sincronizando inventario de ataúdes en vivo...' : 'Syncing live casket catalog...'}</span>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div
          style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '10px',
            padding: '16px 20px',
            color: '#991b1b',
            marginBottom: '24px',
            fontSize: '14px'
          }}
        >
          {error}
        </div>
      )}

      {/* Empty State */}
      {caskets.length === 0 && !error && !isSyncing && (
        <div style={{ textAlign: 'center', padding: '50px 20px', color: '#64748b' }}>
          <p style={{ fontSize: '15px' }}>
            {lang === 'es'
              ? 'No hay ataúdes disponibles para esta ubicación.'
              : 'No merchandise or caskets available for the selected location.'}
          </p>
        </div>
      )}

      {/* Caskets Grid (3 Columns on Desktop, Responsive, rendered immediately) */}
      {caskets.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '20px',
            marginBottom: '36px'
          }}
          className="casket-cards-grid"
        >
          {caskets.map((casket) => {
            const casketKey = casket._id || casket.id || casket.productCode || casket.name;
            const isSelected =
              localSelectedCasket &&
              (localSelectedCasket._id === casket._id ||
                localSelectedCasket.id === casket.id ||
                localSelectedCasket.name === casket.name);

            const isHovered = hoveredCardId === casketKey;
            const imageUrl = casket.imageUrl || casket.image || '';

            // Split specifications by commas or semicolons
            const specsList = (casket.specifications || casket.description || '')
              .split(/[;,]/)
              .map(s => s.trim())
              .filter(Boolean);

            const codeText =
              casket.productCode ||
              casket.code ||
              (casket._id ? casket._id.slice(-8) : '71006846');

            const priceVal = casket.listPrice ?? casket.price ?? 0;

            return (
              <div
                key={casketKey}
                onClick={() => handleCardClick(casket)}
                onMouseEnter={() => setHoveredCardId(casketKey)}
                onMouseLeave={() => setHoveredCardId(null)}
                style={{
                  backgroundColor: isSelected ? '#f5f9fc' : '#ffffff',
                  border: isSelected ? '2px solid #183655' : '1.5px solid #e2e8f0',
                  borderRadius: '16px',
                  padding: '16px 18px 18px',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  position: 'relative',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                  boxShadow: isSelected
                    ? '0 6px 18px rgba(24, 54, 85, 0.12)'
                    : isHovered
                      ? '0 6px 16px rgba(0, 0, 0, 0.08)'
                      : '0 2px 6px rgba(0, 0, 0, 0.03)',
                  transform: isHovered && !isSelected ? 'translateY(-2px)' : 'none'
                }}
              >
                {/* Active Selection Badge */}
                {isSelected && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '12px',
                      right: '12px',
                      width: '22px',
                      height: '22px',
                      borderRadius: '50%',
                      backgroundColor: '#183655',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: 800,
                      zIndex: 2,
                      boxShadow: '0 2px 5px rgba(24, 54, 85, 0.3)'
                    }}
                  >
                    ✓
                  </div>
                )}

                {/* Top Section: Image & Details */}
                <div>
                  {/* Casket Image Frame */}
                  <div
                    style={{
                      width: '100%',
                      height: '190px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: '#ffffff',
                      borderRadius: '10px',
                      overflow: 'hidden',
                      marginBottom: '14px',
                      position: 'relative',
                      border: '1px solid #f1f5f9'
                    }}
                  >
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={casket.name}
                        loading="lazy"
                        style={{
                          maxHeight: '100%',
                          maxWidth: '100%',
                          objectFit: 'contain',
                          transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                          transform: isHovered ? 'scale(1.08)' : 'scale(1)'
                        }}
                      />
                    ) : (
                      <span style={{ color: '#94a3b8', fontSize: '13px', fontStyle: 'italic' }}>
                        No photo available
                      </span>
                    )}
                  </div>

                  {/* Casket Item Name */}
                  <div
                    style={{
                      fontSize: '16px',
                      fontWeight: 700,
                      color: '#183655',
                      lineHeight: 1.35,
                      marginBottom: '8px'
                    }}
                  >
                    {casket.name}
                  </div>

                  {/* Specifications as bullet points */}
                  <div style={{ marginBottom: '8px' }}>
                    {specsList.length > 0 ? (
                      <ul
                        style={{
                          margin: 0,
                          paddingLeft: '16px',
                          color: '#556579',
                          fontSize: '13px',
                          lineHeight: '1.5'
                        }}
                      >
                        {specsList.map((spec, sIdx) => (
                          <li key={sIdx} style={{ marginTop: '2px' }}>
                            {spec}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div style={{ fontSize: '13px', color: '#64748b', fontStyle: 'italic' }}>
                        Standard premium construction
                      </div>
                    )}
                  </div>

                  {/* Placeholder Item Code */}
                  <div
                    style={{
                      fontSize: '12px',
                      color: '#94a3b8',
                      marginBottom: '14px',
                      fontWeight: 500
                    }}
                  >
                    Code: {codeText}
                  </div>
                </div>

                {/* Bottom Section: Price, Guaranteed Badge, & Zoom Button */}
                <div>
                  {/* Price Row with GUARANTEED badge */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      marginBottom: '12px'
                    }}
                  >
                    <span
                      style={{
                        fontSize: '20px',
                        fontWeight: 800,
                        color: '#183655'
                      }}
                    >
                      {formatMoney(priceVal)}
                    </span>

                    <span
                      style={{
                        backgroundColor: '#eafbf1',
                        color: '#15803d',
                        fontWeight: 750,
                        fontSize: '10.5px',
                        letterSpacing: '0.6px',
                        padding: '3px 8px',
                        borderRadius: '5px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        border: '1px solid #bbf7d0',
                        textTransform: 'uppercase'
                      }}
                    >
                      {lang === 'es' ? 'GARANTIZADO' : 'GUARANTEED'}
                    </span>
                  </div>

                  {/* Zoom & Inspect Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setZoomModalCasket(casket);
                      setCustomZoom(1.2);
                    }}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      backgroundColor: '#f1f5f9',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      color: '#1e3a5f',
                      fontSize: '13px',
                      fontWeight: 650,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.backgroundColor = '#e2e8f0';
                      e.currentTarget.style.borderColor = '#94a3b8';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.backgroundColor = '#f1f5f9';
                      e.currentTarget.style.borderColor = '#cbd5e1';
                    }}
                  >
                    🔍 {lang === 'es' ? 'Ver en Detalle' : 'Zoom & Inspect'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Navigation Buttons Row */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '32px',
          paddingTop: '20px',
          borderTop: '1px solid #e2e8f0'
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
            color: '#253851'
          }}
        >
          ← {lang === 'es' ? 'Atrás' : 'Back'}
        </Button>

        <Button
          variant="primary"
          size="lg"
          onClick={handleContinue}
          disabled={isContinueDisabled}
          style={{
            backgroundColor: '#183655',
            borderColor: '#183655',
            padding: '12px 32px',
            fontSize: '15px',
            fontWeight: 700,
            borderRadius: '10px',
            opacity: isContinueDisabled ? 0.45 : 1,
            cursor: isContinueDisabled ? 'not-allowed' : 'pointer'
          }}
        >
          {lang === 'es' ? 'Continuar →' : 'Continue →'}
        </Button>
      </div>

      {/* Casket Zoom Inspection Modal Dialog */}
      {zoomModalCasket && (
        <div
          className="modal-backdrop"
          onClick={() => setZoomModalCasket(null)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px'
          }}
        >
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '16px',
              padding: '24px 28px',
              maxWidth: '640px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
              position: 'relative'
            }}
          >
            {/* Modal Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '18px'
              }}
            >
              <h3
                style={{
                  margin: 0,
                  color: '#183655',
                  fontSize: '19px',
                  fontWeight: 700
                }}
              >
                {zoomModalCasket.name}
              </h3>
              <button
                type="button"
                onClick={() => setZoomModalCasket(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  lineHeight: 1,
                  color: '#64748b',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                ✕
              </button>
            </div>

            {/* Enlarged Casket Image Area */}
            <div
              style={{
                height: '320px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#ffffff',
                border: '1.5px solid #e2e8f0',
                borderRadius: '12px',
                overflow: 'hidden'
              }}
            >
              <img
                src={zoomModalCasket.imageUrl || zoomModalCasket.image}
                alt={zoomModalCasket.name}
                style={{
                  transform: `scale(${customZoom})`,
                  transition: 'transform 0.15s ease',
                  maxHeight: '100%',
                  maxWidth: '100%',
                  objectFit: 'contain'
                }}
              />
            </div>

            {/* Zoom Slider Control */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                marginTop: '18px'
              }}
            >
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>
                Zoom:
              </span>
              <input
                type="range"
                min="0.8"
                max="2.5"
                step="0.1"
                value={customZoom}
                onChange={(e) => setCustomZoom(Number(e.target.value))}
                style={{ flex: 1, accentColor: '#183655', cursor: 'pointer' }}
              />
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: 700,
                  color: '#183655',
                  width: '45px',
                  textAlign: 'right'
                }}
              >
                {Math.round(customZoom * 100)}%
              </span>
            </div>

            {/* Specifications Description */}
            <div
              style={{
                marginTop: '16px',
                fontSize: '13.5px',
                color: '#475569',
                lineHeight: 1.5,
                background: '#f8fafc',
                padding: '12px 14px',
                borderRadius: '8px'
              }}
            >
              <strong style={{ color: '#183655' }}>
                {lang === 'es' ? 'Especificaciones:' : 'Specifications:'}
              </strong>{' '}
              {zoomModalCasket.specifications || zoomModalCasket.description}
            </div>

            {/* Modal Actions */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '12px',
                marginTop: '22px'
              }}
            >
              <Button
                variant="secondary"
                onClick={() => setZoomModalCasket(null)}
                style={{
                  padding: '9px 20px',
                  fontSize: '14px',
                  borderRadius: '8px',
                  backgroundColor: '#ffffff',
                  color: '#334155',
                  borderColor: '#cbd5e1'
                }}
              >
                {lang === 'es' ? 'Cerrar' : 'Close'}
              </Button>

              <Button
                variant="primary"
                onClick={() => {
                  setLocalSelectedCasket(zoomModalCasket);
                  selectCasket(zoomModalCasket);
                  setZoomModalCasket(null);
                  addToast(
                    lang === 'es' ? 'Ataúd seleccionado.' : 'Casket selected.',
                    'success'
                  );
                }}
                style={{
                  padding: '9px 24px',
                  fontSize: '14px',
                  fontWeight: 700,
                  borderRadius: '8px',
                  backgroundColor: '#183655',
                  borderColor: '#183655'
                }}
              >
                {lang === 'es' ? 'Seleccionar este Ataúd' : 'Select this Casket'} (
                {formatMoney(zoomModalCasket.listPrice ?? zoomModalCasket.price ?? 0)})
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
