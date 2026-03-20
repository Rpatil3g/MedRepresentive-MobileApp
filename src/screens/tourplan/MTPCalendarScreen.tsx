import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  FlatList,
  Dimensions,

} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Loading } from '../../components/common';
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
import {
  ActivityType,
  DayPlan,
  PlanStatus,
  TourPlanDetailInput,
  TourPlanDetailResponse,
} from '../../types/tourPlan.types';

type Nav = StackNavigationProp<TourPlanStackParamList, 'MTPCalendar'>;

// ── Constants ────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];


const STATUS_COLOR: Record<PlanStatus | 'none', string> = {
  none: COLORS.textSecondary,
  DRAFT: '#f59e0b',
  PENDING: COLORS.primary,
  APPROVED: '#10b981',
  REJECTED: '#ef4444',
};
const STATUS_BG: Record<PlanStatus | 'none', string> = {
  none: COLORS.surface,
  DRAFT: '#fef3c7',
  PENDING: COLORS.primaryLight,
  APPROVED: '#d1fae5',
  REJECTED: '#fee2e2',
};
const STATUS_LABEL: Record<PlanStatus | 'none', string> = {
  none: 'Saved',
  DRAFT: 'Draft',
  PENDING: 'Pending Approval',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
};

// ── Calendar sizing ──────────────────────────────────────────────────────────

const SCREEN_W = Dimensions.get('window').width;
const STRIP_W = SCREEN_W - SIZES.paddingMD * 2; // date strip page width (inside scroll padding)
const CAL_H_PAD = SIZES.paddingMD * 2;
const CELL_GAP = 3;
const CELL_W = Math.floor((SCREEN_W - CAL_H_PAD - CELL_GAP * 6) / 7);
const CELL_H = CELL_W + 10; // slightly taller than wide

// ── Date helpers ─────────────────────────────────────────────────────────────

const toDateStr = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const todayStr = (): string => toDateStr(new Date());

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

type WeekDay = { label: string; date: string; dayNum: number; inMonth: boolean };

/** Returns Mon–Fri weeks that cover the given month */
const getWeeksForMonth = (month: number, year: number): WeekDay[][] => {
  const weeks: WeekDay[][] = [];
  const firstDay = new Date(year, month - 1, 1);
  const firstDow = firstDay.getDay(); // 0=Sun
  const startMonday = new Date(firstDay);
  startMonday.setDate(firstDay.getDate() - (firstDow === 0 ? 6 : firstDow - 1));

  const cursor = new Date(startMonday);
  while (true) {
    const week: WeekDay[] = [];
    for (let i = 0; i < 5; i++) { // Mon–Fri only
      const d = new Date(cursor);
      d.setDate(cursor.getDate() + i);
      week.push({
        label: DAY_NAMES[d.getDay()],
        date: toDateStr(d),
        dayNum: d.getDate(),
        inMonth: d.getMonth() === month - 1 && d.getFullYear() === year,
      });
    }
    if (week.some(d => d.inMonth)) weeks.push(week);
    cursor.setDate(cursor.getDate() + 7);
    if (cursor.getFullYear() > year || (cursor.getFullYear() === year && cursor.getMonth() > month - 1)) break;
  }
  return weeks;
};

// ── Cell label computation ────────────────────────────────────────────────────

type CellStyle = 'visit' | 'meeting' | 'leave' | 'pending';

const getCellInfo = (
  dateStr: string,
  dayInfo: DayPlan | undefined,
  draftEntries: Record<string, any>,
  planDetails: TourPlanDetailResponse[],
): { text: string; style: CellStyle } | null => {
  if (!dayInfo || dayInfo.isWeekend || dayInfo.isHoliday) return null;

  const draft = draftEntries[dateStr];
  const detail = planDetails.find(d => d.planDate.startsWith(dateStr));
  const activity: ActivityType | undefined =
    draft?.activityType ?? detail?.activityType ??
    (dayInfo.isPlanned ? dayInfo.activityType : undefined);
  const calls: number = draft?.estimatedCalls ?? detail?.estimatedCalls ?? dayInfo.estimatedCalls ?? 0;

  if (activity) {
    switch (activity) {
      case 'FIELD_WORK': return { text: calls > 0 ? `${calls} VIS` : 'WORK', style: 'visit' };
      case 'MEETING':    return { text: 'MEET', style: 'meeting' };
      case 'TRAINING':   return { text: 'TRAIN', style: 'meeting' };
      case 'LEAVE':      return { text: 'LEAVE', style: 'leave' };
      case 'HOLIDAY':    return { text: 'HOL', style: 'leave' };
    }
  }
  return { text: 'PEND', style: 'pending' };
};

