import { NavigatorScreenParams } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

// Auth Stack
export type AuthStackParamList = {
  Login: undefined;
  ChangePassword: undefined;
};

// Main Tab Navigator (4 visible tabs + 4 hidden for quick-action navigation)
export type MainTabParamList = {
  Dashboard: undefined;
  TourPlan: NavigatorScreenParams<TourPlanStackParamList>;
  Products: NavigatorScreenParams<ProductStackParamList>;
  More: NavigatorScreenParams<MoreStackParamList>;
  // Hidden tabs — accessible via Dashboard quick actions
  Attendance: NavigatorScreenParams<AttendanceStackParamList>;
  Visits: NavigatorScreenParams<VisitStackParamList>;
  DCR: NavigatorScreenParams<DCRStackParamList>;
  Doctors: NavigatorScreenParams<DoctorStackParamList>;
  Expenses: NavigatorScreenParams<ExpenseStackParamList>;
  Orders: NavigatorScreenParams<OrderStackParamList>;
};

// Attendance Stack
export type AttendanceStackParamList = {
  AttendanceHome: undefined;
  AttendanceHistory: undefined;
};

// Tour Plan Stack
export type TourPlanStackParamList = {
  MTPCalendar: undefined;
  DayPlanForm: {
    date: string;
    month: number;
    year: number;
    existingEntry?: import('./tourPlan.types').DraftDayEntry;
    readOnly?: boolean;
  };
  MTPSummary: undefined;
};

// Product Stack
export type ProductStackParamList = {
  ProductList: undefined;
  ProductDetail: { productId: string };
};

// Doctor Stack
export type DoctorStackParamList = {
  DoctorList: undefined;
  DoctorDetail: { doctorId: string };
  AddDoctor: undefined;
  AddChemist: undefined;
  MySubmissions: undefined;
};

// Visit Stack
export type VisitStackParamList = {
  VisitList: undefined;
  // Pass one of doctorId / chemistId / stockistId to pre-select the party; fromPlan when it came
  // from today's call plan. returnTo: 'Dashboard' when opened from Home — saving goes back there
  LogVisit: {
    doctorId?: string;
    chemistId?: string;
    stockistId?: string;
    fromPlan?: boolean;
    returnTo?: 'Dashboard';
  };
  VisitDetail: { visitId: string };
  VisitEdit: { visitId: string };
};

// DCR Stack
export type DCRStackParamList = {
  DCRList: undefined;
  CreateDCR: { date?: string };
  DCRCalendar: undefined;
  VisitEdit: { visitId: string };
};

// Task Stack
export type TaskStackParamList = {
  TaskList: undefined;
  TaskDetail: { taskId: string };
};

// Expense Stack
export type ExpenseStackParamList = {
  // returnTo: 'DCR' when opened from the DCR screen — saving an expense goes back there
  ExpenseList: { date?: string; returnTo?: 'DCR' } | undefined;
  AddExpense: { date?: string; returnTo?: 'DCR' } | undefined;
  EditExpense: { expenseId: string };
};

// Order Stack
export type OrderStackParamList = {
  OrderList: undefined;
  /** From Log Visit: the visit's chemist or stockist is preselected and the order is linked to the visit. */
  BookOrder: {
    visitId?: string;
    chemistId?: string;
    stockistId?: string;
    partyName?: string;
  } | undefined;
  OrderDetail: { orderId: string };
  MyTargets: undefined;
};

// More Stack
export type MoreStackParamList = {
  More: undefined;
  TaskList: undefined;
  TaskDetail: { taskId: string };
  MyAttendance: undefined;
  ChangePassword: undefined;
  HelpSupport: undefined;
  About: undefined;
};

// Root Navigator
export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  MainTabs: NavigatorScreenParams<MainTabParamList>;
};

// Navigation Props
export type AuthNavigationProp = StackNavigationProp<AuthStackParamList>;
export type MainTabNavigationProp = BottomTabNavigationProp<MainTabParamList>;
export type DoctorNavigationProp = StackNavigationProp<DoctorStackParamList>;
export type VisitNavigationProp = StackNavigationProp<VisitStackParamList>;
export type DCRNavigationProp = StackNavigationProp<DCRStackParamList>;
