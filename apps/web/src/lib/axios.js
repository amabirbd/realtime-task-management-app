import axios from 'axios';
import toast from 'react-hot-toast';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor - no token needed, using httpOnly cookies
api.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling and token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle token expiration
    if (error.response?.status === 401 && 
        error.response?.data?.code === 'TOKEN_EXPIRED' &&
        !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Try to refresh token
        await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1'}/auth/refresh`,
          {},
          { withCredentials: true }
        );

        // Retry original request
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed, redirect to login
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    // Show toast for errors
    const message = error.response?.data?.error || 'An error occurred';
    
    // Don't show toast for 401 on login page
    if (!(error.response?.status === 401 && window.location.pathname === '/login')) {
      toast.error(message);
    }

    return Promise.reject(error);
  }
);

export default api;