// ── Monthly grid builder ──────────────────────────────────────────────────────

type CalCell = {
  key: string;
  type: 'prev' | 'current' | 'next';
  day: number;
  dateStr?: string;
  dayInfo?: DayPlan;
  cellInfo?: { text: string; style: CellStyle } | null;
  isToday?: boolean;
};

const buildCalendarRows = (
  month: number,
  year: number,
  calendar: any,
  draftEntries: Record<string, any>,
  planDetails: TourPlanDetailResponse[],
  today: string,
): CalCell[][] => {
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDow = new Date(year, month - 1, 1).getDay(); // 0=Sun
  const prevMonthDays = new Date(year, month - 1, 0).getDate();

  const cells: CalCell[] = [];

  // Offset cells (previous month, greyed out)
  for (let i = firstDow - 1; i >= 0; i--) {
    cells.push({ key: `prev-${i}`, type: 'prev', day: prevMonthDays - i });
  }

  // Current month
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dayInfo = calendar?.days?.find((day: DayPlan) => day.date.startsWith(dateStr));
    const cellInfo = getCellInfo(dateStr, dayInfo, draftEntries, planDetails);
    cells.push({
      key: dateStr,
      type: 'current',
      day: d,
      dateStr,
      dayInfo,
      cellInfo,
      isToday: dateStr === today,
    });
  }

  // Pad to complete last row
  const remaining = (7 - (cells.length % 7)) % 7;
  for (let i = 1; i <= remaining; i++) {
    cells.push({ key: `next-${i}`, type: 'next', day: i });
  }

  // Split into rows of 7
  const rows: CalCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7));
  }
  return rows;
};

// ── Component ─────────────────────────────────────────────────────────────────

