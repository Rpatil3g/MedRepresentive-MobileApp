import React from 'react';
import { TouchableOpacity } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import {
  MainTabParamList,
  DoctorStackParamList,
  VisitStackParamList,
  DCRStackParamList,
  MoreStackParamList,
  AttendanceStackParamList,
  TourPlanStackParamList,
} from '../types/navigation.types';
import { ROUTES } from '../constants/routes';
import { COLORS } from '../constants/colors';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

// Dashboard
import DashboardScreen from '../screens/home/DashboardScreen';

// Doctor Screens
import DoctorListScreen from '../screens/doctors/DoctorListScreen';
import DoctorDetailScreen from '../screens/doctors/DoctorDetailScreen';
import AddDoctorScreen from '../screens/doctors/AddDoctorScreen';

// Visit Screens
import { VisitListScreen, VisitCheckInScreen, VisitDetailScreen, VisitCheckOutScreen } from '../screens/visits';

// DCR Screens
import { DCRListScreen, CreateDCRScreen, DCRCalendarScreen, DCRDetailScreen } from '../screens/dcr';

// Task Screens
import { TaskListScreen, TaskDetailScreen } from '../screens/tasks';

// More Screen
import { MoreScreen } from '../screens/more';

// Attendance Screens
import { AttendanceScreen, AttendanceHistoryScreen } from '../screens/attendance';

// Tour Plan Screens
import { MTPCalendarScreen, DayPlanFormScreen, MTPSummaryScreen } from '../screens/tourplan';

// Auth screens used in More stack
import ChangePasswordScreen from '../screens/auth/ChangePasswordScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();
const DoctorStack = createStackNavigator<DoctorStackParamList>();
const VisitStack = createStackNavigator<VisitStackParamList>();
const DCRStack = createStackNavigator<DCRStackParamList>();
const MoreStack = createStackNavigator<MoreStackParamList>();
const AttendanceStack = createStackNavigator<AttendanceStackParamList>();
const TourPlanStack = createStackNavigator<TourPlanStackParamList>();

const headerOptions = {
  headerShown: true,
  headerStyle: {
    backgroundColor: COLORS.primary,
  },
  headerTintColor: COLORS.textWhite,
  headerTitleStyle: {
    fontWeight: '600' as const,
  },
};

const DoctorStackNavigator: React.FC = () => (
  <DoctorStack.Navigator screenOptions={headerOptions}>
    <DoctorStack.Screen
      name={ROUTES.DOCTOR_LIST}
      component={DoctorListScreen}
      options={{ title: 'Doctors' }}
    />
    <DoctorStack.Screen
      name={ROUTES.DOCTOR_DETAIL}
      component={DoctorDetailScreen}
      options={{ title: 'Doctor Details' }}
    />
    <DoctorStack.Screen
      name={ROUTES.ADD_DOCTOR}
      component={AddDoctorScreen}
      options={{ title: 'Add New Doctor' }}
    />
  </DoctorStack.Navigator>
);

const VisitStackNavigator: React.FC = () => (
  <VisitStack.Navigator screenOptions={headerOptions}>
    <VisitStack.Screen
      name={ROUTES.VISIT_LIST}
      component={VisitListScreen}
      options={{ title: 'Visits' }}
    />
    <VisitStack.Screen
      name={ROUTES.VISIT_CHECK_IN}
      component={VisitCheckInScreen}
      options={{ title: 'Check In' }}
    />
    <VisitStack.Screen
      name={ROUTES.VISIT_DETAIL}
      component={VisitDetailScreen}
      options={{ title: 'Visit Details' }}
    />
    <VisitStack.Screen
      name="VisitCheckOut"
      component={VisitCheckOutScreen}
      options={{ title: 'Check Out Visit' }}
    />
  </VisitStack.Navigator>
);

const DCRStackNavigator: React.FC = () => (
  <DCRStack.Navigator screenOptions={headerOptions}>
    <DCRStack.Screen
      name={ROUTES.DCR_LIST}
      component={DCRListScreen}
      options={{ title: 'Daily Call Reports' }}
    />
    <DCRStack.Screen
      name={ROUTES.CREATE_DCR}
      component={CreateDCRScreen}
      options={{ title: 'Create DCR' }}
    />
    <DCRStack.Screen
      name={ROUTES.DCR_DETAIL}
      component={DCRDetailScreen}
      options={{ title: 'DCR Details' }}
    />
    <DCRStack.Screen
      name={ROUTES.DCR_CALENDAR}
      component={DCRCalendarScreen}
      options={{ title: 'DCR Calendar' }}
    />
  </DCRStack.Navigator>
);

