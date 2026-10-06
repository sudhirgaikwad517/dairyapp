import axios from 'axios';

// Get base URL from environment or fallback to relative path for production
const baseURL = import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: graceful handling for auth/permission failures so pages
// that don't explicitly hide a button still fail clearly instead of silently/ugly.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    if (status === 401) {
      localStorage.removeItem('admin_token');
      if (!window.location.pathname.endsWith('/login')) {
        window.location.href = '/admin/login';
      }
    } else if (status === 403) {
      const message = error?.response?.data?.message || "You don't have permission to perform this action.";
      window.dispatchEvent(new CustomEvent('permission-denied', { detail: message }));
    }
    return Promise.reject(error);
  }
);
