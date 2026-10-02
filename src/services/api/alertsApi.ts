import axiosInstance from './axiosInstance';
import { API_CONFIG } from '../../config/api.config';
import { RejectedCounts } from '../../store/slices/alertsSlice';

class AlertsApi {
  /** Rejected tour plans (this month on), DCRs (last 60 days) and expenses (last 90 days) the MR still has to fix. */
  async getRejectedCounts(): Promise<RejectedCounts> {
    const response = await axiosInstance.get<any>(API_CONFIG.ENDPOINTS.MEDICAL_REPS_REJECTED_COUNTS);
    const data = response.data?.data ?? response.data ?? {};
    return {
      tourPlans: data.tourPlans ?? 0,
      dcrs: data.dcrs ?? 0,
      expenses: data.expenses ?? 0,
    };
  }
}

export default new AlertsApi();
