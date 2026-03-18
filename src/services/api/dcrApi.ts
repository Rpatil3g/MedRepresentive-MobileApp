import axiosInstance from './axiosInstance';
import { API_CONFIG } from '../../config/api.config';
import {
  DailyCallReport,
  CreateDCRRequest,
  DCRListRequest,
  DCRCalendarDay,
  MonthlyDCRCalendar,
  DCRSummary,
} from '../../types/dcr.types';
import { ApiResponse, PaginatedResponse } from '../../types/api.types';

class DCRApi {
  async createDCR(data: CreateDCRRequest): Promise<DailyCallReport> {
    const response = await axiosInstance.post<ApiResponse<DailyCallReport>>(
      API_CONFIG.ENDPOINTS.DCR,
      data
    );
    return response.data.data;
  }

  async getMyDCRs(params: DCRListRequest): Promise<PaginatedResponse<DailyCallReport>> {
    const response = await axiosInstance.get<ApiResponse<PaginatedResponse<DailyCallReport>>>(
      API_CONFIG.ENDPOINTS.DCR_MY_DCRS,
      { params }
    );
    return response.data.data;
  }

  async getDCRByDate(date: string): Promise<DailyCallReport | null> {
    const response = await axiosInstance.get<ApiResponse<DailyCallReport>>(
      API_CONFIG.ENDPOINTS.DCR_BY_DATE,
      {
        params: { date },
        // 404 means there is no DCR for the requested date.
        // Treat it as a valid response and return null instead of throwing.
        validateStatus: (status) => status === 200 || status === 404,
      }
    );

    if (response.status === 404) {
      return null;
    }

    return response.data.data;
  }

  async getDCRById(id: string): Promise<DailyCallReport> {
    const response = await axiosInstance.get<ApiResponse<DailyCallReport>>(
      `${API_CONFIG.ENDPOINTS.DCR}/${id}`
    );
    return response.data.data;
  }

  async updateDCR(id: string, data: CreateDCRRequest): Promise<DailyCallReport> {
    const response = await axiosInstance.put<ApiResponse<DailyCallReport>>(
      `${API_CONFIG.ENDPOINTS.DCR}/${id}`,
      data
    );
    return response.data.data;
  }

  async submitDCR(id: string): Promise<DailyCallReport> {
    const url = API_CONFIG.ENDPOINTS.DCR_SUBMIT.replace('{id}', id);
    const response = await axiosInstance.post<ApiResponse<DailyCallReport>>(url);
    return response.data.data;
  }

  async deleteDCR(id: string): Promise<void> {
    await axiosInstance.delete(`${API_CONFIG.ENDPOINTS.DCR}/${id}`);
  }

  async getMonthlyCalendar(month: number, year: number): Promise<DCRCalendarDay[]> {
    const response = await axiosInstance.get<ApiResponse<MonthlyDCRCalendar>>(
      API_CONFIG.ENDPOINTS.DCR_CALENDAR,
      { params: { month, year } }
    );
    // Backend returns MonthlyDCRCalendarDto wrapper; extract the days array
    return response.data.data?.days ?? [];
  }

  async getDCRSummary(fromDate: string, toDate: string): Promise<DCRSummary> {
    const response = await axiosInstance.get<ApiResponse<DCRSummary>>(
      API_CONFIG.ENDPOINTS.DCR_SUMMARY,
      { params: { fromDate, toDate } }
    );
    return response.data.data;
  }

  async getMyPerformance(fromDate: string, toDate: string): Promise<any> {
    const response = await axiosInstance.get<ApiResponse<any>>(
      API_CONFIG.ENDPOINTS.DCR_PERFORMANCE,
      { params: { fromDate, toDate } }
    );
    return response.data.data;
  }
}

export default new DCRApi();
