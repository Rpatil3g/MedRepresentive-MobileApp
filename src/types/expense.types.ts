export type ExpenseCategory = 'Travel' | 'Food' | 'Other';
export type ExpenseStatus = 'Pending' | 'Approved' | 'Rejected' | 'Paid';

export interface Expense {
  id: string;
  expenseDate: string;
  category: ExpenseCategory;
  amount: number;
  description?: string;
  receiptUrl?: string;
  status: ExpenseStatus;
  approvalComments?: string;
  createdAt: string;
}

export interface CreateExpenseRequest {
  expenseDate: string;
  category: ExpenseCategory;
  amount: number;
  description?: string;
  receiptUrl?: string;
}

export interface UpdateExpenseRequest {
  expenseDate?: string;
  category?: ExpenseCategory;
  amount?: number;
  description?: string;
  receiptUrl?: string;
}
