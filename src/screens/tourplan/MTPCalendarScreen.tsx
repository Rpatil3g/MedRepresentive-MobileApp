import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Card, Button, Loading } from '../../components/common';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  setCurrentPlan,
  setCalendar,
  setLoading,
  setSaving,
  loadDraftFromPlan,
  clearDraft,
  setViewMonth,
} from '../../store/slices/tourPlanSlice';
import tourPlanApi from '../../services/api/tourPlanApi';
import { COLORS, SIZES } from '../../constants';
import { TourPlanStackParamList } from '../../types/navigation.types';
import { ActivityType, DayPlan, PlanStatus, TourPlanDetailInput } from '../../types/tourPlan.types';

type Nav = StackNavigationProp<TourPlanStackParamList, 'MTPCalendar'>;

// Color coding per spec: Grey=empty, Yellow=Draft, Green=Approved, Red=Rejected
const STATUS_COLORS: Record<PlanStatus | 'none', string> = {
  none: COLORS.textSecondary,
  DRAFT: '#F59E0B',
  PENDING: '#3B82F6',
  APPROVED: '#16A34A',
  REJECTED: '#DC2626',
};

const ACTIVITY_COLORS: Record<ActivityType, string> = {
  FIELD_WORK: COLORS.primary,
  MEETING: '#7C3AED',
  TRAINING: '#0891B2',
  LEAVE: '#9CA3AF',
  HOLIDAY: '#9CA3AF',
};

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

const MTPCalendarScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const dispatch = useAppDispatch();
  const { currentPlan, calendar, draftEntries, viewMonth, viewYear, loading, saving } =
    useAppSelector(s => s.tourPlan);

  useFocusEffect(
    useCallback(() => {
      loadMonthData(viewMonth, viewYear);
    }, [viewMonth, viewYear])
  );

  const loadMonthData = async (month: number, year: number) => {
    try {
      dispatch(setLoading(true));
      const [plan, cal] = await Promise.all([
        tourPlanApi.getMyPlanByMonth(month, year).catch(() => null),
        tourPlanApi.getMonthlyCalendar(month, year).catch(() => null),
      ]);

      dispatch(setCurrentPlan(plan));
      dispatch(setCalendar(cal));

      if (plan && plan.approvalStatus === 'DRAFT') {
        dispatch(loadDraftFromPlan(plan));
      } else if (!plan) {
        dispatch(clearDraft());
      }
    } catch (error) {
      console.error('Failed to load month data:', error);
    } finally {
      dispatch(setLoading(false));
    }
  };

  const goToPrevMonth = () => {
    let m = viewMonth - 1;
    let y = viewYear;
    if (m < 1) { m = 12; y -= 1; }
    dispatch(setViewMonth({ month: m, year: y }));
  };

  const goToNextMonth = () => {
    let m = viewMonth + 1;
    let y = viewYear;
    if (m > 12) { m = 1; y += 1; }
    dispatch(setViewMonth({ month: m, year: y }));
  };

  // Build marked dates for the calendar
  const buildMarkedDates = () => {
    const marked: Record<string, any> = {};
    const planStatus = currentPlan?.approvalStatus;

    if (calendar) {
      for (const day of calendar.days) {
        const key = day.date.split('T')[0];

        if (day.isWeekend || day.isHoliday) {
          marked[key] = { disabled: true, disableTouchEvent: true, textColor: COLORS.textSecondary };
          continue;
        }

        if (day.isPlanned && planStatus) {
          marked[key] = {
            marked: true,
            dotColor: STATUS_COLORS[planStatus],
            customStyles: {
              container: { backgroundColor: `${STATUS_COLORS[planStatus]}22` },
              text: { color: COLORS.textPrimary, fontWeight: '600' },
            },
          };
        } else if (draftEntries[key]) {
          // Locally drafted but not saved yet
          marked[key] = {
            marked: true,
            dotColor: STATUS_COLORS['DRAFT'],
            customStyles: {
              container: { backgroundColor: '#F59E0B22' },
              text: { color: COLORS.textPrimary },
            },
          };
        }
      }
    }

    return marked;
  };

  const handleDayPress = (day: DateData) => {
    const date = day.dateString;
    const dayInfo = calendar?.days.find(d => d.date.startsWith(date));

    // Block Sundays and holidays
    if (dayInfo?.isWeekend || dayInfo?.isHoliday) return;

    // Block if plan is approved or pending
    if (currentPlan?.approvalStatus === 'APPROVED' || currentPlan?.approvalStatus === 'PENDING') {
      Alert.alert(
        'Plan Locked',
        currentPlan.approvalStatus === 'APPROVED'
          ? 'This plan has been approved and cannot be edited.'
          : 'This plan is pending approval and cannot be edited.'
      );
      return;
    }

    navigation.navigate('DayPlanForm', {
      date,
      month: viewMonth,
      year: viewYear,
      existingEntry: draftEntries[date],
    });
  };

  const workingDays = calendar?.days.filter(d => !d.isWeekend && !d.isHoliday) ?? [];
  const plannedCount = Object.keys(draftEntries).length +
    (currentPlan?.approvalStatus !== 'DRAFT' ? (currentPlan?.plannedDays ?? 0) : 0);
  const draftCount = Object.keys(draftEntries).length;
  const allFilled = workingDays.length > 0 && draftCount === workingDays.length;
  const canEdit = !currentPlan ||
    currentPlan.approvalStatus === 'DRAFT' ||
    currentPlan.approvalStatus === 'REJECTED';

  const handleSaveDraft = async () => {
    if (Object.keys(draftEntries).length === 0) {
      Alert.alert('Nothing to Save', 'Please plan at least one day before saving.');
      return;
    }
    try {
      dispatch(setSaving(true));
      const details: TourPlanDetailInput[] = Object.values(draftEntries).map(e => ({
        planDate: e.date,
        activityType: e.activityType,
        routeId: e.routeId,
        estimatedCalls: e.estimatedCalls,
        notes: e.notes,
        leaveType: e.leaveType,
      }));

      const saved = await tourPlanApi.createOrUpdate({ month: viewMonth, year: viewYear, details });
      dispatch(setCurrentPlan(saved));
      dispatch(loadDraftFromPlan(saved));
      Alert.alert('Saved', 'Tour plan saved as draft.');
    } catch (error: any) {
      Alert.alert('Error', error?.response?.data?.message || 'Failed to save. Please try again.');
    } finally {
      dispatch(setSaving(false));
    }
  };

  const handleSubmit = async () => {
    if (!currentPlan) {
      Alert.alert('Save First', 'Please save your plan before submitting.');
      return;
    }
    Alert.alert(
      'Submit Plan',
      'Once submitted, the plan cannot be edited until your manager reviews it. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          onPress: async () => {
            try {
              dispatch(setSaving(true));
              const submitted = await tourPlanApi.submit(currentPlan.id);
              dispatch(setCurrentPlan(submitted));
              Alert.alert('Submitted', 'Your tour plan has been submitted for approval.');
            } catch (error: any) {
              Alert.alert('Error', error?.response?.data?.message || 'Submission failed.');
            } finally {
              dispatch(setSaving(false));
            }
          },
        },
      ]
    );
  };

  const planStatus = currentPlan?.approvalStatus ?? 'none';
  const statusColor = STATUS_COLORS[planStatus as PlanStatus | 'none'];

  return (
    <View style={styles.container}>
      {/* Month Navigation Header */}
      <View style={styles.monthNav}>
        <TouchableOpacity onPress={goToPrevMonth} style={styles.navBtn}>
          <MaterialCommunityIcons name="chevron-left" size={28} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={styles.monthTitle}>
          <Text style={styles.monthText}>{MONTH_NAMES[viewMonth - 1]} {viewYear}</Text>
          {planStatus !== 'none' && (
            <View style={[styles.statusBadge, { backgroundColor: `${statusColor}22`, borderColor: statusColor }]}>
              <Text style={[styles.statusText, { color: statusColor }]}>{planStatus}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity onPress={goToNextMonth} style={styles.navBtn}>
          <MaterialCommunityIcons name="chevron-right" size={28} color={COLORS.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Progress */}
        <Card style={styles.progressCard}>
          <View style={styles.progressRow}>
            <View style={styles.progressItem}>
              <Text style={styles.progressNum}>{workingDays.length}</Text>
              <Text style={styles.progressLabel}>Working Days</Text>
            </View>
            <View style={styles.progressItem}>
              <Text style={[styles.progressNum, { color: COLORS.primary }]}>{draftCount}</Text>
              <Text style={styles.progressLabel}>Planned</Text>
            </View>
            <View style={styles.progressItem}>
              <Text style={[styles.progressNum, { color: COLORS.warning }]}>
                {workingDays.length - draftCount}
              </Text>
              <Text style={styles.progressLabel}>Remaining</Text>
            </View>
          </View>
          {workingDays.length > 0 && (
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    width: `${Math.min(100, (draftCount / workingDays.length) * 100)}%`,
                    backgroundColor: allFilled ? COLORS.success : COLORS.primary,
                  },
                ]}
              />
            </View>
          )}
        </Card>

        {/* Legend */}
        <View style={styles.legend}>
          {(['DRAFT', 'PENDING', 'APPROVED', 'REJECTED'] as PlanStatus[]).map(s => (
            <View key={s} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: STATUS_COLORS[s] }]} />
              <Text style={styles.legendText}>{s.charAt(0) + s.slice(1).toLowerCase()}</Text>
            </View>
          ))}
        </View>

        {/* Calendar */}
        {loading ? (
          <View style={styles.calendarLoading}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : (
          <Calendar
            current={`${viewYear}-${String(viewMonth).padStart(2, '0')}-01`}
            onDayPress={handleDayPress}
            markedDates={buildMarkedDates()}
            markingType="custom"
            hideArrows
            hideExtraDays
            disableMonthChange
            renderHeader={() => null}
            theme={{
              calendarBackground: COLORS.background,
              selectedDayBackgroundColor: COLORS.primary,
              todayTextColor: COLORS.primary,
              dayTextColor: COLORS.textPrimary,
              textDisabledColor: COLORS.textSecondary,
              dotColor: COLORS.primary,
              arrowColor: COLORS.primary,
            }}
            style={styles.calendar}
          />
        )}

        {/* Approver remarks if rejected */}
        {currentPlan?.approvalStatus === 'REJECTED' && currentPlan.approverRemarks && (
          <Card style={styles.remarksCard}>
            <View style={styles.remarksHeader}>
              <MaterialCommunityIcons name="alert-circle" size={18} color={COLORS.error} />
              <Text style={styles.remarksTitle}>Manager Feedback</Text>
            </View>
            <Text style={styles.remarksText}>{currentPlan.approverRemarks}</Text>
          </Card>
        )}

        {/* Action buttons */}
        {canEdit && (
          <View style={styles.actions}>
            <Button
              title="Save Draft"
              onPress={handleSaveDraft}
              loading={saving}
              disabled={draftCount === 0}
              variant="outlined"
              style={styles.actionBtn}
              icon="content-save"
            />
            <Button
              title="Submit for Approval"
              onPress={handleSubmit}
              loading={saving}
              disabled={!currentPlan || currentPlan.approvalStatus !== 'DRAFT'}
              style={styles.actionBtn}
              icon="send"
            />
          </View>
        )}
      </ScrollView>

      <Loading visible={saving} message="Saving plan..." />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.backgroundGray },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.background,
    paddingHorizontal: SIZES.paddingMD,
    paddingVertical: SIZES.paddingSM,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  navBtn: { padding: SIZES.paddingSM },
  monthTitle: { alignItems: 'center' },
  monthText: { fontSize: SIZES.fontLG, fontWeight: '700', color: COLORS.textPrimary },
  statusBadge: {
    marginTop: 4,
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusText: { fontSize: SIZES.fontXS, fontWeight: '700' },
  scroll: { padding: SIZES.paddingMD, paddingBottom: 100 },
  progressCard: { marginBottom: SIZES.paddingMD },
  progressRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: SIZES.paddingSM },
  progressItem: { alignItems: 'center' },
  progressNum: { fontSize: SIZES.fontXL, fontWeight: '700', color: COLORS.textPrimary },
  progressLabel: { fontSize: SIZES.fontXS, color: COLORS.textSecondary, marginTop: 2 },
  progressBarBg: {
    height: 6,
    backgroundColor: COLORS.border,
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: SIZES.paddingSM,
  },
  progressBarFill: { height: 6, borderRadius: 3 },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: SIZES.paddingSM,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: SIZES.fontXS, color: COLORS.textSecondary },
  calendarLoading: { height: 300, justifyContent: 'center', alignItems: 'center' },
  calendar: {
    borderRadius: SIZES.radiusMD,
    overflow: 'hidden',
    marginBottom: SIZES.paddingMD,
  },
  remarksCard: { marginBottom: SIZES.paddingMD, borderLeftWidth: 3, borderLeftColor: COLORS.error },
  remarksHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  remarksTitle: { fontSize: SIZES.fontMD, fontWeight: '600', color: COLORS.error },
  remarksText: { fontSize: SIZES.fontSM, color: COLORS.textSecondary },
  actions: { gap: SIZES.paddingSM },
  actionBtn: {},
});

export default MTPCalendarScreen;
