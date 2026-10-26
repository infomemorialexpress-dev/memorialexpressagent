// Base API Client and Shared Utilities for MemorialExpress Agent Portal

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
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.homes)) {
          return parsed;
        }
      }
    }
  } catch (err) {
    console.warn('[Agent apiClient] Failed to parse localStorage db:', err);
  }
  return { homes: [], caskets: [], addons: [], packages: {}, fees: {} };
}

