import axiosInstance from './axiosInstance';
import { API_CONFIG } from '../../config/api.config';
import {
  Visit,
  CheckInVisitRequest,
  CheckOutVisitRequest,
  UpdateVisitRequest,
  VisitListRequest,
  SyncOfflineVisitsResult,
  SampleInventoryItem,
} from '../../types/visit.types';
import { ApiResponse, PaginatedResponse } from '../../types/api.types';

class VisitApi {
  async checkIn(data: CheckInVisitRequest): Promise<Visit> {
    const response = await axiosInstance.post<ApiResponse<Visit>>(
      API_CONFIG.ENDPOINTS.VISITS_CHECK_IN,
      data
    );
    return response.data.data;
  }

  async checkOut(data: CheckOutVisitRequest): Promise<Visit> {
    const response = await axiosInstance.post<ApiResponse<Visit>>(
      API_CONFIG.ENDPOINTS.VISITS_CHECK_OUT,
      data
    );
    return response.data.data;
  }

  async getVisits(params: VisitListRequest): Promise<PaginatedResponse<Visit>> {
    const response = await axiosInstance.get<ApiResponse<PaginatedResponse<Visit>>>(
      API_CONFIG.ENDPOINTS.VISITS,
      { params }
    );
    return response.data.data;
  }

  async getTodayVisits(): Promise<Visit[]> {
    const response = await axiosInstance.get<ApiResponse<Visit[]>>(
      API_CONFIG.ENDPOINTS.VISITS_TODAY
    );
    return response.data.data;
  }

  async getVisitById(id: string): Promise<Visit> {
    const response = await axiosInstance.get<ApiResponse<Visit>>(
      `${API_CONFIG.ENDPOINTS.VISITS}/${id}`
    );
    return response.data.data;
  }

  async updateVisit(id: string, data: UpdateVisitRequest): Promise<Visit> {
    const response = await axiosInstance.put<ApiResponse<Visit>>(
      `${API_CONFIG.ENDPOINTS.VISITS}/${id}`,
      data
    );
    return response.data.data;
  }

  async deleteVisit(id: string): Promise<void> {
    await axiosInstance.delete(`${API_CONFIG.ENDPOINTS.VISITS}/${id}`);
  }

  async syncOfflineVisits(visits: Visit[]): Promise<SyncOfflineVisitsResult> {
    const response = await axiosInstance.post<ApiResponse<SyncOfflineVisitsResult>>(
      API_CONFIG.ENDPOINTS.VISITS_SYNC_OFFLINE,
      { visits }
    );
    return response.data.data;
  }

  async canCheckIn(): Promise<boolean> {
    const response = await axiosInstance.get<ApiResponse<{ canCheckIn: boolean }>>(
      `${API_CONFIG.ENDPOINTS.VISITS}/can-check-in`
    );
    return response.data.data.canCheckIn;
  }

  async getSampleInventory(): Promise<SampleInventoryItem[]> {
    const response = await axiosInstance.get<ApiResponse<SampleInventoryItem[]>>(
      API_CONFIG.ENDPOINTS.VISITS_SAMPLE_INVENTORY
    );
    return response.data.data;
  }
}

export default new VisitApi();
