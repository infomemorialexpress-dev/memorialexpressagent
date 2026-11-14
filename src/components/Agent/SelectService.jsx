import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuote } from '../../context/QuoteContext.jsx';
import Button from '../common/Button.jsx';
import api from '../../services/api.js';
import { formatMoney, getLocalizedText, isCasketNeeded } from '../../utils/quoteLogic.js';
import { ServiceCardSkeleton } from '../common/SkeletonLoader.jsx';

export default function SelectService({ onBack, onContinue }) {
  const {
    lang,
    quote,
    selectedFuneralHome,
    selectedService,
    selectService,
    selectCasket,
    addToast
  } = useQuote();

  const { t } = useTranslation();

  const [services, setServices] = useState([]);
  const [isSyncing, setIsSyncing] = useState(true);
  const [error, setError] = useState(null);
  const [localSelectedService, setLocalSelectedService] = useState(() => {
    const sel = selectedService || quote.selectedServiceObject;
    if (sel && typeof sel === 'object' && (sel._id || sel.id || sel.name)) {
      return sel;
    }
    return null;
  });

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
              packageName_es: hp.packageName_es || hp.name_es || combined[existingIdx].packageName_es || '',
              name_es: hp.packageName_es || hp.name_es || combined[existingIdx].name_es || '',
              category_es: hp.category_es || combined[existingIdx].category_es || '',
              section1Price: hp.section1Price !== undefined ? Number(hp.section1Price) : combined[existingIdx].section1Price,
              section2Price: hp.section2Price !== undefined ? Number(hp.section2Price) : combined[existingIdx].section2Price,
              category: hp.category || combined[existingIdx].category,
              itemizedServices: hp.itemizedServices || combined[existingIdx].itemizedServices,
              visitationHours: (hp.visitationHours !== undefined && hp.visitationHours !== null && hp.visitationHours !== '' && !isNaN(Number(hp.visitationHours))) ? Number(hp.visitationHours) : (combined[existingIdx].visitationHours !== undefined ? Number(combined[existingIdx].visitationHours) : 0),
              funeralServiceHours: (hp.funeralServiceHours !== undefined && hp.funeralServiceHours !== null && hp.funeralServiceHours !== '' && !isNaN(Number(hp.funeralServiceHours))) ? Number(hp.funeralServiceHours) : (combined[existingIdx].funeralServiceHours !== undefined ? Number(combined[existingIdx].funeralServiceHours) : 0),
              transferMiles: (hp.transferMiles !== undefined && hp.transferMiles !== null && hp.transferMiles !== '' && !isNaN(Number(hp.transferMiles))) ? Number(hp.transferMiles) : (combined[existingIdx].transferMiles !== undefined ? Number(combined[existingIdx].transferMiles) : 25),
              displayOrder: hp.displayOrder !== undefined ? Number(hp.displayOrder) : (combined[existingIdx].displayOrder !== undefined ? Number(combined[existingIdx].displayOrder) : 0),
            };
          } else {
            combined.push({
              _id: hpId,
              id: hpId,
              name: hpName,
              packageName: hpName,
              packageName_es: hp.packageName_es || hp.name_es || '',
              name_es: hp.packageName_es || hp.name_es || '',
              category: hp.category || 'Traditional',
              category_es: hp.category_es || '',
              section1Price: Number(hp.section1Price) || 0,
              section2Price: Number(hp.section2Price) || 0,
              itemizedServices: hp.itemizedServices || null,
              visitationHours: (hp.visitationHours !== undefined && hp.visitationHours !== null && hp.visitationHours !== '' && !isNaN(Number(hp.visitationHours))) ? Number(hp.visitationHours) : 0,
              funeralServiceHours: (hp.funeralServiceHours !== undefined && hp.funeralServiceHours !== null && hp.funeralServiceHours !== '' && !isNaN(Number(hp.funeralServiceHours))) ? Number(hp.funeralServiceHours) : 0,
              transferMiles: (hp.transferMiles !== undefined && hp.transferMiles !== null && hp.transferMiles !== '' && !isNaN(Number(hp.transferMiles))) ? Number(hp.transferMiles) : 25,
              displayOrder: hp.displayOrder !== undefined ? Number(hp.displayOrder) : 0,
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

        // Sort: by custom displayOrder ascending, fallback to standard canonical service weights
        unique.sort((a, b) => {
          const orderA = a.displayOrder !== undefined && a.displayOrder !== null ? Number(a.displayOrder) : 0;
          const orderB = b.displayOrder !== undefined && b.displayOrder !== null ? Number(b.displayOrder) : 0;
          if (orderA !== orderB) {
            return orderA - orderB;
          }
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
            const found = finalServices.find(s =>
              (localSelectedService._id && s._id && s._id === localSelectedService._id) ||
              (localSelectedService.id && s.id && s.id === localSelectedService.id) ||
              (localSelectedService.name && s.name && s.name.trim().toLowerCase() === localSelectedService.name.trim().toLowerCase())
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
    // Immediately clear selected casket when selecting or switching packages
    selectCasket?.(null);
  };

  // Watch selected package changes and automatically reset selectedCasket in global state
  useEffect(() => {
    if (localSelectedService) {
      selectCasket?.(null);
    }
  }, [localSelectedService?._id, localSelectedService?.id, localSelectedService?.name, selectCasket]);

  const handleContinue = () => {
    if (!localSelectedService) {
      addToast(
        lang === 'es' ? 'Por favor seleccione un servicio funerario.' : 'Please select a funeral service to continue.',
        'error'
      );
      return;
    }

    // Save entire selected service object into QuoteContext and ensure casket is reset
    selectService(localSelectedService);
    selectCasket?.(null);
    if (onContinue) {
      onContinue(localSelectedService);
    }
  };

  const isContinueDisabled = !localSelectedService;
  const isEs = lang === 'es';
  const selectedLocationName =
    selectedFuneralHome?.name ||
    quote?.homeName ||
    quote?.selectedHomeObj?.name ||
    '';

  return (
    <div>
      {/* Prominent Active Funeral Home Header */}
      {selectedLocationName && (
        <div
          className="currently-quoting-banner"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '10px',
            backgroundColor: '#eff6ff',
            border: '1.5px solid #93c5fd',
            borderRadius: '10px',
            padding: '8px 16px',
            marginBottom: '16px',
            boxShadow: '0 1px 3px rgba(30, 58, 138, 0.06)'
          }}
        >
          <span style={{ fontSize: '18px' }}>🏛️</span>
          <h3
            className="text-primary"
            style={{
              margin: 0,
              fontSize: '16.5px',
              fontWeight: 800,
              color: '#1d4ed8',
              letterSpacing: '-0.2px',
            }}
          >
            {isEs ? 'Cotizando Actualmente para: ' : 'Currently Quoting for: '}
            <span style={{ color: '#1e3a8a', textDecoration: 'underline' }}>{selectedLocationName}</span>
          </h3>
        </div>
      )}

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
            const isSelected = Boolean(
              localSelectedService && (
                (localSelectedService._id && svc._id && localSelectedService._id === svc._id) ||
                (localSelectedService.id && svc.id && localSelectedService.id === svc.id) ||
                (localSelectedService.name && svc.name && localSelectedService.name.trim().toLowerCase() === svc.name.trim().toLowerCase())
              )
            );

            const localizedPackageName = getLocalizedText(svc, 'packageName', lang) || svc.name;
            const localizedCategory = getLocalizedText(svc, 'category', lang) || svc.category || 'Traditional';
            const subtitleText =
              svc.specifications || localizedCategory || (lang === 'es' ? 'Velación y servicio funerario tradicional' : 'Traditional visitation & funeral service');

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
                    {localizedPackageName}
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
                    {localizedCategory}
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
