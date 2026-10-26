import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuote } from '../../context/QuoteContext.jsx';
import Button from '../common/Button.jsx';
import api from '../../services/api.js';
import { formatMoney } from '../../utils/quoteLogic.js';
import { ServiceCardSkeleton } from '../common/SkeletonLoader.jsx';

export default function SelectService({ onBack, onContinue }) {
  const {
    lang,
    quote,
    selectedFuneralHome,
    selectedService,
    selectService,
    addToast
  } = useQuote();

  const { t } = useTranslation();

  const [services, setServices] = useState([]);
  const [isSyncing, setIsSyncing] = useState(true);
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

  useEffect(() => {
    let isMounted = true;

    async function fetchServices() {
      if (!funeralHomeId) {
        if (isMounted) {
          setServices([]);
          setIsSyncing(false);
        }
        return;
      }

      setIsSyncing(true);
      setError(null);
      try {
        const [catRes, homePkgsRes] = await Promise.allSettled([
          api.get(`/catalog/location/${funeralHomeId}?type=SERVICE`),
          api.get(`/funeral-homes/${funeralHomeId}/packages`)
        ]);

        const catData = catRes.status === 'fulfilled' && Array.isArray(catRes.value.data) ? catRes.value.data : [];
        const homePkgsData = homePkgsRes.status === 'fulfilled' && Array.isArray(homePkgsRes.value.data) ? homePkgsRes.value.data : [];

        // Combine catalog items and funeral home custom packages
        const combined = [...catData];
        for (const hp of homePkgsData) {
          const hpId = hp._id || hp.id;
          const hpName = hp.packageName || hp.name || '';
          const existingIdx = combined.findIndex(
            c => (c._id || c.id) === hpId || (c.name && c.name.toLowerCase() === hpName.toLowerCase())
          );
          if (existingIdx >= 0) {
            combined[existingIdx] = {
              ...combined[existingIdx],
              section1Price: hp.section1Price !== undefined ? Number(hp.section1Price) : combined[existingIdx].section1Price,
              section2Price: hp.section2Price !== undefined ? Number(hp.section2Price) : combined[existingIdx].section2Price,
              category: hp.category || combined[existingIdx].category,
              itemizedServices: hp.itemizedServices || combined[existingIdx].itemizedServices,
            };
          } else {
            combined.push({
              _id: hpId,
              id: hpId,
              name: hpName,
              packageName: hpName,
              category: hp.category || 'Traditional',
              section1Price: Number(hp.section1Price) || 0,
              section2Price: Number(hp.section2Price) || 0,
              isCustom: true,
            });
          }
        }

        const data = combined;

        // Deduplicate services by name
        const unique = [];
        const seen = new Set();
        for (const item of data) {
          const key = (item.name || item.packageName || '').trim().toLowerCase();
          if (!seen.has(key)) {
            seen.add(key);
            unique.push(item);
          }
        }

        // Sort: standard canonical services first by weight, then custom packages
        unique.sort((a, b) => {
          const nameA = (a.name || a.packageName || '').toLowerCase();
          const nameB = (b.name || b.packageName || '').toLowerCase();
          const wA = orderWeights[nameA] || (a.isCustom ? 100 : 50);
          const wB = orderWeights[nameB] || (b.isCustom ? 100 : 50);
          return wA - wB;
        });

        const finalServices = unique;

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
        console.warn('[SelectService] Live fetch failed:', err);
        if (isMounted) {
          setServices([]);
          setError(lang === 'es' ? 'Error al cargar los servicios desde la base de datos.' : 'Failed to load services from the database.');
        }
      } finally {
        if (isMounted) {
          setIsSyncing(false);
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
        {t('service.title', lang === 'es' ? 'Seleccione el Servicio Funerario' : 'Select Funeral Service')}
      </h1>
      <p className="page-subtitle">
        {t('service.subtitle', lang === 'es'
          ? 'Elija entre servicios tradicionales, cremación o traslados nacionales e internacionales.'
          : 'Choose from traditional burial, viewing, cremation, or shipping services.')}
      </p>

      {/* Non-blocking live background sync badge */}
      {isSyncing && services.length > 0 && (
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
            className="app-spinner"
            style={{
              width: '13px',
              height: '13px',
              borderWidth: '2px',
              borderColor: '#93c5fd',
              borderTopColor: '#1d4ed8',
            }}
          />
          <span>{lang === 'es' ? 'Sincronizando tarifas en vivo...' : 'Syncing live service pricing...'}</span>
        </div>
      )}

      {/* Loading Skeleton when no services ready yet */}
      {isSyncing && services.length === 0 && (
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px', color: '#183655', fontWeight: 650, fontSize: '13.5px' }}>
            <div className="app-spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }} />
            <span>{lang === 'es' ? 'Cargando servicios disponibles...' : 'Loading available services...'}</span>
          </div>
          <ServiceCardSkeleton count={6} />
        </div>
      )}

      {/* Error State */}
      {error && (
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

      {/* Services Grid (Matches screenshot 2-column layout, rendered immediately) */}
      {services.length > 0 && (
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

                {/* Category Badge & Total Package Rate */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    marginTop: '8px',
                    paddingTop: '6px',
                    borderTop: '1px solid #f1f5f9',
                  }}
                >
                  <span
                    style={{
                      fontSize: '11.5px',
                      fontWeight: 650,
                      padding: '2px 8px',
                      borderRadius: '5px',
                      backgroundColor: (svc.category || '').toLowerCase().includes('cremat')
                        ? '#fef3c7'
                        : (svc.category || '').toLowerCase().includes('ship')
                        ? '#f1f5f9'
                        : '#eff6ff',
                      color: (svc.category || '').toLowerCase().includes('cremat')
                        ? '#b45309'
                        : (svc.category || '').toLowerCase().includes('ship')
                        ? '#475569'
                        : '#1d4ed8',
                    }}
                  >
                    {svc.category || 'Traditional'}
                  </span>

                  {(Number(svc.section1Price) > 0 || Number(svc.section2Price) > 0) && (
                    <span
                      style={{
                        fontSize: '14.5px',
                        fontWeight: 750,
                        color: '#183655',
                      }}
                    >
                      {formatMoney((Number(svc.section1Price) || 0) + (Number(svc.section2Price) || 0))}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!isSyncing && services.length === 0 && !error && (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b' }}>
          <p>{lang === 'es' ? 'No hay servicios funerarios disponibles para la ubicación seleccionada.' : 'No funeral services available for the selected location.'}</p>
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
          ← {t('common.back', 'Back')}
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
          {t('common.continue', 'Continue →')}
        </Button>
      </div>
    </div>
  );
}
