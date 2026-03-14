import { NavigatorScreenParams } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

// Auth Stack
export type AuthStackParamList = {
  Login: undefined;
  ChangePassword: undefined;
};

// Main Tab Navigator
export type MainTabParamList = {
  Dashboard: undefined;
  Doctors: NavigatorScreenParams<DoctorStackParamList>;
  Visits: NavigatorScreenParams<VisitStackParamList>;
  DCR: NavigatorScreenParams<DCRStackParamList>;
  More: undefined;
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
  VisitCheckIn: { doctorId?: string; chemistId?: string };
  VisitDetail: { visitId: string };
};

// DCR Stack
export type DCRStackParamList = {
  DCRList: undefined;
  CreateDCR: { date?: string };
  DCRDetail: { dcrId: string };
  DCRCalendar: undefined;
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
