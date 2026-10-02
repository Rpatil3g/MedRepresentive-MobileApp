/**
 * How far back (by expense date) a rejected expense still counts as "needs attention".
 * Must match RejectedExpenseWindowDays in the backend's MedicalRepService, which drives
 * the Expenses red dot.
 */
export const EXPENSE_ATTENTION_WINDOW_DAYS = 90;
