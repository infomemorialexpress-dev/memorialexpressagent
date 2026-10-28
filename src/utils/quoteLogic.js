import {
  SERVICES,
  CASKET_TYPES,
  CREM_TYPES,
  defaultAddons,
  CATALOG_CASKETS
} from './legacyData.js';
import { TRANSLATIONS } from './translationsData.js';

export {
  SERVICES,
  CASKET_TYPES,
  CREM_TYPES,
  defaultAddons,
  CATALOG_CASKETS
};

// Cash formatting
export function formatMoney(amount) {
  if (typeof amount === 'string') {
    const trimmed = amount.trim();
    const cleaned = trimmed.replace(/[\$,]/g, '');
    if (isNaN(Number(cleaned)) || cleaned === '') {
      if (trimmed.toLowerCase() === 'incl' || trimmed.toLowerCase() === 'included') {
        return '$ incl';
      }
      return trimmed.startsWith('$') ? trimmed : `$ ${trimmed}`;
    }
  }
  const num = Number(amount) || 0;
  return '$' + num.toLocaleString('en-US', {
    minimumFractionDigits: num % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2
  });
}

// Translation helper
const sortedTranslations = [...(TRANSLATIONS || [])].sort((a, b) => b[0].length - a[0].length);

export function t(text, lang = 'en', directEs = null) {
  if (lang !== 'es') return text;
  if (directEs) return directEs;
  if (!text || typeof text !== 'string') return text;

  let result = text;
  for (const [en, es] of sortedTranslations) {
    if (result.includes(en)) {
      result = result.split(en).join(es);
    }
  }
  return result;
}

// Database-level Dynamic Content Localization helper (English / Spanish)
export function getLocalizedText(item, field, currentLang = 'en') {
  if (!item) return '';
  if (typeof item === 'string') {
    return currentLang === 'es' ? t(item, currentLang) : item;
  }

  const isEs = currentLang === 'es';

  if (isEs) {
    // 1. Check explicit field_es (e.g. packageName_es, itemName_es, customName_es, category_es)
    if (field && item[`${field}_es`]) {
      return item[`${field}_es`];
    }
    // 2. Check dynamic translations object if present
    if (item.translations) {
      if (field && item.translations[field]?.es) return item.translations[field].es;
      if (item.translations.es) return item.translations.es;
    }
    // 3. Known entity Spanish fields
    if (field === 'packageName' && (item.packageName_es || item.name_es)) {
      return item.packageName_es || item.name_es;
    }
    if ((field === 'itemName' || field === 'name') && (item.itemName_es || item.name_es)) {
      return item.itemName_es || item.name_es;
    }
    if (field === 'category' && item.category_es) {
      return item.category_es;
    }
    if (item.customName_es) return item.customName_es;
    if (item.packageName_es) return item.packageName_es;
    if (item.itemName_es) return item.itemName_es;
    if (item.name_es) return item.name_es;
  }

  // Fallback to default English field
  if (field && item[field]) {
    const val = item[field];
    return isEs ? t(val, 'es') : val;
  }

  const defaultVal = item.packageName || item.itemName || item.name || item.title || item.label || '';
  return isEs ? t(defaultVal, 'es') : defaultVal;
}

// Check if service requires a casket
export function isCasketNeeded(service) {
  if (!service) return true;
  let category = '';
  if (typeof service === 'object') {
    category = String(service.category || '').toLowerCase();
    service = service.name || service.id || service._id || '';
  }
  const s = String(service).toLowerCase();

  if (category === 'cremation' && (s.includes('direct') || s.includes('memorial'))) {
    return false;
  }
  if (category === 'traditional' || category === 'ship-out') {
    return true;
  }

  // Pure cremations that don't need a casket
  if (s === 'direct_cremation' || s === 'memorial_cremation' || s.includes('direct cremation') || s.includes('memorial cremation')) {
    return false;
  }
  if (CASKET_TYPES.includes(service)) return true;
  if (s.includes('burial') || s.includes('traditional') || s.includes('funeral') || s.includes('two') || s.includes('one') || s.includes('ship') || s.includes('graveside') || s.includes('casket') || s.includes('complete')) {
    return true;
  }
  if (CREM_TYPES.includes(service) || s.includes('cremat')) {
    return false;
  }
  return true;
}

