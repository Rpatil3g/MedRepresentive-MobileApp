import axiosInstance from './axiosInstance';
import { API_CONFIG } from '../../config/api.config';

export interface Stockist {
  id: string;
  stockistName: string;
  companyName?: string;
  contactPerson?: string;
  mobileNumber?: string;
  address?: string;
  city?: string;
  state?: string;
  latitude?: number;
  longitude?: number;
  isActive: boolean;
}

interface StockistListResponse {
  items: Stockist[];
  totalCount: number;
}

class StockistApi {
  async searchStockists(query: string): Promise<Stockist[]> {
    const response = await axiosInstance.get<StockistListResponse>(
      API_CONFIG.ENDPOINTS.STOCKISTS,
      { params: { searchTerm: query, pageSize: 20, isActive: true } },
    );
    return response.data?.items ?? [];
  }

  async getStockistById(id: string): Promise<Stockist> {
    const response = await axiosInstance.get<Stockist>(
      `${API_CONFIG.ENDPOINTS.STOCKISTS}/${id}`,
    );
    return response.data;
  }
}

export default new StockistApi();
