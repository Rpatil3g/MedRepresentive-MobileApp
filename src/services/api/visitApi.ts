import axiosInstance from './axiosInstance';
import { API_CONFIG } from '../../config/api.config';
import {
  Visit,
  CreateVisitRequest,
  CheckInVisitRequest,
  CheckOutVisitRequest,
  UpdateVisitRequest,
  VisitListRequest,
  SyncOfflineVisitsResult,
  SampleInventoryItem,
} from '../../types/visit.types';
import { PaginatedResponse } from '../../types/api.types';

class VisitApi {
  async createVisit(data: CreateVisitRequest): Promise<Visit> {
    const response = await axiosInstance.post<Visit>(
      API_CONFIG.ENDPOINTS.VISITS,
      data
    );
    return response.data;
  }

  async checkIn(data: CheckInVisitRequest): Promise<Visit> {
    const response = await axiosInstance.post<Visit>(
      API_CONFIG.ENDPOINTS.VISITS_CHECK_IN,
      data
    );
    return response.data;
  }

  async checkOut(data: CheckOutVisitRequest): Promise<Visit> {
    const response = await axiosInstance.post<Visit>(
      API_CONFIG.ENDPOINTS.VISITS_CHECK_OUT,
      data
    );
    return response.data;
  }

  async getVisits(params: VisitListRequest): Promise<PaginatedResponse<Visit>> {
    const response = await axiosInstance.get<PaginatedResponse<Visit>>(
      API_CONFIG.ENDPOINTS.VISITS,
      { params }
    );
    return response.data;
  }

  async getTodayVisits(): Promise<Visit[]> {
    const response = await axiosInstance.get<Visit[]>(
      API_CONFIG.ENDPOINTS.VISITS_TODAY
    );
    return response.data;
  }

  async getVisitById(id: string): Promise<Visit> {
    const response = await axiosInstance.get<Visit>(
      `${API_CONFIG.ENDPOINTS.VISITS}/${id}`
    );
    return response.data;
  }

  async updateVisit(id: string, data: UpdateVisitRequest): Promise<Visit> {
    const response = await axiosInstance.put<Visit>(
      `${API_CONFIG.ENDPOINTS.VISITS}/${id}`,
      data
    );
    return response.data;
  }

  async deleteVisit(id: string): Promise<void> {
    await axiosInstance.delete(`${API_CONFIG.ENDPOINTS.VISITS}/${id}`);
  }

  async syncOfflineVisits(visits: Visit[]): Promise<SyncOfflineVisitsResult> {
    const response = await axiosInstance.post<SyncOfflineVisitsResult>(
      API_CONFIG.ENDPOINTS.VISITS_SYNC_OFFLINE,
      { visits }
    );
    return response.data;
  }

  async canCheckIn(): Promise<boolean> {
    const response = await axiosInstance.get<{ canCheckIn: boolean }>(
      `${API_CONFIG.ENDPOINTS.VISITS}/can-check-in`
    );
    return response.data.canCheckIn;
  }

  async getSampleInventory(): Promise<SampleInventoryItem[]> {
    const response = await axiosInstance.get<SampleInventoryItem[]>(
      API_CONFIG.ENDPOINTS.VISITS_SAMPLE_INVENTORY
    );
    return response.data;
  }
}

export default new VisitApi();
