import React, { useState, useEffect } from 'react';
import { useQuote } from '../../context/QuoteContext.jsx';
import Button from '../common/Button.jsx';
import api from '../../services/api.js';

export default function SelectService({ onBack, onContinue }) {
  const {
    lang,
    quote,
    selectedFuneralHome,
    selectedService,
    selectService,
    addToast
  } = useQuote();

  const [services, setServices] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [localSelectedService, setLocalSelectedService] = useState(
    selectedService || quote.selectedServiceObject || null
  );

  // Retrieve funeralHomeId from QuoteContext (saved in Step 1)
  const funeralHomeId =
    selectedFuneralHome?._id ||
    selectedFuneralHome?.id ||
    quote.home ||
    quote.homeId ||
    '';

  // Desired display order for canonical service presentation
  const orderWeights = {
    'two-day service': 1,
    'one-day service funeral': 2,
    'traditional cremation': 3,
    'memorial cremation': 4,
    'direct cremation': 5,
    'ship out with funeral': 6,
    'direct ship out': 7
  };

  const CANONICAL_SERVICES_FALLBACK = [
    { _id: 'two_day', name: 'Two-day service', category: 'Traditional', specifications: 'Traditional 2-day viewing & chapel service', section1Price: 3800, section2Price: 1200 },
    { _id: 'one_day', name: 'One-day service funeral', category: 'Traditional', specifications: 'Same-day viewing & funeral service', section1Price: 3395, section2Price: 0 },
    { _id: 'traditional_cremation', name: 'Traditional cremation', category: 'Cremation', specifications: 'Full viewing & funeral ceremony prior to cremation', section1Price: 3760, section2Price: 1295 },
    { _id: 'memorial_cremation', name: 'Memorial cremation', category: 'Cremation', specifications: 'Cremation with subsequent chapel memorial ceremony', section1Price: 2620, section2Price: 675 },
    { _id: 'direct_cremation', name: 'Direct cremation', category: 'Cremation', specifications: 'Direct disposition without viewing or ceremony', section1Price: 2130, section2Price: 175 },
    { _id: 'ship_traditional', name: 'Ship out with funeral', category: 'Ship Out', specifications: 'Preparation & service prior to domestic/international transit', section1Price: 3355, section2Price: 0 },
    { _id: 'ship_direct', name: 'Direct ship out', category: 'Ship Out', specifications: 'Direct transfer to airport for forwarding', section1Price: 2065, section2Price: 0 },
  ];

  useEffect(() => {
    let isMounted = true;

    async function fetchServices() {
      const targetHomeId = funeralHomeId || 'optima';

      setIsLoading(true);
      setError(null);
      try {
        const response = await api.get(`/catalog/location/${targetHomeId}?type=SERVICE`);
        const data = response.data || [];

        // Deduplicate services by name
        const unique = [];
        const seen = new Set();
        for (const item of data) {
          const key = (item.name || '').trim().toLowerCase();
          if (!seen.has(key)) {
            seen.add(key);
            unique.push(item);
          }
        }

        // Sort by canonical presentation order
        unique.sort((a, b) => {
          const wA = orderWeights[(a.name || '').toLowerCase()] || 99;
          const wB = orderWeights[(b.name || '').toLowerCase()] || 99;
          return wA - wB;
        });

        const finalServices = unique.length > 0 ? unique : CANONICAL_SERVICES_FALLBACK;

        if (isMounted) {
          setServices(finalServices);
          // If already selected, reconcile with fetched object
          if (localSelectedService) {
            const found = finalServices.find(
              s => (s._id === localSelectedService._id || s.name === localSelectedService.name)
            );
            if (found) {
              setLocalSelectedService(found);
            }
          }
        }
      } catch (err) {
        console.warn('[SelectService] Live fetch failed, using canonical fallback:', err);
        if (isMounted) {
          setServices(CANONICAL_SERVICES_FALLBACK);
          setError(null);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchServices();

    return () => {
      isMounted = false;
    };
  }, [funeralHomeId]);

  const handleCardClick = (service) => {
    setLocalSelectedService(service);
  };

  const handleContinue = () => {
    if (!localSelectedService) {
      addToast(
        lang === 'es' ? 'Por favor seleccione un servicio funerario.' : 'Please select a funeral service to continue.',
        'error'
      );
      return;
    }

    // Save entire selected service object (including section1Price and section2Price) into QuoteContext
    selectService(localSelectedService);
    onContinue();
  };

  const isContinueDisabled = !localSelectedService;

  return (
    <div>
      <h1 className="page-title">
        {lang === 'es' ? 'Seleccione el Servicio Funerario' : 'Select Funeral Service'}
      </h1>
      <p className="page-subtitle">
        {lang === 'es'
          ? 'Elija entre servicios tradicionales, cremación o traslados nacionales e internacionales.'
          : 'Choose from traditional burial, viewing, cremation, or shipping services.'}
      </p>

      {/* Loading Indicator */}
      {isLoading && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
          <div
            style={{
              width: '34px',
              height: '34px',
              border: '3px solid #e2e8f0',
              borderTopColor: '#183655',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 16px',
            }}
          />
          <span style={{ fontSize: '14.5px', fontWeight: 600 }}>
            {lang === 'es' ? 'Cargando servicios disponibles...' : 'Loading available funeral services...'}
          </span>
        </div>
      )}

      {/* Error State */}
      {!isLoading && error && (
        <div
          style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '10px',
            padding: '16px 20px',
            color: '#991b1b',
            marginBottom: '24px',
            fontSize: '14px',
          }}
        >
          {error}
        </div>
      )}

      {/* Services Grid (Matches screenshot 2-column layout) */}
      {!isLoading && services.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: '14px',
            marginBottom: '36px',
          }}
          className="choices-grid"
        >
          {services.map((svc) => {
            const isSelected =
              localSelectedService &&
              (localSelectedService._id === svc._id ||
                localSelectedService.id === svc.id ||
                localSelectedService.name === svc.name);

            const subtitleText =
              svc.specifications || svc.category || 'Traditional visitation & funeral service';

            return (
              <div
                key={svc._id || svc.id || svc.name}
                onClick={() => handleCardClick(svc)}
                style={{
                  backgroundColor: isSelected ? '#f1f6fb' : '#ffffff',
                  border: isSelected ? '2px solid #183655' : '1.5px solid #e0e6ed',
                  borderRadius: '12px',
                  padding: '20px 22px',
                  cursor: 'pointer',
                  transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                  boxShadow: isSelected
                    ? '0 4px 14px rgba(24, 54, 85, 0.12)'
                    : '0 2px 5px rgba(24, 54, 85, 0.03)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  minHeight: '78px',
                  textAlign: 'left',
                  position: 'relative',
                }}
                onMouseOver={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.borderColor = '#92a8c3';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 3px 8px rgba(24, 54, 85, 0.06)';
                  }
                }}
                onMouseOut={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.borderColor = '#e0e6ed';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 2px 5px rgba(24, 54, 85, 0.03)';
                  }
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <strong
                    style={{
                      fontSize: '15.5px',
                      fontWeight: 700,
                      color: '#183655',
                      lineHeight: 1.3,
                    }}
                  >
                    {svc.name}
                  </strong>

                  {isSelected && (
                    <span
                      style={{
                        width: '18px',
                        height: '18px',
                        borderRadius: '50%',
                        backgroundColor: '#183655',
                        color: '#ffffff',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '11px',
                        fontWeight: 800,
                        flexShrink: 0,
                      }}
                    >
                      ✓
                    </span>
                  )}
                </div>

                <span
                  style={{
                    fontSize: '13px',
                    color: '#67788e',
                    marginTop: '5px',
                    lineHeight: 1.4,
                  }}
                >
                  {subtitleText}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && services.length === 0 && !error && (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
          <p>No funeral services available for the selected location.</p>
        </div>
      )}

      {/* Navigation Buttons Row (Back on left, Continue on right) */}
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
            cursor: isContinueDisabled ? 'not-allowed' : 'pointer',
          }}
        >
          Continue →
        </Button>
      </div>
    </div>
  );
}
