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

// Check if service requires a casket
export function isCasketNeeded(service) {
  if (!service) return true;
  if (typeof service === 'object') {
    service = service.name || service.category || service.id || service._id || '';
  }
  const s = String(service).toLowerCase();
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
  const s = String(service).toLowerCase();
  return CREM_TYPES.includes(service) || s.includes('cremat');
}

// Check if service is a ship out
export function isShipOut(service) {
  return service === 'ship_traditional' || service === 'ship_direct';
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

// Check casket eligibility
export function isEligibleCasket(casket, homeId, service, db = null) {
  if (!casket) return false;
  if (casket.assignment === 'Global (*)' || casket.assignment === '*' || casket.home === '*' || !casket.home) {
    return true;
  }
  const slug = resolveHomeSlug(homeId, db);
  if (slug === 'murillo') {
    return casket.home === 'murillo' || casket.home === 'optima';
  }
  if (slug === 'western') {
    return casket.home === 'western' || casket.home === 'optima';
  }
  if (slug === 'felipe') {
    if (service === 'ship_direct' || service === 'ship_traditional') {
      return casket.id && casket.id.startsWith('felipe_ship_');
    }
    return (casket.home === 'felipe' && !casket.id.startsWith('felipe_ship_')) || casket.home === 'optima';
  }
  // Optima or default
  return casket.home === 'optima' || casket.home === '*' || !casket.home;
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
  const homeObj = q.selectedHomeObj || (db.homes || []).find(x => x.id === h || x._id === h);
  const p = getPackage(db, h, q.service) || { section1: 0, section2: 0 };
  const allCaskets = db.caskets || [];
  let casket = allCaskets.find(x => (x.id === q.casket || x._id === q.casket) && isEligibleCasket(x, h, q.service, db));
  if (!casket && q.selectedCasketObject) {
    casket = {
      ...q.selectedCasketObject,
      price: q.selectedCasketObject.listPrice ?? q.selectedCasketObject.price ?? 0
    };
  }

  const homeSlug = resolveHomeSlug(h, db);
  const westernDirectCremation = homeSlug === 'western' && q.service === 'direct_cremation';
  const westernRentalCasket = homeSlug === 'western' && q.service === 'traditional_cremation' ? 800 : 0;
  const optimaRentalCasket = homeSlug === 'optima' && q.service === 'traditional_cremation' ? 700 : 0;
  const brassUrn = westernDirectCremation ? 395 : 0;
  const felipeRental = homeSlug === 'felipe' && q.service === 'traditional_cremation' ? 1095 : 0;
  const felipeAlternative = homeSlug === 'felipe' && ['memorial_cremation', 'direct_cremation'].includes(q.service) ? 225 : 0;
  const felipeAirTray = homeSlug === 'felipe' && isShipOut(q.service) ? 250 : 0;

  // Urn calculation
  let urn = 0;
  if (h === 'murillo') {
    urn = isCremation(q.service) ? Math.max(200, Number(q.urnAllowance) || 200) : 0;
  } else if (isCremation(q.service) && !westernDirectCremation) {
    const defaultUrnFee = db.fees?.urnAllowance || 300;
    urn = Math.max(h === 'felipe' ? 300 : 0, Number(q.urnAllowance !== '' && q.urnAllowance !== undefined ? q.urnAllowance : defaultUrnFee) || 0);
  }

  const alternativeContainer = h === 'murillo'
    ? 0
    : isCremation(q.service)
      ? (h === 'felipe' ? felipeAlternative : (h === 'western' ? 95 : 100))
      : 0;

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

  // Breakdown of user non-guaranteed add-ons
  let added = [];
  if (Array.isArray(q.selectedAddonObjects) && q.selectedAddonObjects.length > 0) {
    added = q.selectedAddonObjects
      .filter(a => Number(a.totalPrice ?? a.price ?? 0) > 0 && !String(a.id || '').startsWith('western_'))
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
          taxable: !!a.taxable
        };
      });
  } else {
    added = activeAddons
      .filter(a =>
        !['flowers', 'murillo_flowers', 'felipe_flowers', 'memorial', 'escorts', 'murillo_escort', 'air_tray'].includes(a.id) &&
        !a.id.startsWith('western_') &&
        !a.id.startsWith('felipe_')
      )
      .map(a => ({
        id: a.id,
        name: a.name,
        price: h === 'felipe' && a.id === 'doves'
          ? (Object.prototype.hasOwnProperty.call(overrides, a.id) ? Math.max(0, Number(overrides[a.id]) || 0) : 350)
          : getItemPrice(a),
        taxable: !!a.taxable
      }));

    for (const a of felipeCashAddons) {
      added.push({ id: a.id, name: a.name, price: getItemPrice(a), taxable: false });
    }

    if (flower) {
      added.push({
        id: flower.id,
        name: `Flowers (${flowersQty} arrangement${flowersQty === 1 ? '' : 's'})`,
        price: getItemPrice(flower) * flowersQty,
        taxable: !!flower.taxable
      });
    }

    if (escorts) {
      added.push({
        id: escorts.id,
        name: h === 'felipe'
          ? `Motorcycle escorts (${escortQty}; 10 vehicles, 25 miles included)`
          : `Funeral escorts (${escortQty})`,
        price: escortQty * (h === 'felipe' ? 200 : getItemPrice(escorts)),
        taxable: false
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
  const matchedLoc = getMatchedLocation(homeObj, q.location);
  const chapelExtra = matchedLoc?.surcharge || 0;

  // Section 1: Services (Guaranteed)
  const serviceS1 = q.selectedServiceObject?.section1Price ?? p.section1 ?? 0;
  const s1 = (Number(serviceS1) || 0) + chapelExtra;

  // Section 2: Merchandise (Guaranteed)
  const casketPrice = casket ? (casket.listPrice ?? casket.price ?? 0) : 0;
  const murilloCasket = h === 'murillo' && ['two_day', 'one_day'].includes(q.service) && casket
    ? Number(casketPrice) - Number(p.section2 || 0)
    : 0;

  const s2 = (Number(p.section2) || 0) +
    (h === 'murillo' ? murilloCasket : casketPrice) +
    westernRentalCasket +
    optimaRentalCasket +
    felipeRental +
    alternativeContainer +
    brassUrn +
    memorialPrice +
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
    memorialPrice,
    airTrayPrice,
    westernGuaranteed,
    felipeGuaranteed,
    addedAddons: added
  };
}
