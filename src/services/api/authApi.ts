import axiosInstance from './axiosInstance';
import { API_CONFIG } from '../../config/api.config';
import {
  LoginRequest,
  LoginResponse,
  ChangePasswordRequest,
  RefreshTokenResponse,
  UserProfile,
} from '../../types/auth.types';
import { ApiResponse } from '../../types/api.types';
import storageService from '../storage/storageService';

class AuthApi {
  async login(data: LoginRequest): Promise<LoginResponse> {
    const response = await axiosInstance.post<ApiResponse<LoginResponse> | LoginResponse>(
      API_CONFIG.ENDPOINTS.LOGIN,
      data
    );

    const responseData = (response.data as ApiResponse<LoginResponse>)?.data
      ? (response.data as ApiResponse<LoginResponse>).data
      : (response.data as LoginResponse);

    // Store tokens in AsyncStorage
    const { token, refreshToken, user } = responseData;
    await storageService.setAuthToken(token);
    await storageService.setRefreshToken(refreshToken);
    await storageService.setUserProfile(user);

    return responseData;
  }

  async logout(): Promise<void> {
    try {
      await axiosInstance.post(API_CONFIG.ENDPOINTS.LOGOUT);
    } catch (error) {
      console.error('Logout API error:', error);
    } finally {
      // Clear tokens regardless of API response
      await storageService.clearAuthTokens();
      await storageService.clear();
    }
  }

  async changePassword(data: ChangePasswordRequest): Promise<void> {
    await axiosInstance.post(API_CONFIG.ENDPOINTS.CHANGE_PASSWORD, data);
  }

  async refreshToken(refreshToken: string): Promise<RefreshTokenResponse> {
    const response = await axiosInstance.post<
      ApiResponse<RefreshTokenResponse> | RefreshTokenResponse
    >(
      API_CONFIG.ENDPOINTS.REFRESH_TOKEN,
      { refreshToken }
    );

    const responseData = (response.data as ApiResponse<RefreshTokenResponse>)?.data
      ? (response.data as ApiResponse<RefreshTokenResponse>).data
      : (response.data as RefreshTokenResponse);

    // Update tokens in AsyncStorage
    const { token, refreshToken: newRefreshToken } = responseData;
    await storageService.setAuthToken(token);
    await storageService.setRefreshToken(newRefreshToken);

    return responseData;
  }

  async getCurrentUser(): Promise<UserProfile> {
    const response = await axiosInstance.get<ApiResponse<UserProfile> | UserProfile>(
      API_CONFIG.ENDPOINTS.CURRENT_USER
    );

    const responseData = (response.data as ApiResponse<UserProfile>)?.data
      ? (response.data as ApiResponse<UserProfile>).data
      : (response.data as UserProfile);

    await storageService.setUserProfile(responseData);

    return responseData;
  }
}

export default new AuthApi();
