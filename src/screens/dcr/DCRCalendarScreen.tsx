import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Loading, ErrorMessage } from '../../components/common';
import { dcrApi } from '../../services/api';
import { DCRCalendarDay } from '../../types/dcr.types';
import { DCRStackParamList } from '../../types/navigation.types';
import { COLORS, SIZES, ROUTES } from '../../constants';

type DCRCalendarNavProp = StackNavigationProp<DCRStackParamList, 'DCRCalendar'>;

const DAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const STATUS_STYLE: Record<string, { bg: string; text: string; dot: string }> = {
  Approved:  { bg: '#dcfce7', text: '#15803d', dot: COLORS.success },
  Submitted: { bg: '#dbeafe', text: '#1d4ed8', dot: COLORS.primary },
  Draft:     { bg: '#f3f4f6', text: COLORS.textSecondary, dot: '#9ca3af' },
  Rejected:  { bg: '#fee2e2', text: '#b91c1c', dot: COLORS.error },
};

const DCRCalendarScreen: React.FC = () => {
  const navigation = useNavigation<DCRCalendarNavProp>();

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [days, setDays] = useState<DCRCalendarDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCalendar = useCallback(async (m: number, y: number) => {
    try {
      setError(null);
      setLoading(true);
      const result = await dcrApi.getMonthlyCalendar(m, y);
      setDays(result);
    } catch {
      setError('Failed to load calendar');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchCalendar(month, year);
    }, [month, year])
  );

  const goToPrevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };

  const goToNextMonth = () => {
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear  = month === 12 ? year + 1 : year;
    // Don't navigate beyond current month
    if (nextYear > now.getFullYear() || (nextYear === now.getFullYear() && nextMonth > now.getMonth() + 1)) return;
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const isNextDisabled =
    year > now.getFullYear() ||
    (year === now.getFullYear() && month >= now.getMonth() + 1);

  const handleDayPress = (day: DCRCalendarDay) => {
    const dayDate = new Date(day.date);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (dayDate > today) return;
    navigation.navigate(ROUTES.CREATE_DCR, { date: day.date });
  };

  // Build calendar grid — pad leading empty cells for the first day's weekday
  const buildGrid = (): (DCRCalendarDay | null)[] => {
    if (days.length === 0) return [];
    const firstDay = new Date(days[0].date);
    const startOffset = firstDay.getDay(); // 0=Sun
    const grid: (DCRCalendarDay | null)[] = Array(startOffset).fill(null);
    grid.push(...days);
    // Pad trailing cells to complete last row
    while (grid.length % 7 !== 0) grid.push(null);
    return grid;
  };

  const grid = buildGrid();

  // Summary counts
  const filed    = days.filter(d => d.hasDCR).length;
  const approved = days.filter(d => d.status === 'Approved').length;
  const pending  = days.filter(d => d.status === 'Submitted').length;
  const rejected = days.filter(d => d.status === 'Rejected').length;
  const workDays = days.filter(d => !d.isWeekend).length;

  const monthLabel = new Date(year, month - 1, 1)
    .toLocaleString('default', { month: 'long', year: 'numeric' });

  const todayStr = now.toISOString().split('T')[0];

  if (error) return <ErrorMessage message={error} onRetry={() => fetchCalendar(month, year)} />;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── Month navigator ── */}
        <View style={styles.navRow}>
          <TouchableOpacity style={styles.navBtn} onPress={goToPrevMonth}>
            <MaterialCommunityIcons name="chevron-left" size={24} color={COLORS.primary} />
          </TouchableOpacity>
          <Text style={styles.monthLabel}>{monthLabel}</Text>
          <TouchableOpacity
            style={[styles.navBtn, isNextDisabled && styles.navBtnDisabled]}
            onPress={goToNextMonth}
            disabled={isNextDisabled}
          >
            <MaterialCommunityIcons
              name="chevron-right"
              size={24}
              color={isNextDisabled ? COLORS.textDisabled : COLORS.primary}
            />
          </TouchableOpacity>
        </View>

        {/* ── Summary strip ── */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryVal}>{filed}</Text>
            <Text style={styles.summaryLbl}>Filed</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryVal, { color: COLORS.success }]}>{approved}</Text>
            <Text style={styles.summaryLbl}>Approved</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryVal, { color: COLORS.primary }]}>{pending}</Text>
            <Text style={styles.summaryLbl}>Pending</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryVal, { color: COLORS.error }]}>{rejected}</Text>
            <Text style={styles.summaryLbl}>Rejected</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryVal}>{workDays - filed}</Text>
            <Text style={styles.summaryLbl}>Missing</Text>
          </View>
        </View>

        {/* ── Calendar grid ── */}
        <View style={styles.calendarCard}>
          {/* Day headers */}
          <View style={styles.dayHeaderRow}>
            {DAY_HEADERS.map(d => (
              <Text
                key={d}
                style={[styles.dayHeader, (d === 'Sun' || d === 'Sat') && styles.dayHeaderWeekend]}
              >
                {d}
              </Text>
            ))}
          </View>

          {loading ? (
            <View style={styles.loadingPlaceholder}>
              <Loading visible message="Loading calendar..." />
            </View>
          ) : (
            <View style={styles.gridContainer}>
              {Array.from({ length: grid.length / 7 }, (_, rowIdx) => (
                <View key={rowIdx} style={styles.gridRow}>
                  {grid.slice(rowIdx * 7, rowIdx * 7 + 7).map((day, colIdx) => {
                    if (!day) {
                      return <View key={colIdx} style={styles.dayCell} />;
                    }

                    const dayNum = new Date(day.date).getDate();
                    const isToday = day.date.startsWith(todayStr);
                    const isFuture = day.date > todayStr;
                    const statusStyle = day.status ? STATUS_STYLE[day.status] : null;

                    return (
                      <TouchableOpacity
                        key={day.date}
                        style={[
                          styles.dayCell,
                          statusStyle && { backgroundColor: statusStyle.bg },
                          isToday && styles.dayCellToday,
                          isFuture && styles.dayCellFuture,
                        ]}
                        onPress={() => handleDayPress(day)}
                        disabled={isFuture}
                        activeOpacity={isFuture ? 1 : 0.7}
                      >
                        <Text style={[
                          styles.dayNum,
                          day.isWeekend && styles.dayNumWeekend,
                          statusStyle && { color: statusStyle.text, fontWeight: '700' },
                          isToday && styles.dayNumToday,
                          isFuture && styles.dayNumFuture,
                        ]}>
                          {dayNum}
                        </Text>

                        {day.hasDCR && day.totalVisits !== undefined && (
                          <Text style={[styles.visitCount, statusStyle && { color: statusStyle.text }]}>
                            {day.totalVisits}v
                          </Text>
                        )}

                        {!day.hasDCR && !day.isWeekend && !isFuture && (
                          <View style={styles.missingDot} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </View>
          )}
        </View>

        {/* ── Legend ── */}
        <View style={styles.legendCard}>
          <Text style={styles.legendTitle}>Legend</Text>
          <View style={styles.legendGrid}>
            {Object.entries(STATUS_STYLE).map(([status, s]) => (
              <View key={status} style={styles.legendItem}>
                <View style={[styles.legendSwatch, { backgroundColor: s.bg, borderColor: s.dot }]} />
                <Text style={styles.legendLabel}>{status}</Text>
              </View>
            ))}
            <View style={styles.legendItem}>
              <View style={styles.legendMissingDot} />
              <Text style={styles.legendLabel}>Not filed</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendSwatch, { backgroundColor: COLORS.primaryLight, borderColor: COLORS.primary }]} />
              <Text style={styles.legendLabel}>Today</Text>
            </View>
          </View>
          <Text style={styles.legendHint}>
            Tap any past day to view or create its DCR. Numbers show total visits.
          </Text>
        </View>

      </ScrollView>
    </View>
  );
};

const CELL_SIZE = 46;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundGray,
  },
  content: {
    padding: SIZES.paddingMD,
    paddingBottom: 32,
  },

  // Month navigator
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
  navBtnDisabled: {
    backgroundColor: COLORS.backgroundGray,
  },
  monthLabel: {
    fontSize: SIZES.fontLG,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },

  // Summary strip
  summaryRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radiusLG,
    padding: SIZES.paddingMD,
    marginBottom: SIZES.paddingMD,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryVal: {
    fontSize: SIZES.fontLG,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  summaryLbl: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  summaryDivider: {
    width: 1,
    height: 28,
    backgroundColor: COLORS.border,
  },

  // Calendar card
  calendarCard: {
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radiusLG,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: 'hidden',
    marginBottom: SIZES.paddingMD,
  },
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
    letterSpacing: 0.3,
  },
  dayHeaderWeekend: {
    color: COLORS.textDisabled,
  },
  loadingPlaceholder: {
    height: 240,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridContainer: {
    padding: 4,
  },
  gridRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  dayCell: {
    flex: 1,
    height: CELL_SIZE,
    margin: 2,
    borderRadius: SIZES.radiusSM,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  dayCellToday: {
    borderWidth: 2,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  dayCellFuture: {
    opacity: 0.35,
  },
  dayNum: {
    fontSize: SIZES.fontSM,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  dayNumWeekend: {
    color: COLORS.textDisabled,
  },
  dayNumToday: {
    color: COLORS.primary,
    fontWeight: '800',
  },
  dayNumFuture: {
    color: COLORS.textDisabled,
  },
  visitCount: {
    fontSize: 9,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  missingDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e5e7eb',
    marginTop: 2,
  },

  // Legend
  legendCard: {
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radiusLG,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SIZES.paddingMD,
  },
  legendTitle: {
    fontSize: SIZES.fontSM,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SIZES.paddingSM,
  },
  legendGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: SIZES.paddingSM,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendSwatch: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1.5,
  },
  legendMissingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#e5e7eb',
    marginHorizontal: 5,
  },
  legendLabel: {
    fontSize: SIZES.fontXS,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  legendHint: {
    fontSize: SIZES.fontXS,
    color: COLORS.textDisabled,
    marginTop: 4,
    lineHeight: 16,
  },
});

export default DCRCalendarScreen;
