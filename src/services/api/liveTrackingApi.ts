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
  /**
   * Sends one GPS ping. Returns false once the MR's day is closed (punched out, or auto-closed
   * by the server) — the caller should stop tracking.
   */
  updateLocation: async (data: GpsUpdatePayload): Promise<boolean> => {
    const response = await axiosInstance.post(API_CONFIG.ENDPOINTS.LIVE_TRACKING_UPDATE, data);
    return response.data?.trackingActive !== false;
  },
};

export default liveTrackingApi;
