import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  StatusBar,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Loading, ErrorMessage } from '../../components/common';
import { useAppSelector } from '../../store/hooks';
import { format, subDays } from 'date-fns';
import { COLORS, SIZES, EXPENSE_ATTENTION_WINDOW_DAYS } from '../../constants';
import { visitApi, attendanceApi, tourPlanApi, expenseApi, targetApi } from '../../services/api';
import { showAlert, requestLocationPermission } from '../../utils/helpers';
import { capturePunchLocation, formatWorked, punchErrorMessage, punchInNow } from '../../utils/punch';
import { useAuth } from '../../hooks/useAuth';
import { useLocationTracker } from '../../hooks/useLocationTracker';
import { MainTabParamList } from '../../types/navigation.types';
import { Visit } from '../../types/visit.types';
import { TourPlanDetailResponse, contactLabel, contactsOfDetail } from '../../types/tourPlan.types';
import { MyTargets } from '../../types/target.types';
import { formatINRShort } from '../orders/orderMeta';

type DashboardNavProp = BottomTabNavigationProp<MainTabParamList>;

// Call plan contacts shown before the "+N more" row
const PLAN_CONTACTS_PREVIEW = 5;

interface DashboardStats {
  todayVisits: number;
  targetVisits: number;
}

interface QuickAction {
  icon: string;
  label: string;
  color: string;
  bg: string;
  badge?: number;
  disabled?: boolean;
  onPress: () => void;
}

