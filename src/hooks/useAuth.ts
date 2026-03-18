import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import {
  loginStart,
  loginSuccess,
  loginFailure,
  logout as logoutAction,
} from '../store/slices/authSlice';
import { setMRProfile, clearMRProfile } from '../store/slices/userSlice';
import { authApi, profileApi } from '../services/api';
import { LoginRequest } from '../types/auth.types';
import { getDeviceId, getDeviceName } from '../utils/helpers';

// Returned by backend when user tries to log in from a different bound device
const DEVICE_MISMATCH_PHRASES = [
  'locked to another device',
  'contact administrator to reset device',
];

export const isDeviceMismatchError = (message: string): boolean =>
  DEVICE_MISMATCH_PHRASES.some(p => message.toLowerCase().includes(p));

export const useAuth = () => {
  const dispatch = useAppDispatch();
  const { isAuthenticated, user, loading, error } = useAppSelector((state) => state.auth);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        if (isAuthenticated && user) {
          const mrProfile = await profileApi.getMRProfile(user.id);
          dispatch(setMRProfile(mrProfile));
        }
      } catch (checkError) {
        console.error('Error checking auth status:', checkError);
      } finally {
        setInitializing(false);
      }
    };

    checkAuthStatus();
  }, [dispatch, isAuthenticated, user]);

  const login = async (email: string, password: string) => {
    try {
      dispatch(loginStart());

      const deviceId = await getDeviceId();
      const deviceModel = await getDeviceName(); // device model/name string

      const loginData: LoginRequest = {
        email,
        password,
        deviceId,
        deviceModel,
        deviceOs: Platform.OS, // "android" | "ios"
      };

      const response = await authApi.login(loginData);
      dispatch(loginSuccess(response));

      const mrProfile = await profileApi.getMRProfile(response.user.id);
      dispatch(setMRProfile(mrProfile));

      return { success: true as const };
    } catch (loginError: any) {
      const errorMessage =
        loginError?.response?.data?.message || 'Login failed. Please try again.';
      dispatch(loginFailure(errorMessage));
      return { success: false as const, error: errorMessage };
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (logoutError) {
      console.error('Logout error:', logoutError);
    } finally {
      dispatch(logoutAction());
      dispatch(clearMRProfile());
    }
  };

  const changePassword = async (
    currentPassword: string,
    newPassword: string,
    confirmPassword: string
  ) => {
    try {
      await authApi.changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });
      return { success: true as const };
    } catch (changePasswordError: any) {
      const errorMessage =
        changePasswordError?.response?.data?.message ||
        'Failed to change password. Please try again.';
      return { success: false as const, error: errorMessage };
    }
  };

  return {
    isAuthenticated,
    user,
    loading,
    error,
    initializing,
    login,
    logout,
    changePassword,
  };
};

