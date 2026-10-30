import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuote } from '../../context/QuoteContext.jsx';
import Button from '../common/Button.jsx';
import api from '../../services/api.js';
import { formatMoney, getLocalizedText } from '../../utils/quoteLogic.js';
import { AddonRowSkeleton } from '../common/SkeletonLoader.jsx';

export const isGuaranteedAddonItem = (item) => {
  if (!item) return false;
  const cat = String(item.category || item.type || '').toLowerCase();
  if (cat.includes('guarant') && !cat.includes('non')) return true;
  if (cat.includes('non')) return false;
  const id = String(item.id || '').toLowerCase();
  const name = String(item.name || '').toLowerCase();
  return !!item.isGuaranteed || id === 'memorial' || name.includes('memorial package');
};

export default function AddonsOptions({ onBack, onContinue }) {
  const { t } = useTranslation();
  const { lang, quote, setQuote, selectedFuneralHome, db } = useQuote();

  const isEs = lang === 'es';

  // Target funeral home ID from context
  const funeralHomeId =
    selectedFuneralHome?._id ||
    selectedFuneralHome?.id ||
    quote?.homeId ||
    quote?.home ||
    '';

  // Selected Service Package from Step 3 (or Step 2 zero-indexed)
  const selectedPackageId = String(
    quote?.selectedServiceObject?._id ||
    quote?.selectedServiceObject?.id ||
    quote?.servicePackageId ||
    ''
  );
  const selectedPackageName = (
    quote?.selectedServiceObject?.packageName ||
    quote?.selectedServiceObject?.name ||
    quote?.serviceName ||
    ''
  ).trim().toLowerCase();

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

  // Local state for exactly 3 custom unlisted manual non-guaranteed rows
  const [customItems, setCustomItems] = useState(() => {
    if (Array.isArray(quote?.customNonGuaranteedItems) && quote.customNonGuaranteedItems.length > 0) {
      const items = [...quote.customNonGuaranteedItems];
      while (items.length < 3) {
        items.push({ name: '', price: '' });
      }
      return items.slice(0, 3).map(it => ({
        name: it?.name || '',
        price: it?.price !== undefined && it?.price !== null ? it.price : ''
      }));
    }
    return [
      { name: '', price: '' },
      { name: '', price: '' },
      { name: '', price: '' }
    ];
  });

  const handleCustomItemChange = (index, field, value) => {
    setCustomItems(prev => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        [field]: value
      };
      return next;
    });
  };

  // Available add-ons list loaded strictly from live MongoDB database
  const [addonsList, setAddonsList] = useState([]);
  const [isSyncing, setIsSyncing] = useState(true);
  const [error, setError] = useState(null);

  // Fetch available add-ons from GET /api/catalog/location/${funeralHomeId}?type=ADDON&onlyActive=true
  useEffect(() => {
    let isMounted = true;

    async function loadAddons() {
      if (!funeralHomeId) {
        if (isMounted) {
          setAddonsList([]);
          setIsSyncing(false);
        }
        return;
      }

      setIsSyncing(true);
      setError(null);
      try {
        const res = await api.get(`/catalog/location/${funeralHomeId}?type=ADDON&onlyActive=true`);
        if (isMounted) {
          if (res.data && Array.isArray(res.data)) {
            // Normalize backend items
            const backendItems = res.data
              .filter(item => {
                const price = item.listPrice !== null && item.listPrice !== undefined ? Number(item.listPrice) : Number(item.price);
                const hasDests = Boolean(item.hasDestinations && Array.isArray(item.destinations) && item.destinations.length > 0);
                if (!(price >= 0 || hasDests) || item.isActive === false) return false;

                // Filter by assigned service packages: only show items assigned to the currently selected Service Package
                const pkgs = Array.isArray(item.assignedPackages) ? item.assignedPackages : [];
                if (pkgs.length > 0) {
                  const sKey = String(quote?.service || '').toLowerCase().trim();
                  const isAssigned = pkgs.some(p => {
                    if (!p) return false;
                    const pStr = String(typeof p === 'object' ? (p._id || p.id || '') : p).trim().toLowerCase();
                    if (selectedPackageId && pStr === selectedPackageId.toLowerCase()) return true;
                    if (selectedPackageName && (pStr === selectedPackageName || selectedPackageName.includes(pStr) || pStr.includes(selectedPackageName))) return true;
                    if (sKey && (pStr === sKey || sKey.includes(pStr))) return true;
                    return false;
                  });
                  if (!isAssigned) return false;
                }

                return true;
              })
              .map(item => ({
                id: item._id || item.id,
                _id: item._id || item.id,
                name: item.name,
                itemName: item.itemName || item.name,
                itemName_es: item.itemName_es || item.name_es || '',
                name_es: item.itemName_es || item.name_es || '',
                category_es: item.category_es || '',
                price: Number(item.listPrice ?? item.price ?? 0),
                listPrice: Number(item.listPrice ?? item.price ?? 0),
                category: item.category || item.type || 'Non-Guaranteed',
                type: item.type || item.category || 'Non-Guaranteed',
                isMandatory: Boolean(item.isMandatory),
                isFixedPrice: Boolean(item.isFixedPrice),
                hasDestinations: Boolean(item.hasDestinations),
                destinations: Array.isArray(item.destinations) ? item.destinations : [],
                assignedPackages: Array.isArray(item.assignedPackages) ? item.assignedPackages : [],
                isGuaranteed: item.category === 'Guaranteed' || item.type === 'Guaranteed' || isGuaranteedAddonItem(item),
                specifications: item.specifications || item.description || ''
              }));

            setAddonsList(backendItems);
          } else {
            setAddonsList([]);
          }
        }
      } catch (err) {
        console.warn('[AddonsOptions] Error fetching /api/catalog/location:', err);
        if (isMounted) {
          setAddonsList([]);
          setError(isEs ? 'Error al cargar los adicionales desde la base de datos.' : 'Failed to load add-ons from the database.');
        }
      } finally {
        if (isMounted) {
          setIsSyncing(false);
        }
      }
    }

    loadAddons();

    return () => {
      isMounted = false;
    };
  }, [funeralHomeId, selectedPackageId, selectedPackageName]);

  // Destination selections state (mapped by addon.id)
  const [addonDestinations, setAddonDestinations] = useState(() => {
    const initial = {};
    if (quote?.selectedDestinations) {
      Object.assign(initial, quote.selectedDestinations);
    }
    return initial;
  });

  const handleDestinationSelect = (addonId, destName, destinationsList) => {
    setAddonDestinations(prev => ({ ...prev, [addonId]: destName }));
    const matched = (destinationsList || []).find(d => d.name === destName);
    if (matched) {
      setCustomPrices(prev => ({
        ...prev,
        [addonId]: Number(matched.defaultPrice || 0)
      }));
    }
  };

  // Automatically select and lock any mandatory items
  useEffect(() => {
    const mandatoryItems = addonsList.filter(a => a.isMandatory);
    if (mandatoryItems.length > 0) {
      setSelectedAddonIds(prev => {
        const next = new Set(prev);
        let changed = false;
        mandatoryItems.forEach(item => {
          if (!next.has(item.id)) {
            next.add(item.id);
            changed = true;
          }
        });
        return changed ? next : prev;
      });

      setAddonQuantities(prev => {
        const next = { ...prev };
        let changed = false;
        mandatoryItems.forEach(item => {
          if (!next[item.id]) {
            next[item.id] = 1;
            changed = true;
          }
        });
        return changed ? next : prev;
      });

      // Initialize default destination if required
      setAddonDestinations(prev => {
        const next = { ...prev };
        let changed = false;
        mandatoryItems.forEach(item => {
          if (item.hasDestinations && item.destinations?.length > 0 && !next[item.id]) {
            next[item.id] = item.destinations[0].name;
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }
  }, [addonsList]);

  // Separate Guaranteed Merchandise from Non-Guaranteed Addons
  const guaranteedAddonsList = useMemo(() => {
    return addonsList.filter(item => isGuaranteedAddonItem(item));
  }, [addonsList]);

  const nonGuaranteedAddonsList = useMemo(() => {
    return addonsList.filter(item => !isGuaranteedAddonItem(item));
  }, [addonsList]);

  // Editable Prices State
  const [customPrices, setCustomPrices] = useState(() => {
    return quote.priceOverrides ? { ...quote.priceOverrides } : {};
  });

  const getAddonUnitPrice = (addon) => {
    if (!addon) return 0;
    if (customPrices && customPrices[addon.id] !== undefined && customPrices[addon.id] !== '') {
      return Number(customPrices[addon.id]) || 0;
    }
    if (quote.priceOverrides && quote.priceOverrides[addon.id] !== undefined) {
      return Number(quote.priceOverrides[addon.id]) || 0;
    }
    if (addon.hasDestinations && Array.isArray(addon.destinations) && addon.destinations.length > 0) {
      const selectedName = (addonDestinations && addonDestinations[addon.id]) || addon.destinations[0].name;
      const matched = addon.destinations.find(d => d.name === selectedName) || addon.destinations[0];
      return Number(matched?.defaultPrice || 0);
    }
    return Number(addon.price || addon.listPrice || 0);
  };

  const handlePriceChange = (addonId, val) => {
    const sanitizedVal = val === '' ? '' : Math.max(0, parseFloat(val) || 0);
    setCustomPrices(prev => ({
      ...prev,
      [addonId]: sanitizedVal
    }));
  };

  // Toggle checkbox state for an addon
  const handleToggleAddon = (addonId) => {
    const addon = addonsList.find(a => a.id === addonId);
    if (addon?.isMandatory) {
      // Cannot be removed by the agent
      return;
    }

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

  // Dynamic Step Total:
  // Guaranteed Merchandise + 11% Guaranteed Tax + Non-Guaranteed Add-ons + Custom Items
  const stepTotal = useMemo(() => {
    let guaranteedSum = 0;
    let guaranteedTaxSum = 0;
    let nonGuaranteedSum = 0;

    selectedAddonIds.forEach(id => {
      const found = addonsList.find(a => a.id === id);
      const unitPrice = found ? getAddonUnitPrice(found) : 0;
      const qty = Math.max(1, Number((addonQuantities && addonQuantities[id]) || 1));
      const total = unitPrice * qty;

      if (isGuaranteedAddonItem(found || { id })) {
        guaranteedSum += total;
        guaranteedTaxSum += Math.round(total * 0.11 * 100) / 100;
      } else {
        nonGuaranteedSum += total;
      }
    });

    // Custom non-guaranteed items sum
    let customSum = 0;
    customItems.forEach(item => {
      const p = parseFloat(item.price) || 0;
      if (item.name && item.name.trim() !== '' && p > 0) {
        customSum += p;
      }
    });
    nonGuaranteedSum += customSum;

    const grandTotal = guaranteedSum + guaranteedTaxSum + nonGuaranteedSum;

    return {
      guaranteedSum,
      guaranteedTaxSum,
      nonGuaranteedSum,
      customSum,
      grandTotal,
    };
  }, [selectedAddonIds, addonsList, addonQuantities, customPrices, customItems]);

  // Continue to Step 6: save payload distinctly into QuoteContext
  const handleContinue = () => {
    const guaranteedAddons = [];
    const nonGuaranteedAddons = [];

    Array.from(selectedAddonIds).forEach(id => {
      const found = addonsList.find(a => a.id === id);
      const unitPrice = found ? getAddonUnitPrice(found) : 0;
      const quantity = Math.max(1, Number((addonQuantities && addonQuantities[id]) || 1));
      const totalPrice = unitPrice * quantity;
      const isGuar = isGuaranteedAddonItem(found || { id });
      const taxRate = isGuar ? 0.11 : 0;
      const taxAmount = isGuar ? Math.round(totalPrice * 0.11 * 100) / 100 : 0;

      const itemObj = {
        id,
        name: found ? found.name : id,
        itemName: found ? (found.itemName || found.name) : id,
        itemName_es: found?.itemName_es || found?.name_es || '',
        name_es: found?.itemName_es || found?.name_es || '',
        category_es: found?.category_es || '',
        unitPrice,
        price: totalPrice,
        totalPrice,
        quantity,
        isGuaranteed: isGuar,
        taxable: isGuar,
        taxRate,
        taxAmount,
        isMandatory: Boolean(found?.isMandatory),
        isFixedPrice: Boolean(found?.isFixedPrice),
        hasDestinations: Boolean(found?.hasDestinations),
        selectedDestination: (addonDestinations && addonDestinations[id]) || null,
        destinations: found?.destinations || []
      };

      if (!id.startsWith('western_')) {
        if (isGuar) {
          guaranteedAddons.push(itemObj);
        } else {
          nonGuaranteedAddons.push(itemObj);
        }
      }
    });

    // Filter custom items that have a non-empty name
    const filledCustomItems = customItems
      .filter(item => item && item.name && item.name.trim() !== '')
      .map(item => ({
        name: item.name.trim(),
        price: Math.max(0, parseFloat(item.price) || 0),
        isGuaranteed: false,
        taxable: false,
      }));

    const customItemsSum = filledCustomItems.reduce((sum, it) => sum + it.price, 0);
    const guaranteedAddonsTotal = guaranteedAddons.reduce((sum, a) => sum + a.totalPrice, 0);
    const guaranteedAddonsTax = Math.round(guaranteedAddonsTotal * 0.11 * 100) / 100;
    const nonGuaranteedAddonsTotal = nonGuaranteedAddons.reduce((sum, a) => sum + a.totalPrice, 0) + customItemsSum;
    const selectedAddonObjects = [...guaranteedAddons, ...nonGuaranteedAddons];

    const mergedOverrides = { ...(quote.priceOverrides || {}) };
    Object.keys(customPrices).forEach(k => {
      if (customPrices[k] !== '' && customPrices[k] !== undefined) {
        mergedOverrides[k] = Number(customPrices[k]) || 0;
      }
    });

    // Update QuoteContext state with distinct guaranteedAddons, nonGuaranteedAddons & customNonGuaranteedItems
    setQuote(prev => ({
      ...prev,
      addons: Array.from(selectedAddonIds),
      addonQuantities,
      selectedDestinations: addonDestinations,
      priceOverrides: mergedOverrides,
      selectedAddonObjects,
      guaranteedAddons,
      nonGuaranteedAddons,
      customNonGuaranteedItems: customItems,
      filledCustomNonGuaranteedItems: filledCustomItems,
      guaranteedAddonsTotal,
      guaranteedAddonsTax,
      nonGuaranteedAddonsTotal,
      addonsStepTotal: stepTotal.grandTotal,
      flowersQty: (addonQuantities && (addonQuantities['flowers'] || addonQuantities['murillo_flowers'] || addonQuantities['felipe_flowers'])) || 1,
      escortQty: (addonQuantities && (addonQuantities['escorts'] || addonQuantities['murillo_escort'])) || 1,
      certs: 0,
      deathCertCount: 0,
      deathCertUnitPrice: 0,
      deathCertTotal: 0,
      dispositionPermitFee: 0,
    }));

    if (onContinue) {
      onContinue();
    }
  };

  // Helper to render an individual addon row card
  const renderAddonRow = (addon, isGuaranteed = false) => {
    const isChecked = selectedAddonIds.has(addon.id);
    const qty = (addonQuantities && addonQuantities[addon.id]) || 1;
    const unitPrice = getAddonUnitPrice(addon);
    const totalPrice = unitPrice * qty;
    const taxAmount = isGuaranteed ? Math.round(totalPrice * 0.11 * 100) / 100 : 0;
    const isMandatory = Boolean(addon.isMandatory);

    // SPECIAL DESTINATION-BASED AIRFARE CARD (matches image_6c89c3.png)
    if (addon.hasDestinations) {
      const destinationsList = Array.isArray(addon.destinations) && addon.destinations.length > 0
        ? addon.destinations
        : [
            { name: 'North America', defaultPrice: 1000 },
            { name: 'South America', defaultPrice: 1500 },
            { name: 'Europe', defaultPrice: 2000 },
            { name: 'Asia', defaultPrice: 2000 },
          ];
      const selectedDestName = (addonDestinations && addonDestinations[addon.id]) || destinationsList[0].name;
      const currentPrice = customPrices && customPrices[addon.id] !== undefined ? customPrices[addon.id] : unitPrice;

      return (
        <div
          key={addon.id}
          style={{
            display: 'flex',
            flexDirection: 'column',
            padding: '18px 22px',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            backgroundColor: '#ffffff',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
            marginTop: '8px',
            marginBottom: '8px',
            transition: 'all 0.15s ease',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '14px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '15.5px', fontWeight: 700, color: '#183655', lineHeight: 1.3 }}>
                {getLocalizedText(addon, 'itemName', lang) || addon.name}
              </div>
              <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px', lineHeight: 1.4 }}>
                {addon.specifications || addon.description || 'Automatic airfare for ship-out arrangements.'}
              </div>
            </div>

            <div style={{ fontWeight: 800, color: '#15803d', fontSize: '13.5px', letterSpacing: '0.3px', flexShrink: 0 }}>
              INCLUDED ✓
            </div>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '16px', marginTop: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ fontSize: '13.5px', fontWeight: 600, color: '#334155' }}>
                {isEs ? 'Destino' : 'Destination'}
              </label>
              <select
                value={selectedDestName}
                onChange={(e) => handleDestinationSelect(addon.id, e.target.value, destinationsList)}
                style={{
                  padding: '7px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  fontSize: '13.5px',
                  fontWeight: 600,
                  color: '#183655',
                  outline: 'none',
                  minWidth: '190px'
                }}
              >
                {destinationsList.map((d) => (
                  <option key={d.name} value={d.name}>
                    {d.name} — ${Number(d.defaultPrice).toLocaleString()}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <label style={{ fontSize: '13.5px', fontWeight: 600, color: '#334155' }}>
                {isEs ? 'Monto de boleto ($)' : 'Airfare amount ($)'}
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={currentPrice}
                onWheel={(e) => e.target.blur()}
                onKeyDown={(e) => {
                  if (e.key === '-' || e.key === 'e' || e.key === 'E') {
                    e.preventDefault();
                  }
                }}
                onChange={(e) => handlePriceChange(addon.id, e.target.value)}
                style={{
                  width: '105px',
                  padding: '7px 10px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: '#ffffff',
                  fontSize: '14.5px',
                  fontWeight: 700,
                  color: '#183655',
                  textAlign: 'center',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '12px' }}>
            {isEs
              ? 'El boleto de avión se incluye automáticamente en la cotización. El monto puede ajustarse a los cargos reales antes de emitir el FSA.'
              : 'Airfare is automatically included in the quote. The amount can be adjusted to actual freight charges before issuing the FSA.'}
          </div>
        </div>
      );
    }

    return (
      <div
        key={addon.id}
        onClick={() => {
          if (!isMandatory) {
            handleToggleAddon(addon.id);
          }
        }}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          backgroundColor: isChecked ? (isGuaranteed ? '#f0fdf4' : '#f1f6fb') : '#ffffff',
          border: isChecked
            ? (isGuaranteed ? '1.5px solid #16a34a' : '1.5px solid #183655')
            : '1px solid #e2e8f0',
          borderRadius: '10px',
          cursor: isMandatory ? 'default' : 'pointer',
          transition: 'all 0.15s ease',
          boxShadow: isChecked
            ? (isGuaranteed ? '0 2px 8px rgba(22, 163, 74, 0.12)' : '0 2px 6px rgba(24, 54, 85, 0.08)')
            : '0 1px 3px rgba(0,0,0,0.02)',
          gap: '16px',
          flexWrap: 'wrap',
        }}
        onMouseOver={(e) => {
          if (!isChecked && !isMandatory) {
            e.currentTarget.style.borderColor = isGuaranteed ? '#86efac' : '#cbd5e1';
            e.currentTarget.style.backgroundColor = isGuaranteed ? '#fcfdfd' : '#f8fafc';
          }
        }}
        onMouseOut={(e) => {
          if (!isChecked && !isMandatory) {
            e.currentTarget.style.borderColor = '#e2e8f0';
            e.currentTarget.style.backgroundColor = '#ffffff';
          }
        }}
      >
        {/* Left Side: Checkbox, Name, Mandatory Badge, and Guaranteed 11% Tax Note */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '14px',
            flex: 1,
            minWidth: '220px',
          }}
        >
          {/* Styled Checkbox Box */}
          <div
            style={{
              width: '18px',
              height: '18px',
              borderRadius: '4px',
              border: isChecked
                ? (isGuaranteed ? '2px solid #16a34a' : '2px solid #183655')
                : '1.5px solid #cbd5e1',
              backgroundColor: isChecked ? (isGuaranteed ? '#16a34a' : '#183655') : '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              cursor: isMandatory ? 'not-allowed' : 'pointer',
              opacity: isMandatory ? 0.9 : 1,
              transition: 'all 0.15s ease',
            }}
            title={isMandatory ? (isEs ? 'Tarifa obligatoria (no se puede deseleccionar)' : 'Mandatory item (cannot be unselected)') : ''}
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

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span
                style={{
                  fontSize: '15px',
                  fontWeight: isChecked ? 700 : 600,
                  color: isChecked && isGuaranteed ? '#14532d' : '#183655',
                  lineHeight: 1.35,
                }}
              >
                {getLocalizedText(addon, 'itemName', lang) || addon.name}
              </span>

              {/* Mandatory Item Badge */}
              {isMandatory && (
                <span
                  style={{
                    backgroundColor: '#fee2e2',
                    color: '#991b1b',
                    fontSize: '10.5px',
                    fontWeight: 750,
                    padding: '2px 7px',
                    borderRadius: '4px',
                    border: '1px solid #fecaca',
                    letterSpacing: '0.4px',
                    textTransform: 'uppercase'
                  }}
                >
                  🔒 {isEs ? 'OBLIGATORIO' : 'MANDATORY'}
                </span>
              )}
            </div>

            {/* Specifications / description subtitle (e.g. for Consultation fee) */}
            {(addon.specifications || addon.description) && (
              <div style={{ fontSize: '12.5px', color: '#64748b', marginTop: '2px' }}>
                {addon.specifications || addon.description}
              </div>
            )}

            {/* Guaranteed Merchandise 11% Tax Note */}
            {isGuaranteed && (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  marginTop: '4px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#15803d',
                  backgroundColor: '#dcfce7',
                  padding: '2px 8px',
                  borderRadius: '6px',
                }}
              >
                <span>🏷️</span>
                <span>
                  {isEs
                    ? 'Sujeto al 11% de impuesto sobre mercancía (incluido en anticipos no garantizados)'
                    : 'Subject to 11% merchandise tax (itemized under non-guaranteed cash advances)'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Quantity selector & Editable Price Column */}
        {isChecked ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
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
                title={isEs ? 'Disminuir cantidad' : 'Decrease quantity'}
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
                title={isEs ? 'Aumentar cantidad' : 'Increase quantity'}
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

            {/* Editable Numeric Price Input Column */}
            <div style={{ textAlign: 'right', minWidth: '105px' }} onClick={(e) => e.stopPropagation()}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '3px',
                  backgroundColor: '#ffffff',
                  border: isGuaranteed ? '1.5px solid #16a34a' : '1.5px solid #183655',
                  borderRadius: '8px',
                  padding: '4px 8px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                }}
              >
                <span style={{ fontWeight: 800, color: isGuaranteed ? '#15803d' : '#183655', fontSize: '15px' }}>$</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  readOnly={Boolean(addon.isFixedPrice)}
                  value={(customPrices && customPrices[addon.id] !== undefined) ? customPrices[addon.id] : unitPrice}
                  onWheel={(e) => e.target.blur()}
                  onKeyDown={(e) => {
                    if (e.key === '-' || e.key === 'e' || e.key === 'E') {
                      e.preventDefault();
                    }
                  }}
                  onChange={(e) => handlePriceChange(addon.id, e.target.value)}
                  style={{
                    width: '78px',
                    border: 'none',
                    outline: 'none',
                    fontSize: '16px',
                    fontWeight: 800,
                    color: isGuaranteed ? '#15803d' : '#183655',
                    textAlign: 'right',
                    backgroundColor: 'transparent'
                  }}
                />
              </div>

              {qty > 1 && (
                <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', marginTop: '3px', whiteSpace: 'nowrap' }}>
                  Total: {formatMoney(totalPrice)}
                </div>
              )}
              {isGuaranteed && (
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#16a34a', marginTop: '2px', whiteSpace: 'nowrap' }}>
                  + {formatMoney(taxAmount)} (11% tax)
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Unchecked State: Editable numeric price input column (as highlighted in reference image) */
          <div style={{ textAlign: 'right', flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                backgroundColor: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '4px 8px',
              }}
            >
              <span style={{ fontWeight: 700, color: '#64748b', fontSize: '14px' }}>$</span>
              <input
                type="number"
                min="0"
                step="1"
                readOnly={Boolean(addon.isFixedPrice)}
                value={(customPrices && customPrices[addon.id] !== undefined) ? customPrices[addon.id] : unitPrice}
                onWheel={(e) => e.target.blur()}
                onKeyDown={(e) => {
                  if (e.key === '-' || e.key === 'e' || e.key === 'E') {
                    e.preventDefault();
                  }
                }}
                onChange={(e) => handlePriceChange(addon.id, e.target.value)}
                style={{
                  width: '78px',
                  border: 'none',
                  outline: 'none',
                  fontSize: '15.5px',
                  fontWeight: 700,
                  color: '#334155',
                  textAlign: 'right',
                  backgroundColor: 'transparent'
                }}
              />
            </div>
            {isGuaranteed && (
              <div style={{ fontSize: '11px', fontWeight: 600, color: '#16a34a', marginTop: '2px' }}>
                + 11% tax ({formatMoney(Math.round(unitPrice * 0.11 * 100) / 100)})
              </div>
            )}
          </div>
        )}
      </div>
    );
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
        {isEs ? '¿Desea la familia agregar algún adicional?' : 'Would the family like any add-ons?'}
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
        {isEs
          ? 'Seleccione mercancía garantizada o servicios adicionales según las preferencias de la familia.'
          : 'Select guaranteed merchandise and non-guaranteed add-ons according to the family\'s preferences.'}
      </p>

      {/* Non-blocking background sync badge */}
      {isSyncing && addonsList.length > 0 && (
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
          <span>{isEs ? 'Sincronizando precios en vivo...' : 'Syncing live add-ons pricing...'}</span>
        </div>
      )}

      {/* Loading Skeleton when addons are loading */}
      {isSyncing && addonsList.length === 0 && (
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px', color: '#183655', fontWeight: 650, fontSize: '13.5px' }}>
            <div className="app-spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }} />
            <span>{isEs ? 'Cargando opciones adicionales...' : 'Loading additional options & add-ons...'}</span>
          </div>
          <AddonRowSkeleton count={5} />
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

      {/* Empty State */}
      {!isSyncing && addonsList.length === 0 && !error && (
        <div style={{ textAlign: 'center', padding: '36px 20px', color: '#64748b' }}>
          <p style={{ fontSize: '15px' }}>
            {isEs
              ? 'No hay opciones adicionales disponibles para la ubicación seleccionada.'
              : 'No add-ons or options available for the selected location.'}
          </p>
        </div>
      )}

      {/* ================= SECTION A: GUARANTEED MERCHANDISE ================= */}
      <div style={{ marginBottom: '28px' }}>
        {/* Green-accented Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '6px',
          }}
        >
          <span
            style={{
              display: 'inline-block',
              width: '4px',
              height: '18px',
              backgroundColor: '#16a34a',
              borderRadius: '2px',
            }}
          />
          <h2
            style={{
              fontSize: '14.5px',
              fontWeight: 800,
              color: '#15803d',
              letterSpacing: '0.6px',
              textTransform: 'uppercase',
              margin: 0,
            }}
          >
            {isEs ? 'MERCANCÍA GARANTIZADA' : 'GUARANTEED MERCHANDISE'}
          </h2>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              backgroundColor: '#dcfce7',
              color: '#15803d',
              padding: '2px 8px',
              borderRadius: '12px',
              border: '1px solid #bbf7d0',
            }}
          >
            {isEs ? 'Sección 2' : 'Section 2'}
          </span>
        </div>

        {/* Subtext */}
        <p
          style={{
            fontSize: '13px',
            color: '#4b5563',
            margin: '0 0 14px 0',
            lineHeight: 1.45,
          }}
        >
          {isEs
            ? 'La mercancía aplicable está incluida en la Sección 2 Garantizada. Los impuestos correspondientes a la mercancía aparecen bajo anticipos en efectivo no garantizados.'
            : 'Applicable merchandise are included in Guaranteed Section 2. Applicable merchandise taxes appear under non-guaranteed cash advances.'}
        </p>

        {/* Guaranteed Items Checklist (Memorial package) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {guaranteedAddonsList.map(addon => renderAddonRow(addon, true))}
        </div>
      </div>

      {/* ================= SECTION B: NON-GUARANTEED ADD-ONS ================= */}
      <div style={{ marginBottom: '28px' }}>
        {/* Orange-accented Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '6px',
          }}
        >
          <span
            style={{
              display: 'inline-block',
              width: '4px',
              height: '18px',
              backgroundColor: '#ea580c',
              borderRadius: '2px',
            }}
          />
          <h2
            style={{
              fontSize: '14.5px',
              fontWeight: 800,
              color: '#c2410c',
              letterSpacing: '0.6px',
              textTransform: 'uppercase',
              margin: 0,
            }}
          >
            {isEs ? 'ADICIONALES NO GARANTIZADOS' : 'NON-GUARANTEED ADD-ONS'}
          </h2>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              backgroundColor: '#ffedd5',
              color: '#c2410c',
              padding: '2px 8px',
              borderRadius: '12px',
              border: '1px solid #fed7aa',
            }}
          >
            {isEs ? 'Sección 4' : 'Section 4'}
          </span>
        </div>

        {/* Subtext */}
        <p
          style={{
            fontSize: '13px',
            color: '#4b5563',
            margin: '0 0 14px 0',
            lineHeight: 1.45,
          }}
        >
          {isEs
            ? 'Servicios y artículos adicionales a precio de anticipo en efectivo.'
            : 'Optional services and commodities payable as cash advances at time of need.'}
        </p>

        {/* Non-Guaranteed Checklist Items (Flowers, Dove release, Music, Funeral escorts, Photo tribute, Rosaries) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {nonGuaranteedAddonsList.map(addon => renderAddonRow(addon, false))}
        </div>

        {/* Custom / Unlisted Non-Guaranteed Merchandise UI Block (Exactly 3 Custom Rows) */}
        <div
          style={{
            marginTop: '16px',
            padding: '16px 18px',
            backgroundColor: '#f8fafc',
            border: '1.5px dashed #cbd5e1',
            borderRadius: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '15px' }}>✏️</span>
              <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#1e293b' }}>
                {isEs ? 'Artículos Adicionales Manuales (No Listados)' : 'Custom / Unlisted Cash Advance Items'}
              </span>
            </div>
            <span style={{ fontSize: '11.5px', color: '#64748b' }}>
              {isEs ? '3 filas manuales disponibles' : '3 custom rows available'}
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {customItems.map((item, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '8px 14px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                }}
              >
                <div style={{ minWidth: '22px', fontSize: '12.5px', fontWeight: 700, color: '#94a3b8' }}>
                  #{idx + 1}
                </div>

                <div style={{ flex: 1 }}>
                  <input
                    type="text"
                    value={item.name}
                    placeholder={
                      isEs
                        ? `Nombre del artículo #${idx + 1} (ej. Arreglo floral especial)`
                        : `Item Name #${idx + 1} (e.g., Special Floral Spray)`
                    }
                    onChange={(e) => handleCustomItemChange(idx, 'name', e.target.value)}
                    style={{
                      width: '100%',
                      border: 'none',
                      outline: 'none',
                      fontSize: '14px',
                      color: '#1e293b',
                      fontWeight: 500,
                      backgroundColor: 'transparent',
                    }}
                  />
                </div>

                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    backgroundColor: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    padding: '4px 10px',
                    flexShrink: 0,
                  }}
                >
                  <span style={{ fontWeight: 700, color: '#64748b', fontSize: '14px' }}>$</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    placeholder="0.00"
                    value={item.price}
                    onWheel={(e) => e.target.blur()}
                    onKeyDown={(e) => {
                      if (e.key === '-' || e.key === 'e' || e.key === 'E') {
                        e.preventDefault();
                      }
                    }}
                    onChange={(e) => handleCustomItemChange(idx, 'price', e.target.value)}
                    style={{
                      width: '80px',
                      border: 'none',
                      outline: 'none',
                      fontSize: '14.5px',
                      fontWeight: 700,
                      color: '#0f172a',
                      textAlign: 'right',
                      backgroundColor: 'transparent',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ================= SECTION D: BOTTOM NAVIGATION & DYNAMIC STEP TOTAL ================= */}
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
          ← {t('common.back', isEs ? 'Atrás' : 'Back')}
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
              {isEs ? 'Total de esta Sección' : 'Step Total'}
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
              {formatMoney(stepTotal.grandTotal)}
            </div>
            {stepTotal.guaranteedTaxSum > 0 && (
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#16a34a',
                  marginTop: '1px',
                }}
              >
                ({isEs ? 'Incluye' : 'Includes'} {formatMoney(stepTotal.guaranteedTaxSum)} {isEs ? 'impuesto garantizado' : '11% tax'})
              </div>
            )}
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
            {t('common.continue', isEs ? 'Continuar →' : 'Continue →')}
          </Button>
        </div>
      </div>
    </div>
  );
}