// Check if service is a cremation
export function isCremation(service) {
  if (!service) return false;
  if (typeof service === 'object') {
    if (String(service.category || '').toLowerCase().includes('cremat')) return true;
    service = service.name || service.id || '';
  }
  const s = String(service).toLowerCase();
  return CREM_TYPES.includes(service) || s.includes('cremat');
}

// Check if service is a ship out
export function isShipOut(service) {
  if (!service) return false;
  if (typeof service === 'object') {
    if (String(service.category || '').toLowerCase().includes('ship')) return true;
    service = service.name || service.id || '';
  }
  const s = String(service).toLowerCase();
  return service === 'ship_traditional' || service === 'ship_direct' || s.includes('ship');
}

export function resolveHomeSlug(homeOrId, db) {
  if (!homeOrId) return 'optima';
  let name = '';
  let id = '';
  if (typeof homeOrId === 'object') {
    name = (homeOrId.name || '').toLowerCase();
    id = String(homeOrId._id || homeOrId.id || '').toLowerCase();
  } else {
    id = String(homeOrId).toLowerCase();
    const homeObj = (db?.homes || []).find(h => String(h.id || h._id).toLowerCase() === id);
    if (homeObj) {
      name = (homeObj.name || '').toLowerCase();
    }
  }
  if (name.includes('western') || id === 'western') return 'western';
  if (name.includes('felipe') || name.includes('bagues') || id === 'felipe') return 'felipe';
  if (name.includes('murillo') || id === 'murillo') return 'murillo';
  return 'optima';
}

// Retrieve package entry from database
export function getPackage(db, homeId, service) {
  if (!db || !db.packages) return null;
  if (db.packages[`${homeId}|${service}`]) {
    return db.packages[`${homeId}|${service}`];
  }
  const slug = resolveHomeSlug(homeId, db);
  return db.packages[`${slug}|${service}`] || null;
}

// Check if service is direct cremation
export function isDirectCremation(service, selectedServiceObject = null) {
  const s = String(service || '').toLowerCase();
  const cat = String(selectedServiceObject?.category || '').toLowerCase();
  const pkgName = String(selectedServiceObject?.packageName || selectedServiceObject?.name || '').toLowerCase();
  return (
    s === 'direct_cremation' ||
    s.includes('direct cremation') ||
    cat === 'direct cremation' ||
    cat.includes('direct cremation') ||
    pkgName.includes('direct cremation') ||
    (cat === 'cremation' && pkgName.includes('direct'))
  );
}

// Check if casket matches the selected service package
export function casketMatchesPackage(casket, service, selectedServiceObject = null) {
  if (!casket) return false;
  const pkgs = casket.assignedPackages;
  if (!Array.isArray(pkgs) || pkgs.length === 0) {
    return true; // Available for all packages
  }

  const s = String(service || '').toLowerCase();
  const pkgName = String(selectedServiceObject?.packageName || selectedServiceObject?.name || '').toLowerCase();
  const cat = String(selectedServiceObject?.category || '').toLowerCase();

  return pkgs.some(p => {
    if (!p) return false;
    const pLower = String(p).toLowerCase().trim();

    if (pLower === s || pLower === pkgName || pLower === cat) return true;
    if (pkgName && (pkgName.includes(pLower) || pLower.includes(pkgName))) return true;

    if (pLower.includes('two') && (s === 'two_day' || pkgName.includes('two') || pkgName.includes('2 day'))) return true;
    if (pLower.includes('one') && (s === 'one_day' || pkgName.includes('one') || pkgName.includes('1 day'))) return true;
    if (pLower.includes('traditional cremation') && (s === 'traditional_cremation' || pkgName.includes('traditional cremation'))) return true;
    if (pLower.includes('memorial cremation') && (s === 'memorial_cremation' || pkgName.includes('memorial cremation'))) return true;
    if (pLower.includes('direct cremation') && (s === 'direct_cremation' || pkgName.includes('direct cremation'))) return true;
    if ((pLower.includes('ship') || pLower.includes('forwarding')) && (isShipOut(s) || pkgName.includes('ship'))) return true;
    if (pLower.includes('traditional') && !pLower.includes('cremat') && (cat === 'traditional' || s === 'one_day' || s === 'two_day')) return true;

    return false;
  });
}

