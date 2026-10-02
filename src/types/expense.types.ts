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

/** Several categories for one day in one submit — saved as one expense per category. */
export interface CreateExpenseBatchRequest {
  expenseDate: string;
  items: Array<{ category: ExpenseCategory; amount: number }>;
  /** Shared note and receipt, copied to every record. */
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
