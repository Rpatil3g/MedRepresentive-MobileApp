import axiosInstance from './axiosInstance';
import { API_CONFIG } from '../../config/api.config';
import { Expense, CreateExpenseRequest, CreateExpenseBatchRequest, UpdateExpenseRequest } from '../../types/expense.types';

class ExpenseApi {
  async createExpense(data: CreateExpenseRequest): Promise<Expense> {
    const response = await axiosInstance.post<any>(
      API_CONFIG.ENDPOINTS.EXPENSES,
      data
    );
    return response.data?.data ?? response.data;
  }

  /** All-or-nothing: either every category is saved or none. */
  async createExpenses(data: CreateExpenseBatchRequest): Promise<Expense[]> {
    const response = await axiosInstance.post<any>(
      API_CONFIG.ENDPOINTS.EXPENSES_BATCH,
      data
    );
    return response.data?.data ?? response.data ?? [];
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

  /**
   * The MR's own expenses. Dates are 'yyyy-MM-dd' expense dates: `date` for one day, or
   * `fromDate`/`toDate` (inclusive). `status` is a comma-separated list, e.g. 'Rejected,Pending'.
   */
  async getMyExpenses(params?: {
    date?: string;
    fromDate?: string;
    toDate?: string;
    status?: string;
  }): Promise<Expense[]> {
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
