import axiosInstance from './axiosInstance';
import { API_CONFIG } from '../../config/api.config';
import {
  CreateOrderRequest,
  MyOrdersParams,
  Order,
  OrderSummary,
  PagedOrders,
} from '../../types/order.types';

class OrderApi {
  async createOrder(data: CreateOrderRequest): Promise<Order> {
    const response = await axiosInstance.post<any>(API_CONFIG.ENDPOINTS.ORDERS, data);
    return response.data?.data ?? response.data;
  }

  async getMyOrders(params?: MyOrdersParams): Promise<PagedOrders> {
    const response = await axiosInstance.get<any>(API_CONFIG.ENDPOINTS.ORDERS_MY, { params });
    return response.data?.data ?? response.data;
  }

  async getOrderById(id: string): Promise<Order> {
    const response = await axiosInstance.get<any>(`${API_CONFIG.ENDPOINTS.ORDERS}/${id}`);
    return response.data?.data ?? response.data;
  }

  async getMySummary(params?: { fromDate?: string; toDate?: string }): Promise<OrderSummary> {
    const response = await axiosInstance.get<any>(API_CONFIG.ENDPOINTS.ORDERS_SUMMARY, { params });
    return response.data?.data ?? response.data;
  }

  async cancelOrder(id: string, reason?: string): Promise<Order> {
    const response = await axiosInstance.post<any>(
      API_CONFIG.ENDPOINTS.ORDERS_CANCEL.replace('{id}', id),
      { reason },
    );
    return response.data?.data ?? response.data;
  }
}

export default new OrderApi();
