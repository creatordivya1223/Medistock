import axios from 'axios';

const rawApiUrl = import.meta.env.VITE_API_URL;

if (!rawApiUrl) {
  const errorMsg =
    '❌ Configuration Error: VITE_API_URL is missing! Please configure VITE_API_URL in your environment variables (e.g. in Vercel project settings or .env file).';
  console.error(errorMsg);
  throw new Error(errorMsg);
}

// Ensure baseURL doesn't end with a trailing slash to prevent double-slash path issues
const baseURL = rawApiUrl.replace(/\/+$/, '');

// ⚠️ TEMPORARY DEBUG: Startup log to verify resolved baseURL in browser console. Remove before final production release!
console.log('🔍 [DEBUG] MediStock API baseURL resolved to:', baseURL);

const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach Bearer token from localStorage
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle 401 Unauthorized and redirect
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const isLoginRequest = error.config?.url?.includes('/auth/login');
      if (!isLoginRequest) {
        localStorage.removeItem('token');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
