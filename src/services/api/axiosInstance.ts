import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { API_CONFIG } from '../../config/api.config';
import storageService from '../storage/storageService';
import { Platform } from 'react-native';
import { store } from '../../store/store';
import { logout, updateTokens } from '../../store/slices/authSlice';

const resolveBaseUrl = (): string => {
  if (Platform.OS === 'android' && API_CONFIG.BASE_URL.includes('localhost')) {
    return API_CONFIG.BASE_URL.replace('localhost', '10.0.2.2');
  }

  return API_CONFIG.BASE_URL;
};

// Create axios instance
const axiosInstance: AxiosInstance = axios.create({
  baseURL: `${resolveBaseUrl()}${API_CONFIG.PREFIX}`,
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
      
      return config;
    } catch (error) {
      return config;
    }
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest: any = error.config;
    
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
          
          const responseData = (response.data as any)?.data ?? response.data;
          const { token, refreshToken: newRefreshToken } = responseData;

          // Save new tokens to AsyncStorage and Redux state
          await storageService.setAuthToken(token);
          await storageService.setRefreshToken(newRefreshToken);
          store.dispatch(updateTokens({ token, refreshToken: newRefreshToken }));

          // Retry original request with new token
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return axiosInstance(originalRequest);
        }
      } catch (refreshError) {
        // Clear auth data and force logout
        await storageService.clearAuthTokens();
        store.dispatch(logout());

        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

export default axiosInstance;
