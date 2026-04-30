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
};

// Visit Stack
export type VisitStackParamList = {
  VisitList: undefined;
  LogVisit: { doctorId?: string; chemistId?: string };
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

// More Stack
export type MoreStackParamList = {
  More: undefined;
  TaskList: undefined;
  TaskDetail: { taskId: string };
  ChangePassword: undefined;
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
