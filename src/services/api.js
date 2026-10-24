import axios from 'axios';

const DEFAULT_API_URL = 'https://memorialexpressbackend.onrender.com/api';
const formatApiUrl = (url) => {
  if (!url) return DEFAULT_API_URL;
  const trimmed = url.trim().replace(/\/+$/, '');
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
};
const BASE_URL = formatApiUrl(import.meta.env.VITE_API_URL || DEFAULT_API_URL);

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 25000,
});

// Automatically attach JWT Bearer token to request headers
api.interceptors.request.use(
  (config) => {
    try {
      const token = localStorage.getItem('memorial_agent_token') ||
                    localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      console.warn('[api] Error reading agent token from localStorage:', e);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for user-friendly error formatting
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      'An unexpected error occurred. Please try again.';

    error.userMessage = Array.isArray(message) ? message.join(', ') : message;
    return Promise.reject(error);
  }
);

export default api;
