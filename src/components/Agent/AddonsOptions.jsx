import React, { useState, useEffect, useMemo } from 'react';
import { useQuote } from '../../context/QuoteContext.jsx';
import Button from '../common/Button.jsx';
import api from '../../services/api.js';
import { defaultAddons } from '../../utils/legacyData.js';
import { formatMoney } from '../../utils/quoteLogic.js';

export default function AddonsOptions({ onBack, onContinue }) {
  const { lang, quote, setQuote, selectedFuneralHome, db, addToast } = useQuote();

  // Target funeral home ID from context
  const funeralHomeId =
    selectedFuneralHome?._id ||
    selectedFuneralHome?.id ||
    quote?.homeId ||
    quote?.home ||
    '';

  // Fee rates ($94 for death certs per client instruction, $12 for disposition permit)
  const deathCertUnitPrice = (quote?.deathCertUnitPrice && quote.deathCertUnitPrice !== 26 && quote.deathCertUnitPrice !== 24)
    ? Number(quote.deathCertUnitPrice)
    : 94;
  const dispositionPermitPrice = Number(db?.fees?.dispositionPermit) || 12;

  // Local state for quantity-based Death Certificates (default 1)
  const [deathCertificateCount, setDeathCertificateCount] = useState(() => {
    return Math.max(1, Number(quote.certs || quote.deathCertCount || 1));
  });

  // Local state for selected addon IDs (from quote.addons or empty Set)
  const [selectedAddonIds, setSelectedAddonIds] = useState(() => {
    return new Set(Array.isArray(quote.addons) ? quote.addons : []);
  });

  // Local state for addon quantities (default 1 for each addon)
  const [addonQuantities, setAddonQuantities] = useState(() => {
    const initial = {};
    if (quote?.addonQuantities) {
      Object.assign(initial, quote.addonQuantities);
    }
    if (Array.isArray(quote?.selectedAddonObjects)) {
      quote.selectedAddonObjects.forEach(obj => {
        if (obj.id && obj.quantity) {
          initial[obj.id] = obj.quantity;
        }
      });
    }
    return initial;
  });

  // Available add-ons list loaded from API + standard fallback
  const [addonsList, setAddonsList] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Standard fallback list matching the client design exactly
  const standardFallbackAddons = useMemo(() => {
    if (Array.isArray(defaultAddons)) {
      return defaultAddons.map(item => ({
        id: item[0],
        name: item[1],
        price: Number(item[2]) || 0,
      }));
    }
    return [
      { id: 'flowers', name: 'Flowers', price: 350 },
      { id: 'memorial', name: 'Memorial package — guest book, memorial cards & video', price: 395 },
      { id: 'doves', name: 'Dove release', price: 400 },
      { id: 'music', name: 'Music', price: 0 },
      { id: 'escorts', name: 'Funeral escorts', price: 250 },
      { id: 'air_tray', name: 'Air tray', price: 275 },
      { id: 'photo_tribute', name: 'Photo tribute (up to 15 photos)', price: 325 },
      { id: 'rosaries', name: 'Rosaries', price: 20 },
    ];
  }, []);

  // Fetch available add-ons from GET /api/catalog/location/${funeralHomeId}?type=ADDON
  useEffect(() => {
    let isMounted = true;

    async function loadAddons() {
      setIsLoading(true);
      try {
        if (funeralHomeId) {
          const res = await api.get(`/catalog/location/${funeralHomeId}?type=ADDON`);
          if (isMounted && res.data && Array.isArray(res.data) && res.data.length > 0) {
            // Normalize backend items
            const backendItems = res.data
              .filter(item => {
                // Filter out death certificates if it's returned as an add-on item so it doesn't duplicate
                const nameLower = (item.name || '').toLowerCase();
                return !nameLower.includes('death certificate');
              })
              .map(item => ({
                id: item._id || item.id,
                name: item.name,
                price: Number(item.listPrice ?? item.price ?? 0),
              }));

            // Merge with standard fallback items ensuring all items from the client design are available
            const backendItemNames = new Set(backendItems.map(i => i.name.toLowerCase()));
            const merged = [...backendItems];

            standardFallbackAddons.forEach(fallbackItem => {
              if (!backendItemNames.has(fallbackItem.name.toLowerCase())) {
                merged.push(fallbackItem);
              }
            });

            setAddonsList(merged);
            return;
          }
        }
        // Fallback to standard client catalog
        if (isMounted) {
          setAddonsList(standardFallbackAddons);
        }
      } catch (err) {
        console.warn('[AddonsOptions] Error fetching /api/catalog/location:', err);
        if (isMounted) {
          setAddonsList(standardFallbackAddons);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadAddons();

    return () => {
      isMounted = false;
    };
  }, [funeralHomeId, standardFallbackAddons]);

  // Toggle checkbox state for an addon
  const handleToggleAddon = (addonId) => {
    setSelectedAddonIds(prev => {
      const next = new Set(prev);
      if (next.has(addonId)) {
        next.delete(addonId);
      } else {
        next.add(addonId);
        setAddonQuantities(qPrev => ({
          ...qPrev,
          [addonId]: qPrev[addonId] || 1,
        }));
      }
      return next;
    });
  };

  // Increment addon quantity
  const handleIncrementAddon = (addonId) => {
    setAddonQuantities(prev => ({
      ...prev,
      [addonId]: (prev[addonId] || 1) + 1,
    }));
  };

  // Decrement addon quantity (min 1)
  const handleDecrementAddon = (addonId) => {
    setAddonQuantities(prev => ({
      ...prev,
      [addonId]: Math.max(1, (prev[addonId] || 1) - 1),
    }));
  };

  // Decrement death certificates count (min 1)
  const handleDecrementCerts = () => {
    setDeathCertificateCount(prev => Math.max(1, prev - 1));
  };

  // Increment death certificates count
  const handleIncrementCerts = () => {
    setDeathCertificateCount(prev => prev + 1);
  };

  // Dynamic Step Total: Sum of selected add-ons + Certified Death Certificates + Mandatory Permit
  const stepTotal = useMemo(() => {
    const addonsSum = Array.from(selectedAddonIds).reduce((sum, id) => {
      const found = addonsList.find(a => a.id === id);
      const unitPrice = found ? Number(found.price || 0) : 0;
      const qty = Math.max(1, Number(addonQuantities[id] || 1));
      return sum + (unitPrice * qty);
    }, 0);

    const certsSum = deathCertificateCount * deathCertUnitPrice;
    return addonsSum + certsSum + dispositionPermitPrice;
  }, [selectedAddonIds, addonsList, addonQuantities, deathCertificateCount, deathCertUnitPrice, dispositionPermitPrice]);

  // Continue to Step 6: save payload into QuoteContext
  const handleContinue = () => {
    // Construct selected add-on objects with calculated prices and quantities
    const selectedAddonObjects = Array.from(selectedAddonIds)
      .map(id => {
        const found = addonsList.find(a => a.id === id);
        const unitPrice = found ? found.price : 0;
        const quantity = Math.max(1, addonQuantities[id] || 1);
        const totalPrice = unitPrice * quantity;
        return {
          id,
          name: found ? found.name : id,
          unitPrice,
          price: totalPrice,
          quantity,
          totalPrice,
          taxable: false,
        };
      })
      .filter(item => item.totalPrice > 0 && !item.id.startsWith('western_'));

    const certsTotal = deathCertificateCount * deathCertUnitPrice;

    // Update QuoteContext state
    setQuote(prev => ({
      ...prev,
      addons: Array.from(selectedAddonIds),
      addonQuantities,
      selectedAddonObjects,
      addonsStepTotal: stepTotal,
      flowersQty: addonQuantities['flowers'] || addonQuantities['murillo_flowers'] || addonQuantities['felipe_flowers'] || 1,
      escortQty: addonQuantities['escorts'] || addonQuantities['murillo_escort'] || 1,
      certs: deathCertificateCount,
      deathCertCount: deathCertificateCount,
      deathCertUnitPrice,
      deathCertTotal: certsTotal,
      dispositionPermitFee: dispositionPermitPrice,
    }));

    if (onContinue) {
      onContinue();
    }
  };

  return (
    <div className="addons-options-container">
      {/* 1. Header & Subtitle */}
      <h1
        className="page-title"
        style={{
          fontSize: '32px',
          fontWeight: 800,
          color: '#183655',
          marginBottom: '8px',
          letterSpacing: '-0.5px',
        }}
      >
        {lang === 'es' ? 'Servicios Adicionales y Anticipos' : 'Add-ons & Cash Advances'}
      </h1>
      <p
        className="page-subtitle"
        style={{
          fontSize: '15px',
          color: '#64748b',
          marginBottom: '26px',
          lineHeight: 1.5,
        }}
      >
        {lang === 'es'
          ? 'Seleccione arreglos florales, cortejo fúnebre, actas de defunción y permisos.'
          : 'Select floral arrangements, funeral escorts, death certificates, and memorial items.'}
      </p>

      {/* 2. Certificates & Permits Highlighted Section */}
      <div
        style={{
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '14px',
          padding: '22px 24px',
          marginBottom: '24px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontWeight: 700,
            fontSize: '15px',
            color: '#183655',
            marginBottom: '16px',
          }}
        >
          <span style={{ fontSize: '18px' }}>📓</span>
          <span>{lang === 'es' ? 'Certificados y Permisos' : 'Certificates & Permits'}</span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '24px',
            alignItems: 'center',
          }}
        >
          {/* Left: Certified Death Certificates with quantity selector & calculated item total */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap' }}>
            <div>
              <div
                style={{
                  fontSize: '13.5px',
                  fontWeight: 600,
                  color: '#334155',
                  marginBottom: '8px',
                }}
              >
                {lang === 'es' ? 'Actas de Defunción Certificadas' : 'Certified Death Certificates'}{' '}
                (${deathCertUnitPrice} c/u)
              </div>

              {/* Quantity Selector UI (- 1 +) */}
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  backgroundColor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  height: '38px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                }}
              >
                <button
                  type="button"
                  onClick={handleDecrementCerts}
                  disabled={deathCertificateCount <= 1}
                  style={{
                    width: '38px',
                    height: '100%',
                    border: 'none',
                    borderRight: '1px solid #e2e8f0',
                    backgroundColor: '#ffffff',
                    color: deathCertificateCount <= 1 ? '#94a3b8' : '#334155',
                    fontSize: '18px',
                    fontWeight: 600,
                    cursor: deathCertificateCount <= 1 ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'background-color 0.15s ease',
                  }}
                  onMouseOver={(e) => {
                    if (deathCertificateCount > 1) e.currentTarget.style.backgroundColor = '#f1f5f9';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = '#ffffff';
                  }}
                >
                  -
                </button>

                <div
                  style={{
                    width: '46px',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '15px',
                    fontWeight: 700,
                    color: '#183655',
                    userSelect: 'none',
                  }}
                >
                  {deathCertificateCount}
                </div>

                <button
                  type="button"
                  onClick={handleIncrementCerts}
                  style={{
                    width: '38px',
                    height: '100%',
                    border: 'none',
                    borderLeft: '1px solid #e2e8f0',
                    backgroundColor: '#ffffff',
                    color: '#334155',
                    fontSize: '18px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'background-color 0.15s ease',
                  }}
                  onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
                  onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
                >
                  +
                </button>
              </div>
            </div>

            {/* Calculated Death Certificates Total & Breakdown */}
            <div style={{ textAlign: 'right', minWidth: '95px' }}>
              <div
                style={{
                  fontSize: '20px',
                  fontWeight: 800,
                  color: '#183655',
                  lineHeight: 1.15,
                }}
              >
                ${deathCertificateCount * deathCertUnitPrice}
              </div>
              {deathCertificateCount > 1 && (
                <div
                  style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#64748b',
                    marginTop: '2px',
                  }}
                >
                  {deathCertificateCount} x ${deathCertUnitPrice}
                </div>
              )}
            </div>
          </div>

          {/* Right: Mandatory Disposition Permit with fixed layout */}
          <div>
            <div
              style={{
                fontSize: '13.5px',
                fontWeight: 600,
                color: '#334155',
                marginBottom: '8px',
              }}
            >
              {lang === 'es' ? 'Permiso de Disposición Obligatorio' : 'Mandatory Disposition Permit'}
            </div>
            <div
              style={{
                fontSize: '20px',
                fontWeight: 800,
                color: '#183655',
              }}
            >
              ${dispositionPermitPrice}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Checkable Add-ons List */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          marginBottom: '32px',
        }}
      >
        {addonsList.map((addon) => {
          const isChecked = selectedAddonIds.has(addon.id);
          const qty = addonQuantities[addon.id] || 1;
          const unitPrice = addon.price;
          const totalPrice = unitPrice * qty;

          return (
            <div
              key={addon.id}
              onClick={() => handleToggleAddon(addon.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                backgroundColor: isChecked ? '#f1f6fb' : '#ffffff',
                border: isChecked ? '1.5px solid #183655' : '1px solid #e2e8f0',
                borderRadius: '10px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: isChecked
                  ? '0 2px 6px rgba(24, 54, 85, 0.08)'
                  : '0 1px 3px rgba(0,0,0,0.02)',
                gap: '16px',
                flexWrap: 'wrap',
              }}
              onMouseOver={(e) => {
                if (!isChecked) {
                  e.currentTarget.style.borderColor = '#cbd5e1';
                  e.currentTarget.style.backgroundColor = '#f8fafc';
                }
              }}
              onMouseOut={(e) => {
                if (!isChecked) {
                  e.currentTarget.style.borderColor = '#e2e8f0';
                  e.currentTarget.style.backgroundColor = '#ffffff';
                }
              }}
            >
              {/* Checkbox & Name */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  flex: 1,
                  minWidth: '220px',
                }}
              >
                {/* Styled Checkbox Box matching screenshot */}
                <div
                  style={{
                    width: '18px',
                    height: '18px',
                    borderRadius: '4px',
                    border: isChecked ? '2px solid #183655' : '1.5px solid #cbd5e1',
                    backgroundColor: isChecked ? '#183655' : '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    transition: 'all 0.15s ease',
                  }}
                >
                  {isChecked && (
                    <span
                      style={{
                        color: '#ffffff',
                        fontSize: '11px',
                        fontWeight: 900,
                        lineHeight: 1,
                      }}
                    >
                      ✓
                    </span>
                  )}
                </div>

                <span
                  style={{
                    fontSize: '15px',
                    fontWeight: isChecked ? 700 : 600,
                    color: '#183655',
                    lineHeight: 1.35,
                  }}
                >
                  {addon.name}
                </span>
              </div>

              {/* Right Side: Quantity selector & Price Breakdown */}
              {isChecked ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    flexShrink: 0,
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Quantity Selector UI (- qty +) */}
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      backgroundColor: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      height: '34px',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                    }}
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDecrementAddon(addon.id);
                      }}
                      disabled={qty <= 1}
                      title={lang === 'es' ? 'Disminuir cantidad' : 'Decrease quantity'}
                      style={{
                        width: '32px',
                        height: '100%',
                        border: 'none',
                        borderRight: '1px solid #e2e8f0',
                        backgroundColor: '#ffffff',
                        color: qty <= 1 ? '#94a3b8' : '#334155',
                        fontSize: '16px',
                        fontWeight: 600,
                        cursor: qty <= 1 ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'background-color 0.15s ease',
                      }}
                      onMouseOver={(e) => {
                        if (qty > 1) e.currentTarget.style.backgroundColor = '#f1f5f9';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.backgroundColor = '#ffffff';
                      }}
                    >
                      -
                    </button>

                    <div
                      style={{
                        minWidth: '34px',
                        padding: '0 6px',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '14px',
                        fontWeight: 700,
                        color: '#183655',
                        userSelect: 'none',
                      }}
                    >
                      {qty}
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleIncrementAddon(addon.id);
                      }}
                      title={lang === 'es' ? 'Aumentar cantidad' : 'Increase quantity'}
                      style={{
                        width: '32px',
                        height: '100%',
                        border: 'none',
                        borderLeft: '1px solid #e2e8f0',
                        backgroundColor: '#ffffff',
                        color: '#334155',
                        fontSize: '16px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'background-color 0.15s ease',
                      }}
                      onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
                      onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
                    >
                      +
                    </button>
                  </div>

                  {/* Price display with unit price & total */}
                  <div style={{ textAlign: 'right', minWidth: '95px' }}>
                    <div
                      style={{
                        fontSize: '16.5px',
                        fontWeight: 800,
                        color: '#183655',
                        lineHeight: 1.2,
                      }}
                    >
                      {formatMoney(totalPrice)}
                    </div>
                    {qty > 1 && (
                      <div
                        style={{
                          fontSize: '12px',
                          fontWeight: 600,
                          color: '#64748b',
                          marginTop: '3px',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {qty} x {formatMoney(unitPrice)}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Unchecked State: standard fixed price */
                <div
                  style={{
                    fontSize: '16px',
                    fontWeight: 700,
                    color: '#183655',
                    flexShrink: 0,
                  }}
                >
                  {formatMoney(addon.price)}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 4. Bottom Navigation Buttons & Dynamic Step Total */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '28px',
          paddingTop: '20px',
          borderTop: '1px solid #e2e8f0',
          gap: '16px',
          flexWrap: 'wrap',
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
            boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
          }}
        >
          ← {lang === 'es' ? 'Atrás' : 'Back'}
        </Button>

        {/* Dynamic Step Total & Continue Button Container */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '24px',
          }}
        >
          <div style={{ textAlign: 'right' }}>
            <div
              style={{
                fontSize: '12px',
                fontWeight: 700,
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '0.6px',
                marginBottom: '2px',
              }}
            >
              {lang === 'es' ? 'Total de esta Sección' : 'Step Total'}
            </div>
            <div
              style={{
                fontSize: '24px',
                fontWeight: 800,
                color: '#183655',
                lineHeight: 1.15,
                letterSpacing: '-0.3px',
              }}
            >
              {formatMoney(stepTotal)}
            </div>
          </div>

          <Button
            variant="primary"
            size="lg"
            onClick={handleContinue}
            style={{
              backgroundColor: '#183655',
              borderColor: '#183655',
              padding: '12px 32px',
              fontSize: '15px',
              fontWeight: 700,
              borderRadius: '10px',
              boxShadow: '0 2px 6px rgba(24, 54, 85, 0.2)',
            }}
          >
            {lang === 'es' ? 'Continuar →' : 'Continue →'}
          </Button>
        </div>
      </div>
    </div>
  );
}
