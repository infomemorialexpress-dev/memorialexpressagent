// Base API Client and Read-only Persistence for MemorialExpress Agent Portal
import { LEGACY_DATA } from '../../utils/legacyData.js';

export const STORAGE_KEY = 'legacy_simple_v5';

export class ApiError extends Error {
  constructor(message, status = 500, details = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

export function formatErrorMessage(error) {
  if (typeof error === 'string') return error;
  if (error instanceof ApiError) return error.message;
  if (error?.message) return error.message;
  return 'An unexpected network error occurred. Please check your connection and try again.';
}

export function getStoredDb() {
  try {
    if (typeof localStorage !== 'undefined') {
      const raw = localStorage.getItem(STORAGE_KEY) ||
        localStorage.getItem('legacy_simple_v4') ||
        localStorage.getItem('legacy_simple_v3');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.homes) && parsed.homes.length > 0 && parsed.packages) {
          return parsed;
        }
      }
    }
  } catch (err) {
    console.warn('[Agent apiClient] Failed to parse localStorage db, fallback to initial DB', err);
  }
  return JSON.parse(JSON.stringify(LEGACY_DATA.initialDb));
}