const DashboardScreen: React.FC = () => {
  const navigation = useNavigation<DashboardNavProp>();
  const insets = useSafeAreaInsets();
  const { user } = useAppSelector((state) => state.auth);
  const { mrProfile } = useAppSelector((state) => state.user);
  const headquartersName = mrProfile?.headquartersName || user?.headquartersName;
  const { logout } = useAuth();

  const [stats, setStats] = useState<DashboardStats>({
    todayVisits: 0,
    targetVisits: 0,
  });
  const [monthTargets, setMonthTargets] = useState<MyTargets | null>(null);
  const [todayVisits, setTodayVisits] = useState<Visit[]>([]);
  const [todayPlan, setTodayPlan] = useState<TourPlanDetailResponse | null>(null);
  const [showAllPlanContacts, setShowAllPlanContacts] = useState(false);
  const [isPunchedIn, setIsPunchedIn] = useState(false);
  const [hasPunchedOut, setHasPunchedOut] = useState(false);
  // Today was closed by the server because the MR didn't punch out
  const [isAutoPunchOut, setIsAutoPunchOut] = useState(false);
  const [punchOutReminderAtUtc, setPunchOutReminderAtUtc] = useState<string | undefined>(undefined);
  const [punchLoading, setPunchLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rejectedExpensesCount, setRejectedExpensesCount] = useState(0);

  // The server ends the day (auto punch-out) → stop tracking and show the day as closed
  const handleDayClosedByServer = useCallback(() => {
    setIsPunchedIn(false);
    setHasPunchedOut(true);
  }, []);

  useLocationTracker(isPunchedIn, { punchOutReminderAtUtc, onDayClosed: handleDayClosedByServer });

  const fetchDashboardData = useCallback(async () => {
    try {
      setError(null);

      const today = new Date();
      // Local date — toISOString() would give yesterday before 5:30 am IST
      const todayStr = format(today, 'yyyy-MM-dd');
      const [visitsResponse, attendanceStatus, todaysPlans, myExpenses, targets] = await Promise.all([
        visitApi.getTodayVisits(),
        attendanceApi.getAttendanceStatus(),
        // The plan holding today — a monthly or a weekly plan
        tourPlanApi.getMyPlans(todayStr, todayStr).catch(() => []),
        // Same window as the Expenses red dot, so the badge and the dot agree
        expenseApi.getMyExpenses({
          fromDate: format(subDays(today, EXPENSE_ATTENTION_WINDOW_DAYS), 'yyyy-MM-dd'),
          status: 'Rejected',
        }).catch(() => []),
        targetApi.getMyTargets(today.getFullYear(), today.getMonth() + 1).catch(() => null),
      ]);

      setRejectedExpensesCount(myExpenses.length);
      setMonthTargets(targets);

      const visits: Visit[] = Array.isArray(visitsResponse) ? visitsResponse : [];

      const todayPlanDetail = todaysPlans
        .flatMap((p) => p.details ?? [])
        .find((d) => d.planDate.startsWith(todayStr)) ?? null;
      const targetVisits = todayPlanDetail
        ? (contactsOfDetail(todayPlanDetail).length || todayPlanDetail.estimatedCalls || 0)
        : 0;

      setTodayVisits(visits);
      setTodayPlan(todayPlanDetail);
      setStats((prev) => ({
        ...prev,
        todayVisits: visits.length,
        targetVisits,
      }));
      setIsPunchedIn(attendanceStatus.hasPunchedIn && !attendanceStatus.hasPunchedOut);
      setHasPunchedOut(attendanceStatus.hasPunchedOut);
      setIsAutoPunchOut(!!attendanceStatus.isAutoPunchOut);
      setPunchOutReminderAtUtc(attendanceStatus.punchOutReminderAtUtc);
    } catch (fetchError) {
      console.error('Dashboard fetch error:', fetchError);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const handlePunch = useCallback(async () => {
    if (punchLoading) return;

    // Punch-out: confirm, telling the MR up front if the day will count as a half day or absent
    if (isPunchedIn) {
      let message = 'Are you sure you want to punch out? This will mark your work day as ended.';
      try {
        const preview = await attendanceApi.getPunchOutPreview();
        const worked = formatWorked(preview.workedMinutes);
        if (preview.dayStatus === 'Half Day') {
          message = `You've worked ${worked}. Punching out now marks today as a HALF DAY `
            + `(a full day needs ${preview.fullDayMinHours} hours).`;
        } else if (preview.dayStatus === 'Absent') {
          message = `You've worked ${worked}. Punching out now marks today as ABSENT `
            + `(a half day needs ${preview.halfDayMinHours} hours).`;
        } else {
          message = `You've worked ${worked} today. Punch out and end your work day?`;
        }
      } catch {
        // Preview unavailable (e.g. offline) — fall back to the plain confirmation
      }

      Alert.alert('Punch Out?', message, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Punch Out', style: 'destructive', onPress: () => executePunch('out') },
      ]);
      return;
    }

    // Day already completed guard
    if (hasPunchedOut) {
      showAlert(
        'Already Punched Out',
        isAutoPunchOut
          ? "You didn't punch out, so today was closed automatically at your last activity."
          : 'You have already completed your attendance for today.',
      );
      return;
    }

    executePunch('in');
  }, [isPunchedIn, hasPunchedOut, isAutoPunchOut, punchLoading]);

  const executePunch = async (type: 'in' | 'out') => {
    setPunchLoading(true);
    try {
      if (type === 'in') {
        await punchInNow();
        setIsPunchedIn(true);
        showAlert('Punched In', 'Your attendance has been recorded. Have a productive day!');
        fetchDashboardData(); // picks up today's punch-out reminder time
      } else {
        const hasPermission = await requestLocationPermission();
        if (!hasPermission) {
          showAlert('Permission Denied', 'Location permission is required to punch out.');
          return;
        }
        const location = await capturePunchLocation();
        const record = await attendanceApi.punchOut({ timestamp: new Date().toISOString(), ...location });
        setIsPunchedIn(false);
        setHasPunchedOut(true);
        const worked = record.workDurationMinutes != null ? ` (${formatWorked(record.workDurationMinutes)})` : '';
        showAlert(
          'Punched Out',
          record.dayStatus ? `Today is recorded as ${record.dayStatus}${worked}.` : 'Your work day has been recorded successfully.',
        );
      }
    } catch (err: any) {
      showAlert('Attendance Error', punchErrorMessage(err));
    } finally {
      setPunchLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchDashboardData();
    }, [fetchDashboardData])
  );

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

  const visitProgress = stats.targetVisits > 0
    ? Math.min((stats.todayVisits / stats.targetVisits) * 100, 100)
    : 0;

  // Monthly targets are set by the manager; bars stay empty when no target is set.
  // Achievement: sales = dispatched orders, visits = outcome "Met".
  const monthSales = monthTargets?.actualSales ?? 0;
  const salesTarget = monthTargets?.salesTarget ?? 0;
  const salesProgress = salesTarget > 0 ? Math.min((monthSales / salesTarget) * 100, 100) : 0;
  const monthVisits = monthTargets?.actualVisits ?? 0;
  const visitTarget = monthTargets?.visitTarget ?? 0;
  const monthVisitProgress = visitTarget > 0 ? Math.min((monthVisits / visitTarget) * 100, 100) : 0;
  const goToOrders = () => navigation.navigate('Orders' as any, { screen: 'OrderList' } as any);
  const goToTargets = () => navigation.navigate('Orders' as any, { screen: 'MyTargets', initial: false } as any);
  const pendingSales = monthTargets?.pendingSales ?? 0;

  const quickActions: QuickAction[] = [
    {
      icon: 'map-marker-plus',
      label: 'Log Visit',
      color: COLORS.primary,
      bg: COLORS.primaryLight,
      // initial: false keeps Visit List as the base of the Visits stack, so Back never lands on a stale Log Visit
      onPress: () => navigation.navigate('Visits' as any, {
        screen: 'LogVisit',
        params: { returnTo: 'Dashboard' },
        initial: false,
      } as any),
    },
    {
      icon: 'clipboard-check-outline',
      label: 'Submit DCR',
      color: '#059669',
      bg: COLORS.successLight,
      onPress: () => {
        const completed = todayVisits.filter(
          v => v.status === 'Checked-Out' || v.status === 'Completed'
        );
        if (completed.length === 0) {
          showAlert(
            'No Completed Visits',
            'You need to complete at least one visit before submitting your DCR for the day.'
          );
          return;
        }
        navigation.navigate('DCR' as any);
      },
    },
    {
      icon: 'clipboard-list-outline',
      label: 'Show Visits',
      color: '#0891b2',
      bg: '#e0f2fe',
      onPress: () => navigation.navigate('Visits' as any, { screen: 'VisitList' } as any),
    },
    {
      icon: 'cart-outline',
      label: 'Orders',
      color: '#be185d',
      bg: '#fce7f3',
      onPress: goToOrders,
    },
    {
      icon: 'doctor',
      label: 'Doctors & Chemists',
      color: '#7c3aed',
      bg: '#ede9fe',
      onPress: () => navigation.navigate('Doctors' as any, { screen: 'DoctorList' } as any),
    },
    {
      icon: 'receipt',
      label: 'Expenses',
      color: '#ea580c',
      bg: '#ffedd5',
      badge: rejectedExpensesCount > 0 ? rejectedExpensesCount : undefined,
      onPress: () => navigation.navigate('Expenses' as any),
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
        <View style={[styles.header, { paddingTop: insets.top + 4 }]}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.greeting}>{getGreeting()}</Text>
              <Text style={styles.userName}>{mrProfile?.fullName || user?.firstName || 'User'}</Text>
              {headquartersName ? (
                <View style={styles.hqRow}>
                  <MaterialCommunityIcons name="office-building-marker-outline" size={14} color="rgba(255,255,255,0.85)" />
                  <Text style={styles.hqText}>{headquartersName}</Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        {/* ── Floating Attendance Card — negative marginTop pulls it over the header ── */}
        <View style={styles.attendanceCard}>
          <View>
            <Text style={styles.attendanceTitle}>Work Status</Text>
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, isPunchedIn && styles.statusDotActive]} />
              <Text style={[styles.statusText, isPunchedIn && styles.statusTextActive]}>
                {hasPunchedOut ? 'Day Completed' : isPunchedIn ? 'On-Duty (GPS Active)' : 'Off-Duty'}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={[
              styles.punchBtn,
              isPunchedIn && styles.punchBtnOut,
              hasPunchedOut && styles.punchBtnDisabled,
            ]}
            onPress={handlePunch}
            disabled={punchLoading || hasPunchedOut}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons
              name={hasPunchedOut ? 'check-circle' : isPunchedIn ? 'stop-circle' : 'fingerprint'}
              size={20}
              color={COLORS.textWhite}
            />
            <Text style={styles.punchBtnText}>
              {punchLoading ? 'Please wait...' : hasPunchedOut ? 'Day Complete' : isPunchedIn ? 'Punch Out' : 'Punch In'}
            </Text>
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
                {stats.targetVisits > 0 && (
                  <Text style={styles.metricTarget}> / {stats.targetVisits}</Text>
                )}
              </Text>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${visitProgress}%`, backgroundColor: '#4338ca' }]} />
              </View>
            </View>

            {/* Sales achieved (dispatched) this month vs target */}
            <TouchableOpacity style={styles.metricCard} onPress={goToTargets} activeOpacity={0.8}>
              <View style={[styles.metricIconBox, { backgroundColor: '#fce7f3' }]}>
                <MaterialCommunityIcons name="currency-inr" size={18} color="#be185d" />
              </View>
              <Text style={styles.metricLabel}>Sales Achieved</Text>
              <Text style={styles.metricValue} numberOfLines={1}>
                {formatINRShort(monthSales)}
                {salesTarget > 0 && (
                  <Text style={styles.metricTarget}> / {formatINRShort(salesTarget)}</Text>
                )}
              </Text>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${salesProgress}%`, backgroundColor: '#be185d' }]} />
              </View>
            </TouchableOpacity>

            {/* Met visits this month vs target */}
            <TouchableOpacity style={styles.metricCard} onPress={goToTargets} activeOpacity={0.8}>
              <View style={[styles.metricIconBox, { backgroundColor: '#dcfce7' }]}>
                <MaterialCommunityIcons name="calendar-check" size={18} color="#15803d" />
              </View>
              <Text style={styles.metricLabel}>Met Visits (Month)</Text>
              <Text style={styles.metricValue}>
                {monthVisits}
                {visitTarget > 0 && (
                  <Text style={styles.metricTarget}> / {visitTarget}</Text>
                )}
              </Text>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${monthVisitProgress}%`, backgroundColor: '#15803d' }]} />
              </View>
            </TouchableOpacity>

            {/* Orders this month */}
            <TouchableOpacity style={styles.metricCard} onPress={goToOrders} activeOpacity={0.8}>
              <View style={[styles.metricIconBox, { backgroundColor: '#fef3c7' }]}>
                <MaterialCommunityIcons name="cart-outline" size={18} color="#b45309" />
              </View>
              <Text style={styles.metricLabel}>Orders This Month</Text>
              <Text style={styles.metricValue}>{monthTargets?.orderCount ?? 0}</Text>
              <Text style={styles.metricCaption} numberOfLines={1}>
                {pendingSales > 0
                  ? `${formatINRShort(pendingSales)} awaiting dispatch`
                  : salesTarget > 0 || visitTarget > 0 ? 'Targets set by your manager' : 'No targets set this month'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* ── Quick Actions ── */}
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            {quickActions.map((action) => (
              <TouchableOpacity
                key={action.label}
                style={[styles.actionItem, action.disabled && { opacity: 0.4 }]}
                onPress={action.disabled ? undefined : action.onPress}
                activeOpacity={action.disabled ? 1 : 0.75}
                disabled={action.disabled}
              >
                <View style={styles.actionIconWrapper}>
                  <View style={[styles.actionIcon, { backgroundColor: action.bg }]}>
                    <MaterialCommunityIcons name={action.icon} size={26} color={action.color} />
                  </View>
                  {action.badge != null && (
                    <View style={styles.actionBadge}>
                      <Text style={styles.actionBadgeText}>
                        {action.badge > 9 ? '9+' : action.badge}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={styles.actionLabel}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Today's Call Plan ── */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Today's Call Plan</Text>
            <TouchableOpacity onPress={() => navigation.navigate('TourPlan' as any)}>
              <Text style={styles.sectionLink}>View Plan</Text>
            </TouchableOpacity>
          </View>

          {!todayPlan ? (
            <View style={styles.emptyCard}>
              <MaterialCommunityIcons name="calendar-blank-outline" size={36} color={COLORS.textDisabled} />
              <Text style={styles.emptyTitle}>No plan for today</Text>
              <Text style={styles.emptySubtitle}>Add today's schedule in Tour Plan</Text>
            </View>
          ) : todayPlan.activityType !== 'FIELD_WORK' ? (
            <View style={styles.emptyCard}>
              <MaterialCommunityIcons name="briefcase-outline" size={36} color={COLORS.textDisabled} />
              <Text style={styles.emptyTitle}>{todayPlan.activityType.replace('_', ' ')}</Text>
              {todayPlan.notes ? <Text style={styles.emptySubtitle}>{todayPlan.notes}</Text> : null}
            </View>
          ) : contactsOfDetail(todayPlan).length === 0 ? (
            <View style={styles.emptyCard}>
              <MaterialCommunityIcons name="calendar-check-outline" size={36} color={COLORS.textDisabled} />
              <Text style={styles.emptyTitle}>No doctors or chemists planned today</Text>
              {todayPlan.estimatedCalls > 0 && (
                <Text style={styles.emptySubtitle}>{todayPlan.estimatedCalls} estimated calls</Text>
              )}
            </View>
          ) : (
            contactsOfDetail(todayPlan)
              .slice(0, showAllPlanContacts ? undefined : PLAN_CONTACTS_PREVIEW)
              .map(contact => {
              // Match today's visit to the planned doctor, chemist or stockist
              const visitForContact = todayVisits.find(v =>
                contact.kind === 'chemist' ? v.chemistId === contact.id
                  : contact.kind === 'stockist' ? v.stockistId === contact.id
                    : v.doctorId === contact.id);
              const isDone = visitForContact && (visitForContact.status === 'Checked-Out' || visitForContact.status === 'Completed');
              const isActive = visitForContact?.status === 'Checked-In';
              const name = contact.kind === 'doctor' ? contactLabel(contact) : contact.name;
              const initials = contact.name.replace(/^dr\.?\s+/i, '').split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
              const kindLabel = contact.kind === 'chemist' ? 'Chemist' : contact.kind === 'stockist' ? 'Stockist' : 'Doctor';

              // Already visited / in progress → open that visit; otherwise log one with the party pre-filled
              const openContact = () => {
                if (visitForContact) {
                  navigation.navigate('Visits' as any, {
                    screen: 'VisitDetail',
                    params: { visitId: visitForContact.id },
                    initial: false,
                  } as any);
                  return;
                }
                navigation.navigate('Visits' as any, {
                  screen: 'LogVisit',
                  params: {
                    doctorId: contact.kind === 'doctor' ? contact.id : undefined,
                    chemistId: contact.kind === 'chemist' ? contact.id : undefined,
                    stockistId: contact.kind === 'stockist' ? contact.id : undefined,
                    fromPlan: true,
                    returnTo: 'Dashboard',
                  },
                  initial: false,
                } as any);
              };

              return (
                <TouchableOpacity key={contact.id} style={styles.doctorCard} onPress={openContact} activeOpacity={0.7}>
                  {isDone ? (
                    <View style={styles.docAvatarDone}>
                      <MaterialCommunityIcons name="check" size={20} color="#047857" />
                    </View>
                  ) : (
                    <View style={[styles.docAvatar, !!isActive && styles.docAvatarActive]}>
                      <Text style={[styles.docAvatarText, !!isActive && styles.docAvatarTextActive]}>
                        {initials}
                      </Text>
                    </View>
                  )}
                  <View style={styles.docInfo}>
                    <Text style={styles.docName}>{name}</Text>
                    <Text style={styles.docSpec}>{kindLabel}</Text>
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
                    <View style={[styles.docBadge, styles.badgePending, styles.badgeLogVisit]}>
                      <Text style={styles.badgePendingText}>Log Visit</Text>
                      <MaterialCommunityIcons name="chevron-right" size={14} color={styles.badgePendingText.color} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })
          )}

          {/* Expand / collapse when the plan has more contacts than the preview shows */}
          {todayPlan?.activityType === 'FIELD_WORK' && contactsOfDetail(todayPlan).length > PLAN_CONTACTS_PREVIEW && (
            <TouchableOpacity
              style={styles.moreContactsRow}
              onPress={() => setShowAllPlanContacts(prev => !prev)}
              activeOpacity={0.7}
            >
              <Text style={styles.moreContactsText}>
                {showAllPlanContacts
                  ? 'Show less'
                  : `+${contactsOfDetail(todayPlan).length - PLAN_CONTACTS_PREVIEW} more`}
              </Text>
              <MaterialCommunityIcons
                name={showAllPlanContacts ? 'chevron-up' : 'chevron-down'}
                size={18}
                color={COLORS.primary}
              />
            </TouchableOpacity>
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
     paddingTop is applied inline using useSafeAreaInsets so it is exact on
     every device (notches, Dynamic Island, gesture bars, etc.). */
  header: {
    backgroundColor: COLORS.primary,
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
  hqRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  hqText: {
    fontSize: SIZES.fontSM,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500',
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
  punchBtnDisabled: {
    backgroundColor: COLORS.textDisabled,
    shadowOpacity: 0,
    elevation: 0,
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
  metricCaption: {
    fontSize: SIZES.fontXS,
    color: COLORS.textDisabled,
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
  // 6 actions → two rows of three
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 16,
    marginBottom: SIZES.paddingMD,
  },
  actionItem: {
    width: '33.33%',
    alignItems: 'center',
    gap: 8,
  },
  actionIconWrapper: {
    position: 'relative',
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
  actionBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.error,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: COLORS.background,
  },
  actionBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textWhite,
  },
  actionLabel: {
    fontSize: SIZES.fontXS,
    color: COLORS.textPrimary,
    fontWeight: '600',
    textAlign: 'center',
    maxWidth: 90,
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
  badgeLogVisit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  moreContactsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: SIZES.paddingSM,
    marginBottom: SIZES.paddingSM,
  },
  moreContactsText: {
    fontSize: SIZES.fontSM,
    fontWeight: '600',
    color: COLORS.primary,
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
