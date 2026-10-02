import axiosInstance from './axiosInstance';
import { API_CONFIG } from '../../config/api.config';
import { MyTargets } from '../../types/target.types';

class TargetApi {
  async getMyTargets(year: number, month: number): Promise<MyTargets> {
    const response = await axiosInstance.get<any>(API_CONFIG.ENDPOINTS.TARGETS_MY, {
      params: { year, month },
    });
    return response.data?.data ?? response.data;
  }

  /** Last N months, current month first. */
  async getMyHistory(months = 6): Promise<MyTargets[]> {
    const response = await axiosInstance.get<any>(API_CONFIG.ENDPOINTS.TARGETS_MY_HISTORY, {
      params: { months },
    });
    return response.data?.data ?? response.data ?? [];
  }
}

export default new TargetApi();