// Check casket eligibility strictly mapped to funeral home and package
export function isEligibleCasket(casket, homeId, service, db = null, selectedServiceObject = null) {
  if (!casket) return false;

  // 1. Strict Funeral Home Mapping
  let matchesHome = false;
  const assignedHome = casket.assignedFuneralHomeId || casket.funeralHomeId;
  if (assignedHome) {
    matchesHome = String(assignedHome) === String(homeId);
    if (!matchesHome && db?.homes) {
      const homeObj = db.homes.find(h => String(h.id || h._id) === String(homeId));
      if (homeObj && (String(homeObj._id) === String(assignedHome) || String(homeObj.id) === String(assignedHome))) {
        matchesHome = true;
      }
    }
  } else if (casket.assignment === 'Global (*)' || casket.assignment === '*' || casket.home === '*' || !casket.home) {
    matchesHome = true;
  } else {
    const slug = resolveHomeSlug(homeId, db);
    if (slug === 'murillo') {
      matchesHome = casket.home === 'murillo' || casket.home === 'optima';
    } else if (slug === 'western') {
      matchesHome = casket.home === 'western' || casket.home === 'optima';
    } else if (slug === 'felipe') {
      if (service === 'ship_direct' || service === 'ship_traditional') {
        matchesHome = Boolean(casket.id && casket.id.startsWith('felipe_ship_'));
      } else {
        matchesHome = (casket.home === 'felipe' && !casket.id.startsWith('felipe_ship_')) || casket.home === 'optima';
      }
    } else {
      matchesHome = casket.home === 'optima' || casket.home === '*' || !casket.home || String(casket.home) === String(homeId);
    }
  }

  if (!matchesHome) return false;

  // 2. Strict Service Package Mapping
  return casketMatchesPackage(casket, service, selectedServiceObject);
}

// Get matched location for a funeral home
export function getMatchedLocation(home, searchLocation) {
  if (!home) return null;
  const locations = home.locations && home.locations.length
    ? home.locations
    : (home.chapels && home.chapels.length
        ? home.chapels
        : [{ city: home.city, zip: home.zipCode || home.zip, county: home.county, surcharge: 0 }]);

  if (!searchLocation) return locations[0] || null;
  const q = searchLocation.trim().toLowerCase();
  return locations.find(l =>
    (l.city && l.city.toLowerCase().includes(q)) ||
    (l.zip && String(l.zip).includes(q)) ||
    (l.county && l.county.toLowerCase().includes(q))
  ) || locations[0];
}

