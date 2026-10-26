// Agent Portal Live API Services strictly backed by MongoDB endpoints
import api from '../api.js';
import { ApiError, formatErrorMessage } from '../base/apiClient.js';

export async function fetchFuneralHomes() {
  try {
    const res = await api.get('/funeral-homes');
    const homes = Array.isArray(res.data) ? res.data : [];
    return {
      success: true,
      homes
    };
  } catch (error) {
    console.error('[agentService.fetchFuneralHomes] API Error:', error);
    throw new ApiError(formatErrorMessage(error), error.response?.status || 500);
  }
}

export async function fetchFuneralHomeById(homeId) {
  try {
    if (!homeId) {
      throw new ApiError('Funeral Home ID is required.', 400);
    }
    const res = await api.get(`/funeral-homes/${homeId}`);
    return {
      success: true,
      home: res.data
    };
  } catch (error) {
    console.error(`[agentService.fetchFuneralHomeById] API Error for ${homeId}:`, error);
    throw new ApiError(formatErrorMessage(error), error.response?.status || 500);
  }
}

export async function fetchMerchandise(homeId = null) {
  try {
    const endpoint = homeId
      ? `/catalog/location/${homeId}?type=CASKET&onlyActive=true`
      : '/catalog?type=CASKET';
    const res = await api.get(endpoint);
    const caskets = Array.isArray(res.data) ? res.data : [];
    return {
      success: true,
      caskets
    };
  } catch (error) {
    console.error('[agentService.fetchMerchandise] API Error:', error);
    throw new ApiError(formatErrorMessage(error), error.response?.status || 500);
  }
}

export async function fetchAddons(homeId = null) {
  try {
    const endpoint = homeId
      ? `/catalog/location/${homeId}?type=ADDON&onlyActive=true`
      : '/catalog?type=ADDON';
    const res = await api.get(endpoint);
    const addons = Array.isArray(res.data) ? res.data : [];
    return {
      success: true,
      addons,
      fees: {}
    };
  } catch (error) {
    console.error('[agentService.fetchAddons] API Error:', error);
    throw new ApiError(formatErrorMessage(error), error.response?.status || 500);
  }
}

export async function fetchPackagePricing(homeId, serviceId) {
  try {
    if (!homeId) {
      throw new ApiError('Funeral Home ID is required to fetch package pricing.', 400);
    }
    const res = await api.get(`/funeral-homes/${homeId}/packages`);
    const packages = Array.isArray(res.data) ? res.data : [];
    const matched = serviceId
      ? packages.find(p => (p.id === serviceId || p._id === serviceId || p.packageName === serviceId))
      : null;

    return {
      success: true,
      packages,
      pricing: matched || null
    };
  } catch (error) {
    console.error(`[agentService.fetchPackagePricing] API Error for ${homeId}:`, error);
    throw new ApiError(formatErrorMessage(error), error.response?.status || 500);
  }
}

export async function fetchAgentQuoteDb() {
  try {
    const [homesRes, casketsRes, addonsRes] = await Promise.all([
      api.get('/funeral-homes'),
      api.get('/catalog?type=CASKET'),
      api.get('/catalog?type=ADDON')
    ]);

    const homes = Array.isArray(homesRes.data) ? homesRes.data : [];
    const caskets = Array.isArray(casketsRes.data) ? casketsRes.data : [];
    const addons = Array.isArray(addonsRes.data) ? addonsRes.data : [];

    return {
      success: true,
      db: {
        homes,
        caskets,
        addons,
        packages: {},
        fees: {}
      }
    };
  } catch (error) {
    console.error('[agentService.fetchAgentQuoteDb] API Error:', error);
    throw new ApiError(formatErrorMessage(error), error.response?.status || 500);
  }
}
