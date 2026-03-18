import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Card, Avatar, Loading, ErrorMessage } from '../../components/common';
import { useAppSelector } from '../../store/hooks';
import { COLORS, SIZES } from '../../constants';
import { formatDate, getTodayDate } from '../../utils/dateUtils';
import { visitApi, dcrApi, taskApi } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';

interface DashboardStats {
  todayVisits: number;
  todayDoctorVisits: number;
  todayChemistVisits: number;
  hasDCRToday: boolean;
  pendingTasks: number;
  overdueTasks: number;
}

const DashboardScreen: React.FC = () => {
  const { user } = useAppSelector((state) => state.auth);
  const { mrProfile } = useAppSelector((state) => state.user);
  const { logout } = useAuth();

  const [stats, setStats] = useState<DashboardStats>({
    todayVisits: 0,
    todayDoctorVisits: 0,
    todayChemistVisits: 0,
    hasDCRToday: false,
    pendingTasks: 0,
    overdueTasks: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    try {
      setError(null);

      const visitsResponse = await visitApi.getTodayVisits();
      const visits = Array.isArray(visitsResponse) ? visitsResponse : [];
      const doctorVisits = visits.filter((v) => v.visitType === 'Doctor');
      const chemistVisits = visits.filter((v) => v.visitType === 'Chemist');

      let todayDCR = null;
      try {
        todayDCR = await dcrApi.getDCRByDate(getTodayDate());
      } catch (dcrError: any) {
        const status = dcrError?.response?.status;
        if (status !== 400 && status !== 404) {
          throw dcrError;
        }
      }
      let taskSummary = {
        pendingTasks: 0,
        overdueTasks: 0,
      };
      try {
        const taskSummaryResponse = await taskApi.getTaskSummary();
        taskSummary = {
          pendingTasks: taskSummaryResponse?.pendingTasks ?? 0,
          overdueTasks: taskSummaryResponse?.overdueTasks ?? 0,
        };
      } catch (taskError: any) {
        const status = taskError?.response?.status;
        if (status !== 403 && status !== 404) {
          throw taskError;
        }
      }

      setStats({
        todayVisits: visits.length,
        todayDoctorVisits: doctorVisits.length,
        todayChemistVisits: chemistVisits.length,
        hasDCRToday: todayDCR !== null,
        pendingTasks: taskSummary.pendingTasks,
        overdueTasks: taskSummary.overdueTasks,
      });
    } catch (fetchError) {
      console.error('Dashboard fetch error:', fetchError);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  if (loading) {
    return <Loading visible={loading} message="Loading dashboard..." />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={fetchDashboardData} />;
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Avatar name={user?.fullName || 'User'} imageUrl={user?.profileImageUrl} size={50} />
          <View style={styles.headerInfo}>
            <Text style={styles.greeting}>Hello,</Text>
            <Text style={styles.userName}>{user?.firstName || 'User'}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={logout}>
          <MaterialCommunityIcons
            name="logout"
            size={SIZES.iconMD}
            color={COLORS.textSecondary}
          />
        </TouchableOpacity>
      </View>

      <Text style={styles.dateText}>{formatDate(new Date(), 'EEEE, dd MMMM yyyy')}</Text>

      <Card style={styles.summaryCard}>
        <Text style={styles.cardTitle}>Today's Summary</Text>
        <View style={styles.summaryGrid}>
          <View style={styles.summaryItem}>
            <MaterialCommunityIcons
              name="map-marker-check"
              size={SIZES.iconLG}
              color={COLORS.primary}
            />
            <Text style={styles.summaryValue}>{stats.todayVisits}</Text>
            <Text style={styles.summaryLabel}>Total Visits</Text>
          </View>

          <View style={styles.summaryItem}>
            <MaterialCommunityIcons
              name="doctor"
              size={SIZES.iconLG}
              color={COLORS.success}
            />
            <Text style={styles.summaryValue}>{stats.todayDoctorVisits}</Text>
            <Text style={styles.summaryLabel}>Doctor Visits</Text>
          </View>

          <View style={styles.summaryItem}>
            <MaterialCommunityIcons
              name="pharmacy"
              size={SIZES.iconLG}
              color={COLORS.info}
            />
            <Text style={styles.summaryValue}>{stats.todayChemistVisits}</Text>
            <Text style={styles.summaryLabel}>Chemist Visits</Text>
          </View>
        </View>
      </Card>

      <Card style={styles.statusCard}>
        <View style={styles.statusHeader}>
          <MaterialCommunityIcons
            name="file-document"
            size={SIZES.iconMD}
            color={stats.hasDCRToday ? COLORS.success : COLORS.warning}
          />
          <Text style={styles.statusTitle}>Daily Call Report</Text>
        </View>
        <Text
          style={[
            styles.statusText,
            { color: stats.hasDCRToday ? COLORS.success : COLORS.warning },
          ]}
        >
          {stats.hasDCRToday ? 'Submitted for today' : 'Not submitted yet'}
        </Text>
      </Card>

      <Card style={styles.tasksCard}>
        <Text style={styles.cardTitle}>Tasks</Text>
        <View style={styles.taskRow}>
          <View style={styles.taskItem}>
            <Text style={styles.taskValue}>{stats.pendingTasks}</Text>
            <Text style={styles.taskLabel}>Pending</Text>
          </View>
          <View style={styles.taskDivider} />
          <View style={styles.taskItem}>
            <Text style={[styles.taskValue, { color: COLORS.error }]}>{stats.overdueTasks}</Text>
            <Text style={styles.taskLabel}>Overdue</Text>
          </View>
        </View>
      </Card>

      {mrProfile && (
        <Card style={styles.profileCard}>
          <Text style={styles.cardTitle}>Profile Information</Text>
          <View style={styles.profileRow}>
            <Text style={styles.profileLabel}>Employee ID:</Text>
            <Text style={styles.profileValue}>{mrProfile.employeeId}</Text>
          </View>
          <View style={styles.profileRow}>
            <Text style={styles.profileLabel}>Designation:</Text>
            <Text style={styles.profileValue}>
              {mrProfile.designation || 'Medical Representative'}
            </Text>
          </View>
          {mrProfile.managerName && (
            <View style={styles.profileRow}>
              <Text style={styles.profileLabel}>Manager:</Text>
              <Text style={styles.profileValue}>{mrProfile.managerName}</Text>
            </View>
          )}
        </Card>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundGray,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SIZES.paddingLG,
    backgroundColor: COLORS.background,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerInfo: {
    marginLeft: SIZES.paddingMD,
  },
  greeting: {
    fontSize: SIZES.fontSM,
    color: COLORS.textSecondary,
  },
  userName: {
    fontSize: SIZES.fontXL,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  dateText: {
    fontSize: SIZES.fontMD,
    color: COLORS.textSecondary,
    paddingHorizontal: SIZES.paddingLG,
    paddingVertical: SIZES.paddingMD,
    backgroundColor: COLORS.background,
  },
  summaryCard: {
    margin: SIZES.paddingLG,
  },
  cardTitle: {
    fontSize: SIZES.fontLG,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SIZES.paddingMD,
  },
  summaryGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: SIZES.font3XL,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginTop: SIZES.paddingSM,
  },
  summaryLabel: {
    fontSize: SIZES.fontSM,
    color: COLORS.textSecondary,
    marginTop: SIZES.paddingXS,
  },
  statusCard: {
    marginHorizontal: SIZES.paddingLG,
    marginBottom: SIZES.paddingMD,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.paddingSM,
  },
  statusTitle: {
    fontSize: SIZES.fontMD,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginLeft: SIZES.paddingSM,
  },
  statusText: {
    fontSize: SIZES.fontMD,
    fontWeight: '500',
  },
  tasksCard: {
    marginHorizontal: SIZES.paddingLG,
    marginBottom: SIZES.paddingMD,
  },
  taskRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  taskItem: {
    flex: 1,
    alignItems: 'center',
  },
  taskDivider: {
    width: 1,
    height: 40,
    backgroundColor: COLORS.border,
  },
  taskValue: {
    fontSize: SIZES.font3XL,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  taskLabel: {
    fontSize: SIZES.fontSM,
    color: COLORS.textSecondary,
    marginTop: SIZES.paddingXS,
  },
  profileCard: {
    margin: SIZES.paddingLG,
  },
  profileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: SIZES.paddingSM,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  profileLabel: {
    fontSize: SIZES.fontMD,
    color: COLORS.textSecondary,
  },
  profileValue: {
    fontSize: SIZES.fontMD,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
});

export default DashboardScreen;