// Core Mathematical State Logic for MemorialExpress
export function calculateQuote(q, db) {
  const h = q.home;
  const homeObj = q.selectedHomeObj || (db?.homes || []).find(x => x.id === h || x._id === h) || null;
  const pkgFromDb = getPackage(db, h, q.service);
  const p = {
    section1: q.selectedServiceObject?.section1Price !== null && q.selectedServiceObject?.section1Price !== undefined
      ? Number(q.selectedServiceObject.section1Price)
      : (pkgFromDb?.section1 ?? 0),
    section2: q.selectedServiceObject?.section2Price !== null && q.selectedServiceObject?.section2Price !== undefined
      ? Number(q.selectedServiceObject.section2Price)
      : (pkgFromDb?.section2 ?? 0),
  };
  const allCaskets = db.caskets || [];
  let casket = allCaskets.find(x => (x.id === q.casket || x._id === q.casket) && isEligibleCasket(x, h, q.service, db, q.selectedServiceObject));
  if (!casket && q.selectedCasketObject) {
    casket = {
      ...q.selectedCasketObject,
      price: q.selectedCasketObject.listPrice ?? q.selectedCasketObject.price ?? 0
    };
  }
  if (casket) {
    const casketOverride = q.priceOverrides?.[casket.id] ?? q.priceOverrides?.[casket._id] ?? q.casketPrice;
    if (casketOverride !== undefined && casketOverride !== null && casketOverride !== '') {
      casket = { ...casket, price: Math.max(0, Number(casketOverride) || 0) };
    }
  }

  const homeSlug = resolveHomeSlug(h, db);
  const westernDirectCremation = false;
  const westernRentalCasket = 0;
  const optimaRentalCasket = 0;
  const brassUrn = 0;
  const felipeRental = 0;
  const felipeAlternative = 0;
  const felipeAirTray = 0;

  // Urn calculation from live quote state
  let urn = Number(q.urnAllowance) || 0;

  const alternativeContainer = Number(q.alternativeContainer) || 0;

  // Addons filtering
  const allAddons = db.addons || [];
  const selectedAddonIds = q.addons || [];
  const overrides = q.priceOverrides || {};

  const activeAddons = allAddons.filter(a => {
    if (h === 'murillo' && a.home !== 'murillo') return false;
    if (h === 'felipe' && q.service === 'direct_cremation') return false;
    if (h === 'felipe' && q.service === 'memorial_cremation' && ['doves', 'escorts'].includes(a.id)) return false;
    if (h === 'felipe' && a.id === 'memorial') return false;
    if (h === 'optima' && q.service === 'direct_cremation') return false;
    if (h === 'western' ? (a.home !== 'western' && a.id !== 'air_tray') : a.home === 'western') return false;
    if (a.home !== '*' && a.home !== h) return false;

    if (q.service === 'ship_direct') {
      return h === 'murillo' ? selectedAddonIds.includes(a.id) : a.id === 'air_tray';
    }
    return selectedAddonIds.includes(a.id) || (a.id === 'air_tray' && q.service === 'ship_traditional');
  });

  const westernGuaranteed = activeAddons.filter(a =>
    a.id.startsWith('western_') &&
    !westernDirectCremation &&
    !(h === 'western' && q.service === 'memorial_cremation' && a.id === 'western_flower_spray')
  );
  const westernMemorialFlowers = h === 'western' && q.service === 'memorial_cremation' ? 250 : 0;

  const felipeGuaranteed = [];
  const felipeCashAddons = activeAddons.filter(a => a.home === 'felipe' && a.id.startsWith('felipe_'));

  const getItemPrice = a => {
    if (Object.prototype.hasOwnProperty.call(overrides, a.id)) {
      return Math.max(0, Number(overrides[a.id]) || 0);
    }
    return Math.max(0, Number(a.price) || 0);
  };

  const felipeGuaranteedPrice = felipeGuaranteed.reduce((tot, a) => tot + getItemPrice(a), 0);
  const westernGuaranteedPrice = westernGuaranteed.reduce((sum, a) => sum + getItemPrice(a), 0);

  const flower = activeAddons.find(a => a.id === 'flowers' || a.id === 'murillo_flowers' || a.id === 'felipe_flowers');
  const memorial = activeAddons.find(a => a.id === 'memorial');
  const escorts = activeAddons.find(a => a.id === 'escorts' || a.id === 'murillo_escort');
  const airTray = isShipOut(q.service) ? activeAddons.find(a => a.id === 'air_tray') : null;

  const flowersQty = flower ? Math.max(1, Math.floor(Number(q.flowersQty) || 1)) : 0;
  const escortQty = escorts ? Math.max(h === 'felipe' ? 2 : 1, Math.floor(Number(q.escortQty) || 1)) : 0;

  // Separate Guaranteed Add-ons (e.g., Memorial package with 11% tax)
  const isGuaranteedItem = (a) => {
    if (!a) return false;
    const id = String(a.id || '').toLowerCase();
    const name = String(a.name || '').toLowerCase();
    return a.type === 'Guaranteed' || !!a.isGuaranteed || id === 'memorial' || name.includes('memorial package');
  };

  const guaranteedAddons = Array.isArray(q.guaranteedAddons) && q.guaranteedAddons.length > 0
    ? q.guaranteedAddons
    : (Array.isArray(q.selectedAddonObjects)
        ? q.selectedAddonObjects.filter(isGuaranteedItem)
        : (selectedAddonIds.includes('memorial')
            ? [{ id: 'memorial', name: 'Memorial package — guest book, memorial cards & video', price: 395, unitPrice: 395, quantity: 1, totalPrice: 395, isGuaranteed: true }]
            : []));

  const guaranteedAddonsBasePrice = guaranteedAddons.reduce((tot, a) => tot + Number(a.totalPrice ?? a.price ?? 0), 0);
  const guaranteedAddonsTax = Math.round(guaranteedAddonsBasePrice * 0.11 * 100) / 100;

  // Breakdown of user non-guaranteed add-ons (strictly excluding guaranteed items)
  let added = [];
  if (Array.isArray(q.nonGuaranteedAddons) && q.nonGuaranteedAddons.length > 0) {
    added = q.nonGuaranteedAddons
      .filter(a => Number(a.totalPrice ?? a.price ?? 0) > 0 && !String(a.id || '').startsWith('western_') && !isGuaranteedItem(a))
      .map(a => {
        const qty = Number(a.quantity) || 1;
        const unit = Number(a.unitPrice ?? (a.quantity ? (a.price / a.quantity) : a.price) ?? 0);
        const total = Number(a.totalPrice ?? (qty * unit) ?? a.price ?? 0);
        return {
          id: a.id,
          name: qty > 1 ? `${a.name} (${qty} × ${formatMoney(unit)})` : a.name,
          price: total,
          unitPrice: unit,
          quantity: qty,
          taxable: false,
          isGuaranteed: false
        };
      });
  } else if (Array.isArray(q.selectedAddonObjects) && q.selectedAddonObjects.length > 0) {
    added = q.selectedAddonObjects
      .filter(a => Number(a.totalPrice ?? a.price ?? 0) > 0 && !String(a.id || '').startsWith('western_') && !isGuaranteedItem(a))
      .map(a => {
        const qty = Number(a.quantity) || 1;
        const unit = Number(a.unitPrice ?? (a.quantity ? (a.price / a.quantity) : a.price) ?? 0);
        const total = Number(a.totalPrice ?? (qty * unit) ?? a.price ?? 0);
        return {
          id: a.id,
          name: qty > 1 ? `${a.name} (${qty} × ${formatMoney(unit)})` : a.name,
          price: total,
          unitPrice: unit,
          quantity: qty,
          taxable: false,
          isGuaranteed: false
        };
      });
  } else {
    added = activeAddons
      .filter(a =>
        !['flowers', 'murillo_flowers', 'felipe_flowers', 'memorial', 'escorts', 'murillo_escort', 'air_tray'].includes(a.id) &&
        !a.id.startsWith('western_') &&
        !a.id.startsWith('felipe_') &&
        !isGuaranteedItem(a)
      )
      .map(a => ({
        id: a.id,
        name: a.name,
        price: h === 'felipe' && a.id === 'doves'
          ? (Object.prototype.hasOwnProperty.call(overrides, a.id) ? Math.max(0, Number(overrides[a.id]) || 0) : 350)
          : getItemPrice(a),
        taxable: false,
        isGuaranteed: false
      }));

    for (const a of felipeCashAddons) {
      added.push({ id: a.id, name: a.name, price: getItemPrice(a), taxable: false, isGuaranteed: false });
    }

    if (flower) {
      added.push({
        id: flower.id,
        name: `Flowers (${flowersQty} arrangement${flowersQty === 1 ? '' : 's'})`,
        price: getItemPrice(flower) * flowersQty,
        taxable: false,
        isGuaranteed: false
      });
    }

    if (escorts) {
      added.push({
        id: escorts.id,
        name: h === 'felipe'
          ? `Motorcycle escorts (${escortQty}; 10 vehicles, 25 miles included)`
          : `Funeral escorts (${escortQty})`,
        price: escortQty * (h === 'felipe' ? 200 : getItemPrice(escorts)),
        taxable: false,
        isGuaranteed: false
      });
    }
  }

  const certsCount = Math.max(1, Number(q.certs || q.deathCertCount || 1));
  const deathCertFee = Number(q.deathCertUnitPrice || 94);
  const dispositionPermitFee = Number(q.dispositionPermitFee || db.fees?.dispositionPermit || 12);
  const mandatory = dispositionPermitFee + (certsCount * deathCertFee);

  const memorialPrice = h === 'murillo' ? 0 : (memorial ? getItemPrice(memorial) : 0);
  const airTrayPrice = h === 'murillo'
    ? 0
    : (airTray ? (h === 'felipe' ? 250 : (h === 'western' ? 795 : getItemPrice(airTray))) : felipeAirTray);

  // Chapel location surcharge
  const matchedLoc = q.selectedChapel || getMatchedLocation(homeObj, q.location);
  const selectedChapel = q.selectedChapel || matchedLoc || null;
  const chapelExtra = Number(selectedChapel?.surcharge) || 0;

  // Section 1: Services (Guaranteed)
  const serviceS1 = q.selectedServiceObject?.section1Price ?? p.section1 ?? 0;
  const s1 = (Number(serviceS1) || 0) + chapelExtra;

  // Section 2: Merchandise (Guaranteed)
  const casketPrice = casket ? (casket.listPrice ?? casket.price ?? 0) : 0;
  const murilloCasket = h === 'murillo' && ['two_day', 'one_day'].includes(q.service) && casket
    ? Number(casketPrice) - Number(p.section2 || 0)
    : 0;

  const effectiveGuaranteedMerchandise = guaranteedAddonsBasePrice > 0 ? guaranteedAddonsBasePrice : memorialPrice;

  const s2 = (Number(p.section2) || 0) +
    (h === 'murillo' ? murilloCasket : casketPrice) +
    westernRentalCasket +
    optimaRentalCasket +
    felipeRental +
    alternativeContainer +
    brassUrn +
    effectiveGuaranteedMerchandise +
    airTrayPrice +
    westernGuaranteedPrice +
    felipeGuaranteedPrice;

  // Taxes
  const salesTax = h === 'felipe'
    ? Math.round((s2 - airTrayPrice) * 11) / 100 + Math.round(airTrayPrice * 0.11)
    : Math.round(s2 * 11) / 100;

  // Consulate / Ship Fees
  const consulateRate = h === 'murillo' ? 300 : (h === 'western' ? 995 : (h === 'felipe' ? 660 : 400));
  const airfarePrice = Math.max(0, Number(q.airfarePrice) || 0);
  const shipFees = isShipOut(q.service) ? consulateRate + airfarePrice : 0;
  const felipeShipCharges = h === 'felipe' && isShipOut(q.service) ? 10 : 0;
  const felipeCremationFee = h === 'felipe' && isCremation(q.service) ? 300 : 0;

  // Non-Guaranteed Total
  const ng = added.reduce((tot, a) => tot + a.price, 0) +
    mandatory +
    urn +
    salesTax +
    shipFees +
    westernMemorialFlowers +
    felipeShipCharges +
    felipeCremationFee;

  const total = s1 + s2 + ng;

  return {
    s1,
    s2,
    totalGuaranteed: s1 + s2,
    ng,
    total,
    casket,
    packageData: p,
    itemizedServices: q.selectedServiceObject?.itemizedServices || null,
    serviceObj: q.selectedServiceObject || null,
    homeObj,
    matchedLoc,
    chapelExtra,
    salesTax,
    mandatory,
    urn,
    deathCertFee,
    certsCount,
    dispositionPermitFee,
    shipFees,
    airfarePrice,
    consulateRate,
    felipeShipCharges,
    felipeCremationFee,
    westernRentalCasket,
    optimaRentalCasket,
    felipeRental,
    alternativeContainer,
    brassUrn,
    memorialPrice: effectiveGuaranteedMerchandise,
    guaranteedAddons,
    guaranteedAddonsTotal: guaranteedAddonsBasePrice,
    guaranteedAddonsTax,
    airTrayPrice,
    westernGuaranteed,
    felipeGuaranteed,
    selectedChapel,
    chapelExtra,
    chapelSurcharge: chapelExtra,
    visitationHours: q.selectedServiceObject?.visitationHours !== undefined
      ? Number(q.selectedServiceObject.visitationHours)
      : (pkgFromDb?.visitationHours ?? 3),
    addedAddons: added
  };
}

