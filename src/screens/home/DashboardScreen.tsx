import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  StatusBar,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Loading, ErrorMessage } from '../../components/common';
import { useAppSelector } from '../../store/hooks';
import { COLORS, SIZES } from '../../constants';
import { formatDate } from '../../utils/dateUtils';
import { visitApi } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { MainTabParamList } from '../../types/navigation.types';
import { Visit } from '../../types/visit.types';

type DashboardNavProp = BottomTabNavigationProp<MainTabParamList>;

interface DashboardStats {
  todayVisits: number;
  orderValue: number;
  targetVisits: number;
}

interface QuickAction {
  icon: string;
  label: string;
  color: string;
  bg: string;
  onPress: () => void;
}

const DashboardScreen: React.FC = () => {
  const navigation = useNavigation<DashboardNavProp>();
  const { user } = useAppSelector((state) => state.auth);
  const { mrProfile } = useAppSelector((state) => state.user);
  const { logout } = useAuth();

  const [stats, setStats] = useState<DashboardStats>({
    todayVisits: 0,
    orderValue: 0,
    targetVisits: 12,
  });
  const [todayVisits, setTodayVisits] = useState<Visit[]>([]);
  const [isPunchedIn, setIsPunchedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      setError(null);

      const visitsResponse = await visitApi.getTodayVisits();
      const visits: Visit[] = Array.isArray(visitsResponse) ? visitsResponse : [];

      const totalOrderValue = visits
        .filter((v) => v.isOrderBooked && v.orderValue)
        .reduce((sum, v) => sum + (v.orderValue ?? 0), 0);

      setTodayVisits(visits);
      setStats((prev) => ({
        ...prev,
        todayVisits: visits.length,
        orderValue: totalOrderValue,
      }));
    } catch (fetchError) {
      console.error('Dashboard fetch error:', fetchError);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning,';
    if (hour < 17) return 'Good Afternoon,';
    return 'Good Evening,';
  };

  const visitProgress = Math.min((stats.todayVisits / stats.targetVisits) * 100, 100);

  const orderValueProgress = Math.min((stats.orderValue / 20000) * 100, 100);

  const formatOrderValue = (value: number): string => {
    if (value >= 100000) return `₹ ${(value / 100000).toFixed(1)}L`;
    if (value >= 1000) return `₹ ${(value / 1000).toFixed(1)}k`;
    return `₹ ${value.toFixed(0)}`;
  };

  const quickActions: QuickAction[] = [
    {
      icon: 'map-marker-plus',
      label: 'Log Visit',
      color: COLORS.primary,
      bg: COLORS.primaryLight,
      onPress: () => navigation.navigate('Visits' as any, { screen: 'VisitCheckIn' } as any),
    },
    {
      icon: 'clipboard-check-outline',
      label: 'Submit DCR',
      color: '#059669',
      bg: COLORS.successLight,
      onPress: () => navigation.navigate('DCR' as any, { screen: 'CreateDCR' } as any),
    },
    {
      icon: 'cart-outline',
      label: 'Take Order',
      color: '#8b5cf6',
      bg: '#ede9fe',
      onPress: () => navigation.navigate('Visits' as any, { screen: 'VisitList' } as any),
    },
    {
      icon: 'receipt',
      label: 'Expenses',
      color: '#ea580c',
      bg: '#ffedd5',
      onPress: () => {},   // Expenses module — wire up when screen is built
    },
  ];

  if (loading) {
    return <Loading visible={loading} message="Loading dashboard..." />;
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={fetchDashboardData} />;
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />

      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >
        {/* ── Blue App Header (inside ScrollView so negative margin card overlap works) ── */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.greeting}>{getGreeting()}</Text>
              <Text style={styles.userName}>{user?.firstName || 'User'}</Text>
            </View>
            <TouchableOpacity style={styles.notifBtn} onPress={logout}>
              <MaterialCommunityIcons name="bell-outline" size={22} color={COLORS.textWhite} />
            </TouchableOpacity>
          </View>
          <View style={styles.locationRow}>
            <MaterialCommunityIcons name="map-marker" size={14} color="rgba(255,255,255,0.8)" />
            <Text style={styles.locationText}>
              {mrProfile?.territories?.[0] || formatDate(new Date(), 'EEEE, dd MMM yyyy')}
            </Text>
          </View>
        </View>

        {/* ── Floating Attendance Card — negative marginTop pulls it over the header ── */}
        <View style={styles.attendanceCard}>
          <View>
            <Text style={styles.attendanceTitle}>Work Status</Text>
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, isPunchedIn && styles.statusDotActive]} />
              <Text style={[styles.statusText, isPunchedIn && styles.statusTextActive]}>
                {isPunchedIn ? 'On-Duty (GPS Active)' : 'Off-Duty'}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.punchBtn, isPunchedIn && styles.punchBtnOut]}
            onPress={() => setIsPunchedIn((v) => !v)}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons
              name={isPunchedIn ? 'stop-circle' : 'fingerprint'}
              size={20}
              color={COLORS.textWhite}
            />
            <Text style={styles.punchBtnText}>{isPunchedIn ? 'Punch Out' : 'Punch In'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.contentPad}>
          {/* ── Metrics Grid (2 tiles) ── */}
          <View style={styles.metricsGrid}>
            {/* Visits Today */}
            <View style={styles.metricCard}>
              <View style={[styles.metricIconBox, { backgroundColor: '#e0e7ff' }]}>
                <MaterialCommunityIcons name="medical-bag" size={18} color="#4338ca" />
              </View>
              <Text style={styles.metricLabel}>Visits Today</Text>
              <Text style={styles.metricValue}>
                {stats.todayVisits}
                <Text style={styles.metricTarget}> / {stats.targetVisits}</Text>
              </Text>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${visitProgress}%`, backgroundColor: '#4338ca' }]} />
              </View>
            </View>

            {/* Order Value */}
            <View style={styles.metricCard}>
              <View style={[styles.metricIconBox, { backgroundColor: '#fce7f3' }]}>
                <MaterialCommunityIcons name="currency-inr" size={18} color="#be185d" />
              </View>
              <Text style={styles.metricLabel}>Order Value</Text>
              <Text style={styles.metricValue}>{formatOrderValue(stats.orderValue)}</Text>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${orderValueProgress}%`, backgroundColor: '#be185d' }]} />
              </View>
            </View>
          </View>

          {/* ── Quick Actions ── */}
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            {quickActions.map((action) => (
              <TouchableOpacity
                key={action.label}
                style={styles.actionItem}
                onPress={action.onPress}
                activeOpacity={0.75}
              >
                <View style={[styles.actionIcon, { backgroundColor: action.bg }]}>
                  <MaterialCommunityIcons name={action.icon} size={26} color={action.color} />
                </View>
                <Text style={styles.actionLabel}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Today's Call Plan ── */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Today's Call Plan</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Visits' as any, { screen: 'VisitList' } as any)}>
              <Text style={styles.sectionLink}>View All</Text>
            </TouchableOpacity>
          </View>

          {todayVisits.length === 0 ? (
            <View style={styles.emptyCard}>
              <MaterialCommunityIcons name="calendar-blank-outline" size={36} color={COLORS.textDisabled} />
              <Text style={styles.emptyTitle}>No visits logged today</Text>
              <Text style={styles.emptySubtitle}>Tap "Log Visit" above to record your first call</Text>
            </View>
          ) : (
            todayVisits.slice(0, 5).map((visit) => {
              const partyName =
                visit.visitType === 'Doctor'
                  ? visit.doctorName ?? 'Unknown Doctor'
                  : visit.chemistName ?? 'Unknown Chemist';
              const subtitle =
                visit.visitType === 'Doctor'
                  ? [visit.doctorSpecialty, visit.doctorId ? undefined : undefined]
                      .filter(Boolean)
                      .join(' • ') || 'Doctor'
                  : [visit.chemistShopName].filter(Boolean).join(' • ') || 'Chemist';

              const initials = partyName
                .split(' ')
                .slice(0, 2)
                .map((w) => w[0])
                .join('')
                .toUpperCase();

              const isDone = visit.status === 'Checked-Out';
              const isActive = visit.status === 'Checked-In';

              return (
                <TouchableOpacity
                  key={visit.id}
                  style={styles.doctorCard}
                  onPress={() => navigation.navigate('Visits' as any, { screen: 'VisitDetail', params: { visitId: visit.id } } as any)}
                  activeOpacity={0.75}
                >
                  {isDone ? (
                    <View style={styles.docAvatarDone}>
                      <MaterialCommunityIcons name="check" size={20} color="#047857" />
                    </View>
                  ) : (
                    <View style={[styles.docAvatar, isActive && styles.docAvatarActive]}>
                      <Text style={[styles.docAvatarText, isActive && styles.docAvatarTextActive]}>
                        {initials}
                      </Text>
                    </View>
                  )}
                  <View style={styles.docInfo}>
                    <Text style={styles.docName}>{partyName}</Text>
                    <Text style={styles.docSpec}>{subtitle}</Text>
                  </View>
                  {isDone ? (
                    <View style={[styles.docBadge, styles.badgeDone]}>
                      <Text style={styles.badgeDoneText}>Visited</Text>
                    </View>
                  ) : isActive ? (
                    <View style={[styles.docBadge, styles.badgeActive]}>
                      <Text style={styles.badgeActiveText}>In Progress</Text>
                    </View>
                  ) : (
                    <View style={[styles.docBadge, styles.badgePending]}>
                      <Text style={styles.badgePendingText}>Pending</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })
          )}

          {/* Profile row */}
          {mrProfile && (
            <View style={styles.profileChip}>
              <MaterialCommunityIcons name="badge-account" size={16} color={COLORS.textSecondary} />
              <Text style={styles.profileChipText}>
                {mrProfile.employeeId} • {mrProfile.designation || 'Medical Representative'}
                {mrProfile.managerName ? ` • Reports to ${mrProfile.managerName}` : ''}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.backgroundGray,
  },

  /* Header — lives inside ScrollView so the attendance card's negative margin
     correctly overlaps the header bottom in the same layout flow.
     paddingTop accounts for Android status bar height; iOS uses safe area inset. */
  header: {
    backgroundColor: COLORS.primary,
    paddingTop: Platform.OS === 'android'
      ? (StatusBar.currentHeight ?? 24) - 10
      : 34,
    paddingHorizontal: SIZES.paddingLG,
    paddingBottom: 44,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  greeting: {
    fontSize: SIZES.fontSM,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500',
  },
  userName: {
    fontSize: SIZES.fontXL,
    fontWeight: '700',
    color: COLORS.textWhite,
    marginTop: 2,
  },
  notifBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: SIZES.fontXS,
    color: 'rgba(255,255,255,0.8)',
    marginLeft: 2,
  },

  scrollView: {
    flex: 1,
    backgroundColor: COLORS.backgroundGray,
  },

  /* Attendance Card — negative marginTop pulls it up into the header's
     rounded-bottom zone; marginBottom pushes next content down from card bottom */
  attendanceCard: {
    backgroundColor: COLORS.background,
    borderRadius: 16,
    marginHorizontal: SIZES.paddingLG,
    marginTop: -32,
    marginBottom: SIZES.paddingMD,
    padding: SIZES.paddingMD,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 10,
  },
  attendanceTitle: {
    fontSize: SIZES.fontMD,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.textDisabled,
  },
  statusDotActive: {
    backgroundColor: COLORS.success,
  },
  statusText: {
    fontSize: SIZES.fontSM,
    color: COLORS.textSecondary,
  },
  statusTextActive: {
    color: COLORS.success,
    fontWeight: '600',
  },
  punchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.success,
    paddingHorizontal: SIZES.paddingMD,
    paddingVertical: 10,
    borderRadius: 12,
    shadowColor: COLORS.success,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  punchBtnOut: {
    backgroundColor: COLORS.error,
    shadowColor: COLORS.error,
  },
  punchBtnText: {
    color: COLORS.textWhite,
    fontWeight: '700',
    fontSize: SIZES.fontSM,
  },

  contentPad: {
    paddingHorizontal: SIZES.paddingLG,
    paddingTop: 0,
    paddingBottom: 20,
  },

  /* Metrics */
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: SIZES.paddingMD,
  },
  metricCard: {
    width: '47%',
    backgroundColor: COLORS.background,
    borderRadius: 16,
    padding: SIZES.paddingMD,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  metricIconBox: {
    width: 34,
    height: 34,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricLabel: {
    fontSize: SIZES.fontXS,
    color: COLORS.textSecondary,
    fontWeight: '500',
    marginBottom: 2,
  },
  metricValue: {
    fontSize: SIZES.font2XL,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  metricTarget: {
    fontSize: SIZES.fontSM,
    color: COLORS.textSecondary,
    fontWeight: '400',
  },
  progressBar: {
    width: '100%',
    height: 6,
    backgroundColor: COLORS.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },

  /* Quick Actions */
  sectionTitle: {
    fontSize: SIZES.fontMD,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionLink: {
    fontSize: SIZES.fontSM,
    color: COLORS.primary,
    fontWeight: '600',
  },
  actionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SIZES.paddingMD,
  },
  actionItem: {
    alignItems: 'center',
    gap: 8,
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  actionLabel: {
    fontSize: SIZES.fontXS,
    color: COLORS.textPrimary,
    fontWeight: '600',
    textAlign: 'center',
    maxWidth: 60,
  },

  /* Today's Call Plan Cards */
  emptyCard: {
    backgroundColor: COLORS.background,
    borderRadius: 16,
    padding: SIZES.paddingLG,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: SIZES.fontMD,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  emptySubtitle: {
    fontSize: SIZES.fontXS,
    color: COLORS.textDisabled,
    textAlign: 'center',
  },
  doctorCard: {
    backgroundColor: COLORS.background,
    borderRadius: 16,
    padding: SIZES.paddingMD,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  docAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  docAvatarActive: {
    backgroundColor: '#e0e7ff',
  },
  docAvatarDone: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.successLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  docAvatarText: {
    fontSize: SIZES.fontSM,
    fontWeight: '700',
    color: COLORS.primary,
  },
  docAvatarTextActive: {
    color: '#4338ca',
  },
  docInfo: {
    flex: 1,
  },
  docName: {
    fontSize: SIZES.fontMD,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  docSpec: {
    fontSize: SIZES.fontXS,
    color: COLORS.textSecondary,
  },
  docBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeDone: {
    backgroundColor: COLORS.successLight,
  },
  badgeActive: {
    backgroundColor: '#e0e7ff',
  },
  badgePending: {
    backgroundColor: COLORS.warningLight,
  },
  badgeDoneText: {
    fontSize: SIZES.fontXS,
    fontWeight: '600',
    color: '#047857',
  },
  badgeActiveText: {
    fontSize: SIZES.fontXS,
    fontWeight: '600',
    color: '#4338ca',
  },
  badgePendingText: {
    fontSize: SIZES.fontXS,
    fontWeight: '600',
    color: '#b45309',
  },

  /* Profile chip */
  profileChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingHorizontal: SIZES.paddingMD,
    paddingVertical: 10,
    backgroundColor: COLORS.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  profileChipText: {
    fontSize: SIZES.fontXS,
    color: COLORS.textSecondary,
    flexShrink: 1,
  },
});

export default DashboardScreen;
