import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { API_CONFIG } from '../../config/api.config';
import storageService from '../storage/storageService';

// Create axios instance
const axiosInstance: AxiosInstance = axios.create({
  baseURL: `${API_CONFIG.BASE_URL}${API_CONFIG.PREFIX}`,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// Request Interceptor
axiosInstance.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      // Get token from storage
      const token = await storageService.getAuthToken();
      
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      
      console.log('API Request:', {
        method: config.method?.toUpperCase(),
        url: config.url,
        params: config.params,
      });
      
      return config;
    } catch (error) {
      console.error('Request interceptor error:', error);
      return config;
    }
  },
  (error) => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// Response Interceptor
axiosInstance.interceptors.response.use(
  (response) => {
    console.log('API Response:', {
      status: response.status,
      url: response.config.url,
    });
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest: any = error.config;
    
    console.error('Response error:', {
      status: error.response?.status,
      url: originalRequest?.url,
      message: error.message,
    });
    
    // Handle 401 Unauthorized - Token expired
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const refreshToken = await storageService.getRefreshToken();
        
        if (refreshToken) {
          // Try to refresh token
          const response = await axios.post(
            `${API_CONFIG.BASE_URL}${API_CONFIG.PREFIX}${API_CONFIG.ENDPOINTS.REFRESH_TOKEN}`,
            { refreshToken }
          );
          
          const { token, refreshToken: newRefreshToken } = response.data.data;
          
          // Save new tokens
          await storageService.setAuthToken(token);
          await storageService.setRefreshToken(newRefreshToken);
          
          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return axiosInstance(originalRequest);
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        
        // Clear auth data and redirect to login
        await storageService.clearAuthTokens();
        // TODO: Dispatch logout action or navigate to login
        
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

export default axiosInstance;