const AttendanceStackNavigator: React.FC = () => (
  <AttendanceStack.Navigator screenOptions={headerOptions}>
    <AttendanceStack.Screen
      name="AttendanceHome"
      component={AttendanceScreen}
      options={({ navigation }) => ({
        title: 'Attendance',
        headerRight: () => (
          <TouchableOpacity
            onPress={() => navigation.navigate('AttendanceHistory')}
            style={{ marginRight: 16 }}
          >
            <MaterialCommunityIcons name="history" size={24} color={COLORS.textWhite} />
          </TouchableOpacity>
        ),
      })}
    />
    <AttendanceStack.Screen
      name="AttendanceHistory"
      component={AttendanceHistoryScreen}
      options={{ title: 'Attendance History' }}
    />
  </AttendanceStack.Navigator>
);

const TourPlanStackNavigator: React.FC = () => (
  <TourPlanStack.Navigator screenOptions={headerOptions}>
    <TourPlanStack.Screen
      name="MTPCalendar"
      component={MTPCalendarScreen}
      options={{ headerShown: false }}
    />
    <TourPlanStack.Screen
      name="DayPlanForm"
      component={DayPlanFormScreen}
      options={({ route }) => ({ title: `Plan: ${route.params.date}` })}
    />
    <TourPlanStack.Screen
      name="MTPSummary"
      component={MTPSummaryScreen}
      options={{ title: 'Plan History' }}
    />
  </TourPlanStack.Navigator>
);

const MoreStackNavigator: React.FC = () => (
  <MoreStack.Navigator screenOptions={headerOptions}>
    <MoreStack.Screen
      name="More"
      component={MoreScreen}
      options={{
        headerStyle: {
          backgroundColor: COLORS.background,
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTintColor: COLORS.textPrimary,
        headerTitleStyle: {
          fontWeight: 'bold' as const,
          fontSize: 24,
          color: COLORS.textPrimary,
        },
        title: 'More',
      }}
    />
    <MoreStack.Screen
      name="TaskList"
      component={TaskListScreen}
      options={{ title: 'Tasks' }}
    />
    <MoreStack.Screen
      name="TaskDetail"
      component={TaskDetailScreen}
      options={{ title: 'Task Details' }}
    />
    <MoreStack.Screen
      name="ChangePassword"
      component={ChangePasswordScreen}
      options={{ title: 'Change Password' }}
    />
  </MoreStack.Navigator>
);

const MainNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarStyle: {
          borderTopWidth: 0,
          elevation: 12,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.08,
          shadowRadius: 10,
          height: 64,
          paddingBottom: 10,
          paddingTop: 8,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          backgroundColor: COLORS.background,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
      }}
    >
      {/* ── Visible Tabs ── */}
      <Tab.Screen
        name={ROUTES.DASHBOARD}
        component={DashboardScreen}
        options={{
          headerShown: false,
          tabBarLabel: 'Home',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="home" color={color} size={size} />
          ),
        }}
      />

      <Tab.Screen
        name={ROUTES.TOUR_PLAN}
        component={TourPlanStackNavigator}
        options={{
          tabBarLabel: 'Tour Plan',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="calendar-month" color={color} size={size} />
          ),
        }}
      />

      <Tab.Screen
        name={ROUTES.DOCTORS}
        component={DoctorStackNavigator}
        options={{
          tabBarLabel: 'Doctors',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="doctor" color={color} size={size} />
          ),
        }}
      />

      <Tab.Screen
        name={ROUTES.MORE}
        component={MoreStackNavigator}
        options={{
          tabBarLabel: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account-circle" color={color} size={size} />
          ),
        }}
      />

      {/* ── Hidden Tabs (accessible via Dashboard quick actions) ── */}
      <Tab.Screen
        name={ROUTES.ATTENDANCE}
        component={AttendanceStackNavigator}
        options={{
          tabBarItemStyle: { display: 'none' },
          tabBarButton: () => null,
        }}
      />

      <Tab.Screen
        name={ROUTES.VISITS}
        component={VisitStackNavigator}
        options={{
          tabBarItemStyle: { display: 'none' },
          tabBarButton: () => null,
        }}
      />

      <Tab.Screen
        name={ROUTES.DCR}
        component={DCRStackNavigator}
        options={{
          tabBarItemStyle: { display: 'none' },
          tabBarButton: () => null,
        }}
      />
    </Tab.Navigator>
  );
};

export default MainNavigator;
