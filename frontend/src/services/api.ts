/**
 * API Service
 * Axios instance with interceptors for authentication
 */

import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import type { ApiResponse } from '@/types';

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Enable cookies
});

// Request interceptor - Add auth token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token');

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors
api.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error) => {
    if (error.response) {
      // Handle 401 Unauthorized - Clear token and redirect to login
      if (error.response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }

      // Extract error message from response
      const message = error.response.data?.message || 'An error occurred';
      error.message = message;
    } else if (error.request) {
      error.message = 'Network error - please check your connection';
    }

    return Promise.reject(error);
  }
);

/**
 * API Service Methods
 */
export const apiService = {
  // Generic methods
  get: <T = any>(url: string, config = {}) =>
    api.get<ApiResponse<T>>(url, config),

  post: <T = any>(url: string, data = {}, config = {}) =>
    api.post<ApiResponse<T>>(url, data, config),

  put: <T = any>(url: string, data = {}, config = {}) =>
    api.put<ApiResponse<T>>(url, data, config),

  delete: <T = any>(url: string, config = {}) =>
    api.delete<ApiResponse<T>>(url, config),

  patch: <T = any>(url: string, data = {}, config = {}) =>
    api.patch<ApiResponse<T>>(url, data, config),
};

export default api;
