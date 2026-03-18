import axiosInstance from './axiosInstance';
import { API_CONFIG } from '../../config/api.config';
import { MedicalRepProfile, Territory } from '../../types/user.types';
import { ApiResponse } from '../../types/api.types';

class ProfileApi {
  async getMRProfile(userId: string): Promise<MedicalRepProfile> {
    const response = await axiosInstance.get<ApiResponse<MedicalRepProfile>>(
      `${API_CONFIG.ENDPOINTS.MEDICAL_REPS_BY_USER}/${userId}`
    );
    return response.data.data;
  }

  async updateMRProfile(id: string, data: Partial<MedicalRepProfile>): Promise<MedicalRepProfile> {
    const response = await axiosInstance.put<ApiResponse<MedicalRepProfile>>(
      `${API_CONFIG.ENDPOINTS.MEDICAL_REPS}/${id}`,
      data
    );
    return response.data.data;
  }

  async getMRTerritories(mrId: string): Promise<Territory[]> {
    const url = API_CONFIG.ENDPOINTS.MEDICAL_REPS_TERRITORIES.replace('{mrId}', mrId);
    const response = await axiosInstance.get<ApiResponse<Territory[]>>(url);
    return response.data.data;
  }
}

export default new ProfileApi();
