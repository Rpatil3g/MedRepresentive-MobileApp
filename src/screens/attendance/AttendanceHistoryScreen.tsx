import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { addMonths, format, getDay, isSameMonth, parseISO, startOfMonth } from 'date-fns';
import attendanceApi from '../../services/api/attendanceApi';
import { AttendanceCalendar, AttendanceDay, AttendanceDayStatus } from '../../types/attendance.types';
import { COLORS, SIZES } from '../../constants';
import { formatTime } from '../../utils/dateUtils';
import { formatWorked } from '../../utils/punch';

const DAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Cell colours per status; null = no fill (today not yet marked, future days)
const STATUS_STYLE: Record<AttendanceDayStatus, { bg: string | null; text: string; label: string }> = {
  Present:      { bg: '#dcfce7', text: '#15803d', label: 'Present' },
  'Half Day':   { bg: '#fef3c7', text: '#b45309', label: 'Half Day' },
  Absent:       { bg: '#fee2e2', text: '#b91c1c', label: 'Absent' },
  'On Duty':    { bg: COLORS.primaryLight, text: COLORS.primary, label: 'On Duty' },
  Leave:        { bg: '#e0e7ff', text: '#4338ca', label: 'Leave' },
  Holiday:      { bg: '#f3e8ff', text: '#7e22ce', label: 'Holiday' },
  'Weekly Off': { bg: '#f3f4f6', text: COLORS.textDisabled, label: 'Weekly Off' },
  'Not Marked': { bg: null, text: COLORS.textPrimary, label: 'Not punched in yet' },
  Upcoming:     { bg: null, text: COLORS.textDisabled, label: 'Upcoming' },
};

const LEGEND: AttendanceDayStatus[] = ['Present', 'Half Day', 'Absent', 'Leave', 'Holiday', 'Weekly Off'];

// Server dates are date-only ('yyyy-MM-ddT00:00:00') — key on the raw date so no timezone shift applies
const dayKey = (d: AttendanceDay) => d.date.slice(0, 10);

