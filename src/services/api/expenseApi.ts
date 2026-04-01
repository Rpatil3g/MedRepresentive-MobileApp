import axiosInstance from './axiosInstance';
import { API_CONFIG } from '../../config/api.config';

export interface CreateExpenseRequest {
  expenseDate: string;
  category: 'Travel' | 'Food' | 'Other';
  amount: number;
  description?: string;
}

export interface ExpenseResponse {
  id: string;
  expenseDate: string;
  category: string;
  amount: number;
  description?: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Paid';
  createdAt: string;
}

class ExpenseApi {
  async createExpense(data: CreateExpenseRequest): Promise<ExpenseResponse> {
    const response = await axiosInstance.post<any>(
      API_CONFIG.ENDPOINTS.EXPENSES,
      data
    );
    // Backend wraps response in ApiResponse<T> { data, message }
    return response.data?.data ?? response.data;
  }

  async getMyExpenses(): Promise<ExpenseResponse[]> {
    const response = await axiosInstance.get<any>(
      API_CONFIG.ENDPOINTS.EXPENSES_MY_EXPENSES
    );
    return response.data?.data ?? response.data ?? [];
  }
}

export default new ExpenseApi();
