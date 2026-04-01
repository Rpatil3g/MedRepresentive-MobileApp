import axiosInstance from './axiosInstance';
import { API_CONFIG } from '../../config/api.config';
import { MedicalRepProfile, Territory } from '../../types/user.types';

class ProfileApi {
  async getMRProfile(userId: string): Promise<MedicalRepProfile> {
    const response = await axiosInstance.get<MedicalRepProfile>(
      `${API_CONFIG.ENDPOINTS.MEDICAL_REPS_BY_USER}/${userId}`
    );
    return response.data;
  }

  async updateMRProfile(id: string, data: Partial<MedicalRepProfile>): Promise<MedicalRepProfile> {
    const response = await axiosInstance.put<MedicalRepProfile>(
      `${API_CONFIG.ENDPOINTS.MEDICAL_REPS}/${id}`,
      data
    );
    return response.data;
  }

  async getMRTerritories(mrId: string): Promise<Territory[]> {
    const url = API_CONFIG.ENDPOINTS.MEDICAL_REPS_TERRITORIES.replace('{mrId}', mrId);
    const response = await axiosInstance.get<Territory[]>(url);
    return response.data;
  }
}

export default new ProfileApi();