const AttendanceHistoryScreen: React.FC = () => {
  const [month, setMonth] = useState(startOfMonth(new Date()));
  const [calendar, setCalendar] = useState<AttendanceCalendar | null>(null);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestSeq = useRef(0);

  const isCurrentMonth = isSameMonth(month, new Date());
  const todayKey = format(new Date(), 'yyyy-MM-dd');

  const load = useCallback(async (forMonth: Date) => {
    const seq = ++requestSeq.current;
    try {
      setError(null);
      const data = await attendanceApi.getAttendanceCalendar(forMonth.getFullYear(), forMonth.getMonth() + 1);
      if (seq !== requestSeq.current) return;
      setCalendar(data);
      // Open on today in the current month, otherwise on the last day the MR punched in
      setSelectedKey(prev => {
        if (prev && data.days.some(d => dayKey(d) === prev)) return prev;
        const today = data.days.find(d => dayKey(d) === format(new Date(), 'yyyy-MM-dd'));
        if (today) return dayKey(today);
        const lastWorked = [...data.days].reverse().find(d => d.punchInTime);
        return lastWorked ? dayKey(lastWorked) : null;
      });
    } catch {
      if (seq === requestSeq.current) setError('Failed to load attendance');
    } finally {
      if (seq === requestSeq.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useFocusEffect(useCallback(() => { load(month); }, [load, month]));

  const changeMonth = (delta: number) => {
    setLoading(true);
    setSelectedKey(null);
    setMonth(prev => startOfMonth(addMonths(prev, delta)));
  };

  const onRefresh = () => {
    setRefreshing(true);
    load(month);
  };

  // Calendar grid: pad the first week so the 1st lands under its weekday
  const grid = useMemo(() => {
    if (!calendar) return [] as (AttendanceDay | null)[];
    const cells: (AttendanceDay | null)[] = Array(getDay(month)).fill(null);
    cells.push(...calendar.days);
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [calendar, month]);

  const selected = calendar?.days.find(d => dayKey(d) === selectedKey) ?? null;
  const summary = calendar?.summary;

  const renderSummary = () => {
    if (!summary) return null;
    const items = [
      { label: 'Present', value: summary.presentDays, color: STATUS_STYLE.Present.text },
      { label: 'Half Day', value: summary.halfDays, color: STATUS_STYLE['Half Day'].text },
      { label: 'Absent', value: summary.absentDays, color: STATUS_STYLE.Absent.text },
      { label: 'Late', value: summary.lateDays, color: COLORS.warning },
      { label: 'Leave', value: summary.leaveDays, color: STATUS_STYLE.Leave.text },
    ];
    return (
      <View style={styles.card}>
        <View style={styles.summaryRow}>
          {items.map((item, i) => (
            <React.Fragment key={item.label}>
              {i > 0 && <View style={styles.summaryDivider} />}
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryVal, { color: item.color }]}>{item.value}</Text>
                <Text style={styles.summaryLbl}>{item.label}</Text>
              </View>
            </React.Fragment>
          ))}
        </View>
        <Text style={styles.summaryMeta}>
          {[
            `${summary.workingDays} working days`,
            summary.holidayDays ? `${summary.holidayDays} holiday${summary.holidayDays === 1 ? '' : 's'}` : '',
            summary.averageWorkHours > 0 ? `avg ${summary.averageWorkHours.toFixed(1)} hrs/day` : '',
          ].filter(Boolean).join(' · ')}
        </Text>
        {(summary.punchOutMissedDays > 0 || summary.punchInMissedDays > 0) && (
          <View style={styles.warningRow}>
            <MaterialCommunityIcons name="alert-circle-outline" size={14} color={COLORS.error} />
            <Text style={styles.warningText}>
              {[
                summary.punchOutMissedDays > 0 ? `Punch-out missed on ${summary.punchOutMissedDays} day(s)` : '',
                summary.punchInMissedDays > 0 ? `visits without punch-in on ${summary.punchInMissedDays} day(s)` : '',
              ].filter(Boolean).join(' · ')}
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderCalendar = () => (
    <View style={[styles.card, styles.calendarCard]}>
      <View style={styles.dayHeaderRow}>
        {DAY_HEADERS.map(d => (
          <Text key={d} style={styles.dayHeader}>{d}</Text>
        ))}
      </View>
      <View style={styles.gridContainer}>
        {Array.from({ length: grid.length / 7 }, (_, row) => (
          <View key={row} style={styles.gridRow}>
            {grid.slice(row * 7, row * 7 + 7).map((day, col) => {
              if (!day) return <View key={col} style={styles.dayCell} />;
              const key = dayKey(day);
              const s = STATUS_STYLE[day.status];
              const isSelected = key === selectedKey;
              const isToday = key === todayKey;
              return (
                <TouchableOpacity
                  key={key}
                  style={[
                    styles.dayCell,
                    s.bg ? { backgroundColor: s.bg } : null,
                    isToday && styles.dayCellToday,
                    isSelected && styles.dayCellSelected,
                    day.status === 'Upcoming' && styles.dayCellFuture,
                  ]}
                  onPress={() => setSelectedKey(key)}
                  disabled={day.status === 'Upcoming'}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.dayNum, { color: s.text }, s.bg ? styles.dayNumFilled : null]}>
                    {parseISO(key).getDate()}
                  </Text>
                  {/* Small markers: late (amber) / punch missed (red) */}
                  <View style={styles.markerRow}>
                    {day.isLate && <View style={[styles.marker, { backgroundColor: COLORS.warning }]} />}
                    {(day.isAutoPunchOut || day.hasVisitsWithoutPunchIn) && (
                      <View style={[styles.marker, { backgroundColor: COLORS.error }]} />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>
      <View style={styles.legend}>
        {LEGEND.map(status => (
          <View key={status} style={styles.legendItem}>
            <View style={[styles.legendSwatch, { backgroundColor: STATUS_STYLE[status].bg ?? 'transparent' }]} />
            <Text style={styles.legendText}>{STATUS_STYLE[status].label}</Text>
          </View>
        ))}
        <View style={styles.legendItem}>
          <View style={[styles.marker, { backgroundColor: COLORS.warning }]} />
          <Text style={styles.legendText}>Late</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.marker, { backgroundColor: COLORS.error }]} />
          <Text style={styles.legendText}>Punch missed</Text>
        </View>
      </View>
    </View>
  );

  const renderDayDetail = () => {
    if (!selected) {
      return (
        <View style={[styles.card, styles.hintCard]}>
          <Text style={styles.hintText}>Tap a day to see its punch times.</Text>
        </View>
      );
    }
    const s = STATUS_STYLE[selected.status];
    const punched = !!selected.punchInTime;
    return (
      <View style={styles.card}>
        <View style={styles.detailHeader}>
          <Text style={styles.detailDate}>{format(parseISO(dayKey(selected)), 'EEEE, dd MMM yyyy')}</Text>
          <View style={[styles.statusBadge, { backgroundColor: s.bg ?? COLORS.backgroundGray }]}>
            <Text style={[styles.statusBadgeText, { color: s.text }]}>{s.label}</Text>
          </View>
        </View>

        {selected.holidayName && <Text style={styles.detailNote}>{selected.holidayName}</Text>}

        {punched ? (
          <>
            <View style={styles.timeRow}>
              <View style={styles.timeItem}>
                <MaterialCommunityIcons name="login" size={18} color={COLORS.success} />
                <Text style={styles.timeLabel}>In</Text>
                <Text style={styles.timeValue}>{formatTime(selected.punchInTime!)}</Text>
              </View>
              <MaterialCommunityIcons name="arrow-right" size={16} color={COLORS.textSecondary} />
              <View style={styles.timeItem}>
                <MaterialCommunityIcons name="logout" size={18} color={COLORS.error} />
                <Text style={styles.timeLabel}>Out</Text>
                <Text style={styles.timeValue}>
                  {selected.punchOutTime ? formatTime(selected.punchOutTime) : '--:--'}
                </Text>
              </View>
              {selected.workDurationMinutes != null && (
                <View style={styles.timeItem}>
                  <MaterialCommunityIcons name="timer-outline" size={16} color={COLORS.primary} />
                  <Text style={styles.duration}>{formatWorked(selected.workDurationMinutes)}</Text>
                </View>
              )}
            </View>

            <View style={styles.tagRow}>
              {selected.isLate && (
                <View style={[styles.tag, { backgroundColor: COLORS.warning }]}>
                  <Text style={styles.tagText}>Late</Text>
                </View>
              )}
              {selected.isAutoPunchOut && (
                <View style={[styles.tag, { backgroundColor: COLORS.error }]}>
                  <Text style={styles.tagText}>Punch-out missed</Text>
                </View>
              )}
            </View>
            {selected.isAutoPunchOut && (
              <Text style={styles.detailNote}>
                You didn't punch out, so the day was closed at your last recorded activity.
              </Text>
            )}

            {selected.punchInAddress && (
              <View style={styles.addressRow}>
                <MaterialCommunityIcons name="map-marker-outline" size={14} color={COLORS.success} />
                <Text style={styles.addressText} numberOfLines={2}>{selected.punchInAddress}</Text>
              </View>
            )}
            {selected.punchOutAddress && (
              <View style={styles.addressRow}>
                <MaterialCommunityIcons name="map-marker-outline" size={14} color={COLORS.error} />
                <Text style={styles.addressText} numberOfLines={2}>{selected.punchOutAddress}</Text>
              </View>
            )}
          </>
        ) : (
          <Text style={styles.detailNote}>
            {selected.status === 'Absent'
              ? selected.hasVisitsWithoutPunchIn
                ? 'No punch-in recorded, but you logged visits this day. Ask your manager if this needs correcting.'
                : 'No punch-in recorded for this working day.'
              : selected.status === 'Not Marked'
                ? "You haven't punched in today. Punch in from the Home screen."
                : selected.status === 'Leave'
                  ? 'Planned leave in your tour plan.'
                  : selected.status === 'Weekly Off'
                    ? 'Weekly off.'
                    : null}
          </Text>
        )}
      </View>
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Month navigator */}
      <View style={styles.navRow}>
        <TouchableOpacity style={styles.navBtn} onPress={() => changeMonth(-1)}>
          <MaterialCommunityIcons name="chevron-left" size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <Text style={styles.monthLabel}>{format(month, 'MMMM yyyy')}</Text>
        <TouchableOpacity
          style={[styles.navBtn, isCurrentMonth && styles.navBtnDisabled]}
          onPress={() => changeMonth(1)}
          disabled={isCurrentMonth}
        >
          <MaterialCommunityIcons
            name="chevron-right"
            size={24}
            color={isCurrentMonth ? COLORS.textDisabled : COLORS.primary}
          />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loader} size="large" color={COLORS.primary} />
      ) : error ? (
        <View style={[styles.card, styles.hintCard]}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => { setLoading(true); load(month); }}>
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {renderSummary()}
          {renderCalendar()}
          {renderDayDetail()}
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.backgroundGray },
  content: { padding: SIZES.paddingMD, paddingBottom: 32 },
  loader: { marginTop: 60 },

  card: {
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radiusLG,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SIZES.paddingMD,
    marginBottom: SIZES.paddingMD,
  },

  // Month navigator — same look as the DCR calendar
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SIZES.paddingMD,
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radiusLG,
    paddingHorizontal: SIZES.paddingSM,
    paddingVertical: SIZES.paddingSM,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.primaryLight,
  },
  navBtnDisabled: { backgroundColor: COLORS.backgroundGray },
  monthLabel: { fontSize: SIZES.fontLG, fontWeight: '700', color: COLORS.textPrimary },

  // Summary
  summaryRow: { flexDirection: 'row', alignItems: 'center' },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryVal: { fontSize: SIZES.fontLG, fontWeight: '700' },
  summaryLbl: { fontSize: 10, color: COLORS.textSecondary, marginTop: 1 },
  summaryDivider: { width: 1, height: 28, backgroundColor: COLORS.border },
  summaryMeta: {
    fontSize: SIZES.fontXS,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SIZES.paddingSM,
  },
  warningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 6,
  },
  warningText: { fontSize: SIZES.fontXS, color: COLORS.error, flexShrink: 1 },

  // Calendar
  calendarCard: { padding: 0, overflow: 'hidden' },
  dayHeaderRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.backgroundGray,
  },
  dayHeader: {
    flex: 1,
    textAlign: 'center',
    paddingVertical: 10,
    fontSize: SIZES.fontXS,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  gridContainer: { padding: 4 },
  gridRow: { flexDirection: 'row', marginBottom: 4 },
  dayCell: {
    flex: 1,
    height: 46,
    margin: 2,
    borderRadius: SIZES.radiusSM,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayCellToday: { borderWidth: 1.5, borderColor: COLORS.primary },
  dayCellSelected: { borderWidth: 2, borderColor: COLORS.textPrimary },
  dayCellFuture: { opacity: 0.4 },
  dayNum: { fontSize: SIZES.fontSM, fontWeight: '500' },
  dayNumFilled: { fontWeight: '700' },
  markerRow: { flexDirection: 'row', gap: 2, height: 5, marginTop: 2 },
  marker: { width: 5, height: 5, borderRadius: 2.5 },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: SIZES.paddingMD,
    paddingBottom: SIZES.paddingMD,
    paddingTop: 4,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendSwatch: { width: 12, height: 12, borderRadius: 3, borderWidth: 1, borderColor: COLORS.border },
  legendText: { fontSize: SIZES.fontXS, color: COLORS.textSecondary },

  // Selected day
  hintCard: { alignItems: 'center' },
  hintText: { fontSize: SIZES.fontSM, color: COLORS.textSecondary },
  errorText: { fontSize: SIZES.fontSM, color: COLORS.error },
  retryText: { fontSize: SIZES.fontSM, color: COLORS.primary, fontWeight: '700', marginTop: 6 },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    marginBottom: SIZES.paddingSM,
  },
  detailDate: { fontSize: SIZES.fontMD, fontWeight: '700', color: COLORS.textPrimary, flexShrink: 1 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: SIZES.radiusRound },
  statusBadgeText: { fontSize: SIZES.fontXS, fontWeight: '700' },
  detailNote: { fontSize: SIZES.fontSM, color: COLORS.textSecondary, marginTop: 4, lineHeight: 18 },
  timeRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  timeItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  timeLabel: { fontSize: SIZES.fontXS, color: COLORS.textSecondary },
  timeValue: { fontSize: SIZES.fontMD, fontWeight: '600', color: COLORS.textPrimary },
  duration: { fontSize: SIZES.fontSM, color: COLORS.primary, fontWeight: '600' },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: SIZES.paddingSM },
  tag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  tagText: { fontSize: SIZES.fontXS, color: COLORS.textWhite, fontWeight: '600' },
  addressRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 4, marginTop: 6 },
  addressText: { flex: 1, fontSize: SIZES.fontXS, color: COLORS.textSecondary },
});

export default AttendanceHistoryScreen;
