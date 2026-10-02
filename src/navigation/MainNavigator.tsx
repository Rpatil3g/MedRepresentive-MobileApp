import React from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { useAppSelector } from '../store/hooks';
import { refreshRejectedCounts, useRejectedCountsPolling } from '../hooks/useRejectedCounts';
import {
  MainTabParamList,
  DoctorStackParamList,
  ProductStackParamList,
  VisitStackParamList,
  DCRStackParamList,
  MoreStackParamList,
  AttendanceStackParamList,
  TourPlanStackParamList,
  ExpenseStackParamList,
  OrderStackParamList,
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
import AddChemistScreen from '../screens/doctors/AddChemistScreen';
import MySubmissionsScreen from '../screens/doctors/MySubmissionsScreen';

// Visit Screens
import { VisitListScreen, LogVisitScreen, VisitDetailScreen, VisitEditScreen } from '../screens/visits';

// DCR Screens
import { DCRListScreen, CreateDCRScreen, DCRCalendarScreen } from '../screens/dcr';

// Task Screens
import { TaskListScreen, TaskDetailScreen } from '../screens/tasks';

// More Screen
import { MoreScreen } from '../screens/more';

// Attendance Screens
import { AttendanceScreen, AttendanceHistoryScreen } from '../screens/attendance';

// Tour Plan Screens
import { MTPCalendarScreen, DayPlanFormScreen, MTPSummaryScreen } from '../screens/tourplan';

// Product Screens
import { ProductListScreen, ProductDetailScreen } from '../screens/products';

// Auth screens used in More stack
import ChangePasswordScreen from '../screens/auth/ChangePasswordScreen';
import HelpSupportScreen from '../screens/more/HelpSupportScreen';
import AboutScreen from '../screens/more/AboutScreen';

// Expense Screens
import { ExpenseListScreen, AddExpenseScreen, EditExpenseScreen } from '../screens/expenses';

// Order Screens
import { OrderListScreen, BookOrderScreen, OrderDetailScreen, MyTargetsScreen } from '../screens/orders';

const Tab = createBottomTabNavigator<MainTabParamList>();
const DoctorStack = createStackNavigator<DoctorStackParamList>();
const ProductStack = createStackNavigator<ProductStackParamList>();
const VisitStack = createStackNavigator<VisitStackParamList>();
const DCRStack = createStackNavigator<DCRStackParamList>();
const MoreStack = createStackNavigator<MoreStackParamList>();
const AttendanceStack = createStackNavigator<AttendanceStackParamList>();
const TourPlanStack = createStackNavigator<TourPlanStackParamList>();
const ExpenseStack = createStackNavigator<ExpenseStackParamList>();
const OrderStack = createStackNavigator<OrderStackParamList>();

const headerOptions = {
  headerShown: true,
  headerStyle: {
    backgroundColor: COLORS.primary,
  },
  headerTintColor: COLORS.textWhite,
  headerTitleAlign: 'left' as const,
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
    <DoctorStack.Screen
      name={ROUTES.ADD_CHEMIST}
      component={AddChemistScreen}
      options={{ title: 'Add New Chemist' }}
    />
    <DoctorStack.Screen
      name={ROUTES.MY_SUBMISSIONS}
      component={MySubmissionsScreen}
      options={{ title: 'My Submissions' }}
    />
  </DoctorStack.Navigator>
);

const ProductStackNavigator: React.FC = () => (
  <ProductStack.Navigator screenOptions={headerOptions}>
    <ProductStack.Screen
      name="ProductList"
      component={ProductListScreen}
      options={{ title: 'Product Catalog' }}
    />
    <ProductStack.Screen
      name="ProductDetail"
      component={ProductDetailScreen}
      options={{ title: 'Product Details', headerTitleAlign: 'left' }}
    />
  </ProductStack.Navigator>
);

const VisitStackNavigator: React.FC = () => (
  <VisitStack.Navigator screenOptions={headerOptions}>
    <VisitStack.Screen
      name={ROUTES.VISIT_LIST}
      component={VisitListScreen}
      options={{ title: 'Visits' }}
    />
    <VisitStack.Screen
      name={ROUTES.LOG_VISIT}
      component={LogVisitScreen}
      options={{ title: 'Log Visit' }}
    />
    <VisitStack.Screen
      name={ROUTES.VISIT_DETAIL}
      component={VisitDetailScreen}
      options={{ title: 'Visit Details' }}
    />
    <VisitStack.Screen
      name="VisitEdit"
      component={VisitEditScreen}
      options={{ title: 'Edit Visit' }}
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
      name={ROUTES.DCR_CALENDAR}
      component={DCRCalendarScreen}
      options={{ title: 'DCR Calendar' }}
    />
    <DCRStack.Screen
      name="VisitEdit"
      component={VisitEditScreen}
      options={{ title: 'Edit Visit' }}
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
      name="MyAttendance"
      component={AttendanceHistoryScreen}
      options={{ title: 'My Attendance' }}
    />
    <MoreStack.Screen
      name="ChangePassword"
      component={ChangePasswordScreen}
      options={{ title: 'Change Password' }}
    />
    <MoreStack.Screen
      name="HelpSupport"
      component={HelpSupportScreen}
      options={{ title: 'Help & Support' }}
    />
    <MoreStack.Screen
      name="About"
      component={AboutScreen}
      options={{ title: 'About' }}
    />
  </MoreStack.Navigator>
);

const ExpenseStackNavigator: React.FC = () => (
  <ExpenseStack.Navigator screenOptions={headerOptions}>
    <ExpenseStack.Screen
      name="ExpenseList"
      component={ExpenseListScreen}
      options={{ title: 'My Expenses' }}
    />
    <ExpenseStack.Screen
      name="AddExpense"
      component={AddExpenseScreen}
      options={{ title: 'Add Expense' }}
    />
    <ExpenseStack.Screen
      name="EditExpense"
      component={EditExpenseScreen}
      options={{ title: 'Edit & Resubmit' }}
    />
  </ExpenseStack.Navigator>
);

const OrderStackNavigator: React.FC = () => (
  <OrderStack.Navigator screenOptions={headerOptions}>
    <OrderStack.Screen
      name="OrderList"
      component={OrderListScreen}
      options={{ title: 'My Orders' }}
    />
    <OrderStack.Screen
      name="BookOrder"
      component={BookOrderScreen}
      options={{ title: 'Book Order' }}
    />
    <OrderStack.Screen
      name="OrderDetail"
      component={OrderDetailScreen}
      options={{ title: 'Order Details' }}
    />
    <OrderStack.Screen
      name="MyTargets"
      component={MyTargetsScreen}
      options={{ title: 'My Targets' }}
    />
  </OrderStack.Navigator>
);

/**
 * Tab icon with a red dot when the manager has sent something back on that tab
 * (counts come from the server, see useRejectedCounts).
 */
const AlertTabIcon: React.FC<{
  name: string;
  color: string;
  size: number;
  alert: 'tourPlans' | 'dcrs' | 'expenses';
}> = ({ name, color, size, alert }) => {
  const hasRejected = useAppSelector(state => state.alerts[alert] > 0);
  return (
    <View>
      <MaterialCommunityIcons name={name} color={color} size={size} />
      {hasRejected && <View style={navStyles.rejectedDot} />}
    </View>
  );
};

const MainNavigator: React.FC = () => {
  const insets = useSafeAreaInsets();
  useRejectedCountsPolling();

  return (
    <Tab.Navigator
      // Switching tabs also refreshes the red dots (e.g. after fixing something on another tab)
      screenListeners={{ focus: () => { refreshRejectedCounts(); } }}
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
          height: 64 + insets.bottom,
          paddingBottom: 10 + insets.bottom,
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
          // Expenses has no tab of its own — it's reached from Home
          tabBarIcon: ({ color, size }) => (
            <AlertTabIcon name="home" color={color} size={size} alert="expenses" />
          ),
        }}
      />

      <Tab.Screen
        name={ROUTES.TOUR_PLAN}
        component={TourPlanStackNavigator}
        options={{
          tabBarLabel: 'Tour Plan',
          tabBarIcon: ({ color, size }) => (
            <AlertTabIcon name="calendar-month" color={color} size={size} alert="tourPlans" />
          ),
        }}
      />

      <Tab.Screen
        name={ROUTES.DCR}
        component={DCRStackNavigator}
        options={{
          tabBarLabel: 'DCR',
          tabBarIcon: ({ color, size }) => (
            <AlertTabIcon name="clipboard-text" color={color} size={size} alert="dcrs" />
          ),
        }}
      />

      <Tab.Screen
        name={ROUTES.PRODUCTS}
        component={ProductStackNavigator}
        options={{
          tabBarLabel: 'Products',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="pill" color={color} size={size} />
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
          // Leaving Visits clears Log Visit / Visit Details, so the next entry starts from the list
          popToTopOnBlur: true,
        }}
      />

      <Tab.Screen
        name={ROUTES.DOCTORS}
        component={DoctorStackNavigator}
        options={{
          tabBarItemStyle: { display: 'none' },
          tabBarButton: () => null,
        }}
      />

      <Tab.Screen
        name={ROUTES.EXPENSES}
        component={ExpenseStackNavigator}
        options={{
          tabBarItemStyle: { display: 'none' },
          tabBarButton: () => null,
        }}
      />

      <Tab.Screen
        name={ROUTES.ORDERS}
        component={OrderStackNavigator}
        options={{
          tabBarItemStyle: { display: 'none' },
          tabBarButton: () => null,
        }}
      />
    </Tab.Navigator>
  );
};

const navStyles = StyleSheet.create({
  rejectedDot: {
    position: 'absolute',
    top: -1,
    right: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.error,
    borderWidth: 1.5,
    borderColor: COLORS.background,
  },
});

export default MainNavigator;
