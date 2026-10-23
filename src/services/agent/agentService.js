// Agent Portal Read-Only API Services
import { getStoredDb, ApiError, formatErrorMessage } from '../base/apiClient.js';

export async function fetchAgentQuoteDb() {
  try {
    await new Promise(resolve => setTimeout(resolve, 80));
    const db = getStoredDb();
    if (!db || !Array.isArray(db.homes)) {
      throw new ApiError('Pricing catalog repository is currently unavailable.', 503);
    }
    return {
      success: true,
      db: JSON.parse(JSON.stringify(db))
    };
  } catch (error) {
    console.error('[agentService.fetchAgentQuoteDb] Error:', error);
    throw new ApiError(formatErrorMessage(error), error.status || 500);
  }
}

export async function fetchFuneralHomes() {
  try {
    await new Promise(resolve => setTimeout(resolve, 60));
    const db = getStoredDb();
    if (!db || !Array.isArray(db.homes)) {
      throw new ApiError('Funeral homes directory could not be loaded.', 503);
    }
    return {
      success: true,
      homes: [...db.homes]
    };
  } catch (error) {
    console.error('[agentService.fetchFuneralHomes] Error:', error);
    throw new ApiError(formatErrorMessage(error), error.status || 500);
  }
}

export async function fetchFuneralHomeById(homeId) {
  try {
    if (!homeId) {
      throw new ApiError('Funeral Home ID is required.', 400);
    }
    await new Promise(resolve => setTimeout(resolve, 40));
    const db = getStoredDb();
    const home = (db.homes || []).find(h => h.id === homeId);
    if (!home) {
      throw new ApiError(`Funeral home with ID "${homeId}" was not found.`, 404);
    }
    return {
      success: true,
      home: { ...home }
    };
  } catch (error) {
    console.error(`[agentService.fetchFuneralHomeById] Error for ${homeId}:`, error);
    throw new ApiError(formatErrorMessage(error), error.status || 500);
  }
}

export async function fetchMerchandise(homeId = null) {
  try {
    await new Promise(resolve => setTimeout(resolve, 70));
    const db = getStoredDb();
    const allCaskets = db.caskets || [];
    
    if (!homeId) {
      return { success: true, caskets: [...allCaskets] };
    }

    const filtered = allCaskets.filter(c => c.home === homeId || c.home === '*' || !c.home);
    return {
      success: true,
      caskets: filtered
    };
  } catch (error) {
    console.error('[agentService.fetchMerchandise] Error:', error);
    throw new ApiError(formatErrorMessage(error), error.status || 500);
  }
}

export async function fetchAddons(homeId = null) {
  try {
    await new Promise(resolve => setTimeout(resolve, 60));
    const db = getStoredDb();
    const allAddons = db.addons || [];

    const addons = homeId
      ? allAddons.filter(a => a.home === homeId || a.home === '*' || !a.home)
      : [...allAddons];

    return {
      success: true,
      addons,
      fees: { ...(db.fees || {}) }
    };
  } catch (error) {
    console.error('[agentService.fetchAddons] Error:', error);
    throw new ApiError(formatErrorMessage(error), error.status || 500);
  }
}

export async function fetchPackagePricing(homeId, serviceId) {
  try {
    if (!homeId || !serviceId) {
      throw new ApiError('Both homeId and serviceId are required to fetch package pricing.', 400);
    }
    await new Promise(resolve => setTimeout(resolve, 40));
    const db = getStoredDb();
    const key = `${homeId}|${serviceId}`;
    const pricing = db.packages?.[key] || null;

    return {
      success: true,
      pricing: pricing ? { ...pricing } : null
    };
  } catch (error) {
    console.error(`[agentService.fetchPackagePricing] Error for ${homeId}/${serviceId}:`, error);
    throw new ApiError(formatErrorMessage(error), error.status || 500);
  }
}
