import axiosInstance from './axiosInstance';
import { API_CONFIG } from '../../config/api.config';
import { Expense, CreateExpenseRequest, UpdateExpenseRequest } from '../../types/expense.types';

class ExpenseApi {
  async createExpense(data: CreateExpenseRequest): Promise<Expense> {
    const response = await axiosInstance.post<any>(
      API_CONFIG.ENDPOINTS.EXPENSES,
      data
    );
    return response.data?.data ?? response.data;
  }

  async getExpenseById(id: string): Promise<Expense> {
    const response = await axiosInstance.get<any>(
      `${API_CONFIG.ENDPOINTS.EXPENSES}/${id}`
    );
    return response.data?.data ?? response.data;
  }

  async updateExpense(id: string, data: UpdateExpenseRequest): Promise<Expense> {
    const response = await axiosInstance.put<any>(
      `${API_CONFIG.ENDPOINTS.EXPENSES}/${id}`,
      data
    );
    return response.data?.data ?? response.data;
  }

  async getMyExpenses(params?: { date?: string }): Promise<Expense[]> {
    const response = await axiosInstance.get<any>(
      API_CONFIG.ENDPOINTS.EXPENSES_MY_EXPENSES,
      params ? { params } : undefined
    );
    return response.data?.data ?? response.data ?? [];
  }

  async deleteExpense(id: string): Promise<void> {
    await axiosInstance.delete(`${API_CONFIG.ENDPOINTS.EXPENSES}/${id}`);
  }
}

export default new ExpenseApi();
