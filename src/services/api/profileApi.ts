import axiosInstance from './axiosInstance';
import { API_CONFIG } from '../../config/api.config';
import { MedicalRepProfile } from '../../types/user.types';

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
}

export default new ProfileApi();
