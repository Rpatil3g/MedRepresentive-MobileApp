import AsyncStorage from '@react-native-async-storage/async-storage';

export const STORAGE_KEYS = {
  AUTH_TOKEN: '@auth_token',
  REFRESH_TOKEN: '@refresh_token',
  USER_PROFILE: '@user_profile',
  MR_PROFILE: '@mr_profile',
  DEVICE_ID: '@device_id',
  OFFLINE_VISITS: '@offline_visits',
  OFFLINE_DCR: '@offline_dcr',
  LAST_SYNC: '@last_sync',
};

class StorageService {
  // Generic Methods
  async setItem<T>(key: string, value: T): Promise<void> {
    try {
      const jsonValue = JSON.stringify(value);
      await AsyncStorage.setItem(key, jsonValue);
    } catch (error) {
      console.error('StorageService setItem error:', error);
      throw error;
    }
  }

  async getItem<T>(key: string): Promise<T | null> {
    try {
      const jsonValue = await AsyncStorage.getItem(key);
      return jsonValue != null ? JSON.parse(jsonValue) : null;
    } catch (error) {
      console.error('StorageService getItem error:', error);
      return null;
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('StorageService removeItem error:', error);
      throw error;
    }
  }

  async clear(): Promise<void> {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.error('StorageService clear error:', error);
      throw error;
    }
  }

  // Auth Specific Methods
  async setAuthToken(token: string): Promise<void> {
    await this.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
  }

  async getAuthToken(): Promise<string | null> {
    return await this.getItem<string>(STORAGE_KEYS.AUTH_TOKEN);
  }

  async setRefreshToken(token: string): Promise<void> {
    await this.setItem(STORAGE_KEYS.REFRESH_TOKEN, token);
  }

  async getRefreshToken(): Promise<string | null> {
    return await this.getItem<string>(STORAGE_KEYS.REFRESH_TOKEN);
  }

  async clearAuthTokens(): Promise<void> {
    await this.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    await this.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
  }

  // User Profile Methods
  async setUserProfile(profile: any): Promise<void> {
    await this.setItem(STORAGE_KEYS.USER_PROFILE, profile);
  }

  async getUserProfile(): Promise<any | null> {
    return await this.getItem(STORAGE_KEYS.USER_PROFILE);
  }

  async setMRProfile(profile: any): Promise<void> {
    await this.setItem(STORAGE_KEYS.MR_PROFILE, profile);
  }

  async getMRProfile(): Promise<any | null> {
    return await this.getItem(STORAGE_KEYS.MR_PROFILE);
  }

  // Device ID
  async setDeviceId(deviceId: string): Promise<void> {
    await this.setItem(STORAGE_KEYS.DEVICE_ID, deviceId);
  }

  async getDeviceId(): Promise<string | null> {
    return await this.getItem<string>(STORAGE_KEYS.DEVICE_ID);
  }

  // Offline Data
  async getOfflineVisits(): Promise<any[]> {
    const visits = await this.getItem<any[]>(STORAGE_KEYS.OFFLINE_VISITS);
    return visits || [];
  }

  async addOfflineVisit(visit: any): Promise<void> {
    const visits = await this.getOfflineVisits();
    visits.push(visit);
    await this.setItem(STORAGE_KEYS.OFFLINE_VISITS, visits);
  }

  async clearOfflineVisits(): Promise<void> {
    await this.removeItem(STORAGE_KEYS.OFFLINE_VISITS);
  }

  async setLastSync(timestamp: string): Promise<void> {
    await this.setItem(STORAGE_KEYS.LAST_SYNC, timestamp);
  }

  async getLastSync(): Promise<string | null> {
    return await this.getItem<string>(STORAGE_KEYS.LAST_SYNC);
  }
}

export default new StorageService();