const MTPCalendarScreen: React.FC = () => {
  const navigation = useNavigation<Nav>();
  const dispatch = useAppDispatch();
  const { currentPlan, calendar, draftEntries, viewMonth, viewYear, loading, saving } =
    useAppSelector((s: any) => s.tourPlan);

  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [selectedDate, setSelectedDate] = useState<string>(todayStr());
  const dateStripRef = useRef<FlatList<WeekDay[]>>(null);

  // Scroll date strip to the week containing selectedDate when month changes
  useEffect(() => {
    const weeks = getWeeksForMonth(viewMonth, viewYear);
    const idx = weeks.findIndex(w => w.some(d => d.date === selectedDate));
    const target = idx >= 0 ? idx : 0;
    setTimeout(() => dateStripRef.current?.scrollToIndex({ index: target, animated: false }), 80);
  }, [viewMonth, viewYear]);

  useFocusEffect(
    useCallback(() => {
      loadMonthData(viewMonth, viewYear);
    }, [viewMonth, viewYear]),
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
      if (plan?.approvalStatus === 'DRAFT') {
        dispatch(loadDraftFromPlan(plan));
      } else if (!plan) {
        dispatch(clearDraft());
      }
    } catch (err) {
      console.error('Failed to load month data:', err);
    } finally {
      dispatch(setLoading(false));
    }
  };

  const goToPrevMonth = () => {
    let m = viewMonth - 1, y = viewYear;
    if (m < 1) { m = 12; y--; }
    dispatch(setViewMonth({ month: m, year: y }));
  };

  const goToNextMonth = () => {
    let m = viewMonth + 1, y = viewYear;
    if (m > 12) { m = 1; y++; }
    dispatch(setViewMonth({ month: m, year: y }));
  };

  const canEdit = !currentPlan ||
    currentPlan.approvalStatus === 'DRAFT' ||
    currentPlan.approvalStatus === 'REJECTED';

  const planStatus: PlanStatus | 'none' = currentPlan?.approvalStatus ?? 'none';

  const navigateToDayForm = (date: string) => {
    const dayInfo = calendar?.days?.find((d: DayPlan) => d.date.startsWith(date));
    if (dayInfo?.isWeekend || dayInfo?.isHoliday) return;
    if (planStatus === 'APPROVED' || planStatus === 'PENDING') {
      Alert.alert(
        'Plan Locked',
        planStatus === 'APPROVED'
          ? 'This plan is approved and cannot be edited.'
          : 'This plan is pending approval.',
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

  const handleSaveDraft = async () => {
    if (Object.keys(draftEntries).length === 0) {
      Alert.alert('Nothing to Save', 'Please plan at least one day before saving.');
      return;
    }
    try {
      dispatch(setSaving(true));
      const details: TourPlanDetailInput[] = Object.values(draftEntries).map((e: any) => ({
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
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.message || 'Failed to save.');
    } finally {
      dispatch(setSaving(false));
    }
  };

  const handleSubmit = async () => {
    if (!currentPlan) {
      // If there are unsaved drafts, save first
      if (Object.keys(draftEntries).length > 0) {
        Alert.alert('Save First', 'Please save your plan as a draft before submitting.');
      } else {
        Alert.alert('No Plan', 'Please add plans for at least one day before submitting.');
      }
      return;
    }
    if (planStatus !== 'DRAFT') {
      Alert.alert('Cannot Submit', 'Only a Draft plan can be submitted for approval.');
      return;
    }
    Alert.alert(
      'Submit Tour Plan',
      `Submit the tour plan for ${MONTH_NAMES[viewMonth - 1]} ${viewYear} for manager approval? It cannot be edited after submission.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          onPress: async () => {
            try {
              dispatch(setSaving(true));
              const submitted = await tourPlanApi.submit(currentPlan.id);
              dispatch(setCurrentPlan(submitted));
              Alert.alert('Submitted', 'Tour plan submitted for approval.');
            } catch (err: any) {
              Alert.alert('Error', err?.response?.data?.message || 'Submission failed.');
            } finally {
              dispatch(setSaving(false));
            }
          },
        },
      ],
    );
  };

  // ── Weekly view ───────────────────────────────────────────────────────────

  const weeks = getWeeksForMonth(viewMonth, viewYear);
  const today = todayStr();
  const initialWeekIndex = Math.max(0, weeks.findIndex(w => w.some(d => d.date === today)));

  const renderWeeklyView = () => {
    const draft = draftEntries[selectedDate];
    const detail = currentPlan?.details?.find((d: TourPlanDetailResponse) => d.planDate.startsWith(selectedDate));
    const hasPlan = !!(draft || detail);
    const dayInfo = calendar?.days?.find((d: DayPlan) => d.date.startsWith(selectedDate));
    const isBlocked = dayInfo?.isWeekend || dayInfo?.isHoliday;

    return (
      <>
        {/* Paged date strip — each page = one Mon–Fri week */}
        <FlatList
          ref={dateStripRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          data={weeks}
          keyExtractor={(_, i) => `week-${i}`}
          style={styles.dateStripList}
          initialScrollIndex={initialWeekIndex}
          getItemLayout={(_, index) => ({ length: STRIP_W, offset: STRIP_W * index, index })}
          renderItem={({ item: weekDays }) => (
            <View style={styles.weekRow}>
              {weekDays.map(({ label, date, dayNum, inMonth }) => {
                const isSelected = date === selectedDate;
                const isToday = date === today;
                return (
                  <TouchableOpacity
                    key={date}
                    style={[
                      styles.dateCard,
                      isSelected && styles.dateCardActive,
                      !inMonth && styles.dateCardOtherMonth,
                    ]}
                    onPress={() => setSelectedDate(date)}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.dateCardDay, isSelected && styles.dateCardDayActive]}>
                      {label}
                    </Text>
                    <Text style={[
                      styles.dateCardNum,
                      isSelected && styles.dateCardNumActive,
                      isToday && !isSelected && styles.dateCardNumToday,
                    ]}>
                      {dayNum}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        />

        {/* Itinerary header */}
        <View style={styles.itineraryHeader}>
          <Text style={styles.itineraryTitle}>Planned Itinerary</Text>
          <Text style={styles.itineraryCount}>
            {hasPlan ? '1 Location' : '0 Locations'}
          </Text>
        </View>

        {/* Plan content */}
        {isBlocked ? (
          <View style={styles.emptyCard}>
            <MaterialCommunityIcons name="calendar-weekend" size={32} color={COLORS.textDisabled} />
            <Text style={styles.emptyTitle}>Weekend / Holiday</Text>
          </View>
        ) : hasPlan ? (
          <View style={[
            styles.planItem,
            { borderLeftColor: detail ? STATUS_COLOR[planStatus] : '#f59e0b' },
          ]}>
            <View style={styles.planItemHeader}>
              <Text style={styles.planItemTitle}>
                {draft?.routeName ?? detail?.routeName ?? 'Field Day'}
              </Text>
              <View style={[
                styles.planBadge,
                { backgroundColor: detail ? STATUS_BG[planStatus] : '#fef3c7' },
              ]}>
                <Text style={[
                  styles.planBadgeText,
                  { color: detail ? STATUS_COLOR[planStatus] : '#b45309' },
                ]}>
                  {detail ? STATUS_LABEL[planStatus] : 'Draft'}
                </Text>
              </View>
            </View>

            <View style={styles.planItemDetails}>
              {detail && (detail.plannedDoctorIds.length > 0 || detail.plannedChemistIds.length > 0) && (
                <View style={styles.planDetailRow}>
                  <MaterialCommunityIcons name="hospital-box-outline" size={15} color={COLORS.textSecondary} />
                  <Text style={styles.planDetailText}>
                    {[
                      detail.plannedDoctorIds.length > 0 ? `${detail.plannedDoctorIds.length} Doctors` : '',
                      detail.plannedChemistIds.length > 0 ? `${detail.plannedChemistIds.length} Chemists` : '',
                    ].filter(Boolean).join(', ')}
                  </Text>
                </View>
              )}

              {(detail?.estimatedCalls ?? draft?.estimatedCalls ?? 0) > 0 && (
                <View style={styles.planDetailRow}>
                  <MaterialCommunityIcons name="phone-outline" size={15} color={COLORS.textSecondary} />
                  <Text style={styles.planDetailText}>
                    {detail?.estimatedCalls ?? draft?.estimatedCalls} Estimated Calls
                  </Text>
                </View>
              )}

              {!detail && draft && (
                <View style={styles.planDetailRow}>
                  <MaterialCommunityIcons name="briefcase-outline" size={15} color={COLORS.textSecondary} />
                  <Text style={styles.planDetailText}>
                    {draft.activityType?.replace('_', ' ') ?? 'Field Work'}
                  </Text>
                </View>
              )}

              {(draft?.notes || detail?.notes) ? (
                <View style={styles.planDetailRow}>
                  <MaterialCommunityIcons name="note-text-outline" size={15} color={COLORS.textSecondary} />
                  <Text style={styles.planDetailText} numberOfLines={1}>
                    {draft?.notes ?? detail?.notes}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.emptyCard}
            onPress={() => canEdit && navigateToDayForm(selectedDate)}
            activeOpacity={0.75}
          >
            <MaterialCommunityIcons name="calendar-plus" size={32} color={COLORS.textDisabled} />
            <Text style={styles.emptyTitle}>No plan for this day</Text>
            {canEdit && <Text style={styles.emptySubtitle}>Tap + to add a plan</Text>}
          </TouchableOpacity>
        )}

        {/* Rejected remarks */}
        {currentPlan?.approvalStatus === 'REJECTED' && currentPlan.approverRemarks && (
          <View style={styles.remarksCard}>
            <MaterialCommunityIcons name="alert-circle" size={16} color={COLORS.error} />
            <Text style={styles.remarksText}>{currentPlan.approverRemarks}</Text>
          </View>
        )}

        {/* Save draft button (only in week view) */}
        {canEdit && Object.keys(draftEntries).length > 0 && (
          <TouchableOpacity style={styles.saveDraftBtn} onPress={handleSaveDraft} activeOpacity={0.85}>
            <MaterialCommunityIcons name="content-save-outline" size={18} color={COLORS.primary} />
            <Text style={styles.saveDraftBtnText}>Save as Draft</Text>
          </TouchableOpacity>
        )}
      </>
    );
  };

  // ── Monthly view ──────────────────────────────────────────────────────────

  const renderMonthlyView = () => {
    const rows = buildCalendarRows(
      viewMonth, viewYear, calendar, draftEntries,
      currentPlan?.details ?? [], today,
    );
    const canSubmit = !!currentPlan && planStatus === 'DRAFT';

    return (
      <>
        {/* Day-of-week headers */}
        <View style={styles.calDayHeaders}>
          {DAY_LETTERS.map((l, i) => (
            <View key={i} style={styles.calDayHeader}>
              <Text style={styles.calDayHeaderText}>{l}</Text>
            </View>
          ))}
        </View>

        {/* Calendar rows */}
        {rows.map((row, rowIdx) => (
          <View key={rowIdx} style={styles.calRow}>
            {row.map(cell => {
              const isDisabled =
                cell.type !== 'current' ||
                cell.dayInfo?.isWeekend ||
                cell.dayInfo?.isHoliday;

              return (
                <TouchableOpacity
                  key={cell.key}
                  style={[
                    styles.calCell,
                    isDisabled && styles.calCellDisabled,
                    cell.isToday && styles.calCellToday,
                  ]}
                  onPress={() => cell.dateStr && !isDisabled && navigateToDayForm(cell.dateStr)}
                  disabled={isDisabled || cell.type !== 'current'}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.calDate,
                    isDisabled && styles.calDateDisabled,
                    cell.isToday && styles.calDateToday,
                  ]}>
                    {cell.day}
                  </Text>
                  {cell.cellInfo && (
                    <Text style={[styles.calLabel, styles[`calLabel_${cell.cellInfo.style}` as keyof typeof styles] as any]}>
                      {cell.cellInfo.text}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}

        {/* Rejected remarks */}
        {currentPlan?.approvalStatus === 'REJECTED' && currentPlan.approverRemarks && (
          <View style={[styles.remarksCard, { marginTop: SIZES.paddingMD }]}>
            <MaterialCommunityIcons name="alert-circle" size={16} color={COLORS.error} />
            <Text style={styles.remarksText}>{currentPlan.approverRemarks}</Text>
          </View>
        )}

        {/* Save draft button */}
        {canEdit && Object.keys(draftEntries).length > 0 && (
          <TouchableOpacity
            style={[styles.saveDraftBtn, { marginTop: SIZES.paddingMD }]}
            onPress={handleSaveDraft}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons name="content-save-outline" size={18} color={COLORS.primary} />
            <Text style={styles.saveDraftBtnText}>Save as Draft</Text>
          </TouchableOpacity>
        )}

        {/* Submit Plan for Approval button */}
        <TouchableOpacity
          style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons name="send" size={18} color={COLORS.textWhite} />
          <Text style={styles.submitBtnText}>Submit Plan for Approval</Text>
        </TouchableOpacity>
      </>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      {/* Custom white header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Monthly Tour Plan</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('MTPSummary')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MaterialCommunityIcons name="filter-variant" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Month selector */}
      <View style={styles.monthSelector}>
        <TouchableOpacity style={styles.monthNavBtn} onPress={goToPrevMonth} activeOpacity={0.7}>
          <MaterialCommunityIcons name="chevron-left" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.monthText}>{MONTH_NAMES[viewMonth - 1]} {viewYear}</Text>
        <TouchableOpacity style={styles.monthNavBtn} onPress={goToNextMonth} activeOpacity={0.7}>
          <MaterialCommunityIcons name="chevron-right" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Week / Month toggle */}
      <View style={styles.toggleRow}>
        <View style={styles.toggle}>
          {(['week', 'month'] as const).map(mode => (
            <TouchableOpacity
              key={mode}
              style={[styles.toggleBtn, viewMode === mode && styles.toggleBtnActive]}
              onPress={() => setViewMode(mode)}
            >
              <Text style={[styles.toggleBtnText, viewMode === mode && styles.toggleBtnTextActive]}>
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {viewMode === 'week' ? renderWeeklyView() : renderMonthlyView()}
        </ScrollView>
      )}

      {/* FAB */}
      {canEdit && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigateToDayForm(selectedDate)}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons name="plus" size={28} color={COLORS.textWhite} />
        </TouchableOpacity>
      )}

      <Loading visible={saving} />
    </View>
  );
};

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.backgroundGray },

  /* Custom header */
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    paddingHorizontal: SIZES.paddingLG,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: SIZES.fontXL,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },

  /* Month selector */
  monthSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    paddingHorizontal: SIZES.paddingLG,
    paddingVertical: SIZES.paddingMD,
  },
  monthNavBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: COLORS.backgroundGray,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthText: {
    fontSize: SIZES.fontLG,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },

  /* Week/Month toggle */
  toggleRow: {
    alignItems: 'center',
    backgroundColor: COLORS.background,
    paddingBottom: SIZES.paddingMD,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  toggle: {
    flexDirection: 'row',
    backgroundColor: COLORS.border,
    borderRadius: 10,
    padding: 3,
  },
  toggleBtn: {
    paddingHorizontal: SIZES.paddingLG,
    paddingVertical: 6,
    borderRadius: 8,
  },
  toggleBtnActive: {
    backgroundColor: COLORS.background,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleBtnText: {
    fontSize: SIZES.fontSM,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  toggleBtnTextActive: {
    color: COLORS.primary,
  },

  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  scrollContent: { padding: SIZES.paddingMD, paddingBottom: 110 },

  /* Weekly — paged date strip */
  dateStripList: {
    marginBottom: SIZES.paddingMD,
  },
  weekRow: {
    width: STRIP_W,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dateCard: {
    flex: 1,
    marginHorizontal: 3,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    gap: 4,
  },
  dateCardOtherMonth: {
    opacity: 0.35,
  },
  dateCardActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  dateCardDay: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    color: COLORS.textSecondary,
  },
  dateCardDayActive: { color: 'rgba(255,255,255,0.85)' },
  dateCardNum: {
    fontSize: SIZES.font2XL,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  dateCardNumActive: { color: COLORS.textWhite },
  dateCardNumToday: { color: COLORS.primary },

  /* Weekly — itinerary header */
  itineraryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.paddingMD,
  },
  itineraryTitle: {
    fontSize: SIZES.fontMD,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  itineraryCount: {
    fontSize: SIZES.fontSM,
    color: COLORS.textSecondary,
  },

  /* Plan item card */
  planItem: {
    backgroundColor: COLORS.background,
    borderRadius: 16,
    padding: SIZES.paddingMD,
    marginBottom: SIZES.paddingSM,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  planItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  planItemTitle: {
    fontSize: SIZES.fontMD,
    fontWeight: '700',
    color: COLORS.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  planBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  planBadgeText: {
    fontSize: SIZES.fontXS,
    fontWeight: '700',
  },
  planItemDetails: { gap: 6 },
  planDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  planDetailText: {
    fontSize: SIZES.fontSM,
    color: COLORS.textSecondary,
    flex: 1,
  },

  /* Empty / no plan card */
  emptyCard: {
    backgroundColor: COLORS.background,
    borderRadius: 16,
    padding: SIZES.paddingLG,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SIZES.paddingSM,
  },
  emptyTitle: {
    fontSize: SIZES.fontMD,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  emptySubtitle: {
    fontSize: SIZES.fontXS,
    color: COLORS.textDisabled,
  },

  /* Rejected remarks */
  remarksCard: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: '#fee2e2',
    borderRadius: 12,
    padding: SIZES.paddingMD,
    alignItems: 'flex-start',
    marginBottom: SIZES.paddingSM,
  },
  remarksText: {
    fontSize: SIZES.fontSM,
    color: '#991b1b',
    flex: 1,
    lineHeight: 20,
  },

  /* Save draft button */
  saveDraftBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: SIZES.paddingSM,
    backgroundColor: COLORS.background,
  },
  saveDraftBtnText: {
    fontSize: SIZES.fontMD,
    fontWeight: '600',
    color: COLORS.primary,
  },

  /* Monthly — day headers */
  calDayHeaders: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  calDayHeader: {
    width: CELL_W,
    alignItems: 'center',
    paddingVertical: 4,
  },
  calDayHeaderText: {
    fontSize: SIZES.fontXS,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },

  /* Monthly — calendar grid */
  calRow: {
    flexDirection: 'row',
    gap: CELL_GAP,
    marginBottom: CELL_GAP,
  },
  calCell: {
    width: CELL_W,
    height: CELL_H,
    borderRadius: 8,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 4,
    gap: 2,
  },
  calCellDisabled: {
    opacity: 0.35,
    backgroundColor: 'transparent',
    borderColor: 'transparent',
  },
  calCellToday: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  calDate: {
    fontSize: SIZES.fontSM,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  calDateDisabled: { color: COLORS.textSecondary },
  calDateToday: { color: COLORS.primary },
  calLabel: {
    fontSize: 8,
    fontWeight: '700',
    paddingHorizontal: 2,
    paddingVertical: 1,
    borderRadius: 4,
    textTransform: 'uppercase',
    overflow: 'hidden',
    letterSpacing: -0.3,
    width: CELL_W - 6,
    textAlign: 'center',
  },
  calLabel_visit: {
    backgroundColor: '#d1fae5',
    color: '#047857',
  },
  calLabel_leave: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
  },
  calLabel_meeting: {
    backgroundColor: '#e0e7ff',
    color: '#3730a3',
  },
  calLabel_pending: {
    backgroundColor: 'transparent',
    color: COLORS.textDisabled,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
  },

  /* Submit button */
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    paddingVertical: 16,
    marginTop: SIZES.paddingMD,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  submitBtnDisabled: {
    opacity: 0.45,
    shadowOpacity: 0,
    elevation: 0,
  },
  submitBtnText: {
    fontSize: SIZES.fontMD,
    fontWeight: '700',
    color: COLORS.textWhite,
  },

  /* FAB */
  fab: {
    position: 'absolute',
    bottom: 16,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
});

export default MTPCalendarScreen;
