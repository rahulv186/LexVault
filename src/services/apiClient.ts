import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('lexvault_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle 401s
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error) => {
    const requestUrl = error.config?.url || '';
    const isAuthAction = requestUrl.includes('/api/auth/login') || requestUrl.includes('/api/auth/register');

    if (error.response && error.response.status === 401 && !isAuthAction) {
      localStorage.removeItem('lexvault_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
