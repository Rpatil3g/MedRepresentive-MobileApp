import axiosInstance from './axiosInstance';
import { API_CONFIG } from '../../config/api.config';

export interface GpsUpdatePayload {
  latitude: number;
  longitude: number;
  timestamp: string;
  accuracy?: number;
  speed?: number;
  altitude?: number;
  activity?: string;
  batteryLevel?: number;
}

const liveTrackingApi = {
  updateLocation: async (data: GpsUpdatePayload): Promise<void> => {
    await axiosInstance.post(API_CONFIG.ENDPOINTS.LIVE_TRACKING_UPDATE, data);
  },
};

export default liveTrackingApi;