/**
 * Returns the dynamic 9-item Section 1 Itemized Services breakdown,
 * gross subtotal, package savings, and total services amount.
 */
export function getItemizedServicesList(packageObj, calculation, isEs = false, selectedChapelArg = null) {
  const itemized =
    packageObj?.itemizedServices ||
    calculation?.packageData?.itemizedServices ||
    calculation?.itemizedServices ||
    {};

  const parseNum = (val) => {
    if (val === undefined || val === null) return 0;
    if (typeof val === 'number') return isNaN(val) ? 0 : val;
    const cleaned = String(val).replace(/[\$,]/g, '').trim();
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  };

  const getDisplayAmount = (val) => {
    if (val === undefined || val === null || val === '') return null;
    if (typeof val === 'number') return null;
    const str = String(val).trim();
    const cleaned = str.replace(/[\$,]/g, '');
    if (cleaned !== '' && !isNaN(Number(cleaned))) return null;
    if (str.toLowerCase() === 'incl' || str.toLowerCase() === 'included') {
      return '$ incl';
    }
    return str.startsWith('$') ? str : `$ ${str}`;
  };

  const hasItemizedValues =
    itemized &&
    typeof itemized === 'object' &&
    Object.entries(itemized).some(([k, v]) => {
      if (k === 'otherServices') return false;
      if (v === undefined || v === null) return false;
      const s = String(v).trim();
      return s !== '' && s !== '0';
    });

  const chapel = selectedChapelArg || calculation?.selectedChapel || null;
  const chapelSurcharge = Number(chapel?.surcharge) || 0;

  const hours = packageObj?.visitationHours !== undefined
    ? Number(packageObj.visitationHours)
    : (calculation?.packageData?.visitationHours !== undefined
      ? Number(calculation.packageData.visitationHours)
      : (calculation?.serviceObj?.visitationHours !== undefined
        ? Number(calculation.serviceObj.visitationHours)
        : (calculation?.visitationHours !== undefined
          ? Number(calculation.visitationHours)
          : 3)));

  const visitationDesc = isEs
    ? `Velación (${hours} horas)`
    : `Visitation (${hours} hours)`;

  let arrangements = parseNum(itemized.arrangements);
  let transfer = parseNum(itemized.transfer);
  let embalming = parseNum(itemized.embalming);
  let otherPreparation = parseNum(itemized.otherPreparation);
  let visitation = parseNum(itemized.visitation);
  let funeralService = parseNum(itemized.funeralService);
  let funeralCoach = parseNum(itemized.funeralCoach);
  let utilityVehicles = parseNum(itemized.utilityVehicles);
  let packageSavings = parseNum(itemized.packageSavings);

  const directS1 = Number(
    calculation?.packageData?.section1 ||
    packageObj?.section1Price ||
    0
  );

  if (!hasItemizedValues) {
    // If not explicitly itemized, use standard baseline with dynamic package savings
    const targetTotal = directS1 > 0 ? directS1 : 3395.0;
    arrangements = 2050.0;
    transfer = 695.0;
    embalming = 525.0;
    otherPreparation = 200.0;
    visitation = 300.0;
    funeralService = 150.0;
    funeralCoach = 375.0;
    utilityVehicles = 100.0;
    const gross = 4395.0;
    packageSavings = Math.round((gross - targetTotal) * 100) / 100;
  }

  const customOtherRows = Array.isArray(itemized.otherServices)
    ? itemized.otherServices
        .filter(o => o && (o.name || o.customName_es || o.name_es) && String(o.name || o.customName_es || o.name_es).trim() !== '')
        .map((o, idx) => {
          const rawDesc = isEs
            ? (o.customName_es || o.name_es || t(o.name, 'es') || o.name)
            : (o.name || o.customName_es || o.name_es);
          return {
            key: `otherService_${idx}`,
            desc: String(rawDesc).trim(),
            amount: parseNum(o.price),
            displayAmount: getDisplayAmount(o.price),
            rawAmount: o.price
          };
        })
    : [];

  const customOtherTotal = customOtherRows.reduce((sum, r) => sum + r.amount, 0);

  const grossTotal =
    arrangements +
    transfer +
    embalming +
    otherPreparation +
    visitation +
    funeralService +
    funeralCoach +
    utilityVehicles +
    customOtherTotal +
    chapelSurcharge;

  const totalServices = Math.max(0, grossTotal - packageSavings);

  const formatRow = (key, desc, rawVal, defaultAmt) => {
    const val = rawVal !== undefined ? rawVal : defaultAmt;
    return {
      key,
      desc,
      amount: parseNum(val),
      displayAmount: getDisplayAmount(val),
      rawAmount: val
    };
  };

  const rows = [
    formatRow('arrangements', isEs ? 'Arreglos y servicios del personal profesional' : 'Arrangements and professional staff', itemized.arrangements, arrangements),
    formatRow('transfer', isEs ? 'Traslado del difunto (25 millas)' : 'Transfer (25 miles)', itemized.transfer, transfer),
    formatRow('embalming', isEs ? 'Embalsamamiento / refrigeración' : 'Embalming / refrigeration', itemized.embalming, embalming),
    formatRow('otherPreparation', isEs ? 'Otra preparación' : 'Other preparation', itemized.otherPreparation, otherPreparation),
    formatRow('visitation', visitationDesc, itemized.visitation, visitation),
    formatRow('funeralService', isEs ? 'Servicio funerario / memorial' : 'Funeral/memorial service', itemized.funeralService, funeralService),
    formatRow('funeralCoach', isEs ? 'Carroza funeraria' : 'Funeral coach', itemized.funeralCoach, funeralCoach),
    formatRow('utilityVehicles', isEs ? 'Vehículos utilitarios / otros' : 'Utility vehicles / other', itemized.utilityVehicles, utilityVehicles),
    ...customOtherRows,
    ...(chapelSurcharge > 0 ? [{
      key: 'chapelSurcharge',
      desc: isEs
        ? `Recargo de Capilla: ${chapel?.name || chapel?.city || 'Capilla Seleccionada'}`
        : `Chapel Surcharge: ${chapel?.name || chapel?.city || 'Selected Chapel'}`,
      amount: chapelSurcharge
    }] : []),
    { key: 'packageSavings', desc: isEs ? 'Ahorro de paquete' : 'Package savings', amount: -Math.abs(packageSavings), isSavings: true },
  ];

  return {
    rows,
    grossTotal,
    packageSavings,
    totalServices,
  };
}
