import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  isSameMonth,
  parseISO,
  startOfMonth,
} from 'date-fns';
import { Card, ErrorMessage, Loading } from '../../components/common';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { setVisits, setTodayVisits, removeVisit } from '../../store/slices/visitSlice';
import { visitApi, dcrApi } from '../../services/api';
import { Visit } from '../../types/visit.types';
import { VisitStackParamList } from '../../types/navigation.types';
import { COLORS, SIZES, ROUTES } from '../../constants';
import { formatTime, formatDate } from '../../utils/dateUtils';

type VisitListNavigationProp = StackNavigationProp<VisitStackParamList, 'VisitList'>;

const DAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_PAGE_SIZE = 200;

// Local calendar day of a visit (API timestamps are UTC)
const visitDayKey = (visit: Visit) => formatDate(visit.visitDateTime, 'yyyy-MM-dd');

// The list endpoint is paged, so walk the pages until the whole month is loaded.
// Month boundaries are the device's local midnight, sent as UTC to match stored timestamps.
const fetchMonthVisits = async (forMonth: Date): Promise<Visit[]> => {
  const fromDate = startOfMonth(forMonth).toISOString();
  const toDate = endOfMonth(forMonth).toISOString();
  const all: Visit[] = [];
  for (let pageNumber = 1; ; pageNumber++) {
    const response = await visitApi.getVisits({
      fromDate,
      toDate,
      pageNumber,
      pageSize: MONTH_PAGE_SIZE,
    });
    if (Array.isArray(response)) return response;
    const items = response?.items ?? [];
    all.push(...items);
    if (items.length === 0 || all.length >= (response?.totalCount ?? 0)) return all;
  }
};

const VisitListScreen: React.FC = () => {
  const navigation = useNavigation<VisitListNavigationProp>();
  const dispatch = useAppDispatch();

  const visits = useAppSelector((state) => state.visit.visits ?? []);
  const todayVisits = useAppSelector((state) => state.visit.todayVisits ?? []);
  const activeVisit = useAppSelector((state) => state.visit.activeVisit);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showTodayOnly, setShowTodayOnly] = useState(true);
  const [month, setMonth] = useState(startOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const requestSeq = useRef(0);

  const isCurrentMonth = isSameMonth(month, new Date());

  const fetchVisits = useCallback(async (todayOnly: boolean, forMonth: Date) => {
    const seq = ++requestSeq.current;
    try {
      setError(null);

      if (todayOnly) {
        const data = await visitApi.getTodayVisits();
        if (seq === requestSeq.current) dispatch(setTodayVisits(data));
      } else {
        const items = await fetchMonthVisits(forMonth);
        if (seq === requestSeq.current) dispatch(setVisits(items));
      }
    } catch (err: any) {
      console.error('Fetch visits error:', err);
      if (seq === requestSeq.current) setError('Failed to load visits');
    } finally {
      if (seq === requestSeq.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [dispatch]);

  // Refetch on focus too, so edits/new visits show up when returning from other screens
  useFocusEffect(
    useCallback(() => {
      fetchVisits(showTodayOnly, month);
    }, [fetchVisits, showTodayOnly, month])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    fetchVisits(showTodayOnly, month);
  };

  const switchTab = (todayOnly: boolean) => {
    if (todayOnly === showTodayOnly) return;
    setLoading(true);
    setShowTodayOnly(todayOnly);
  };

  const changeMonth = (delta: number) => {
    setLoading(true);
    setSelectedDay(null);
    setMonth(prev => startOfMonth(addMonths(prev, delta)));
  };

  const handleDayPress = (dayKey: string) => {
    setSelectedDay(prev => (prev === dayKey ? null : dayKey));
  };

  const countsByDay = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const v of visits) {
      const key = visitDayKey(v);
      counts[key] = (counts[key] ?? 0) + 1;
    }
    return counts;
  }, [visits]);

  const monthVisits = useMemo(
    () => (selectedDay ? visits.filter(v => visitDayKey(v) === selectedDay) : visits),
    [visits, selectedDay]
  );

  const handleVisitPress = (visit: Visit) => {
    navigation.navigate(ROUTES.VISIT_DETAIL, { visitId: visit.id });
  };

  const handleStartVisit = () => {
    navigation.navigate(ROUTES.LOG_VISIT, {});
  };

  const handleDeleteVisit = (visit: Visit) => {
    Alert.alert(
      'Delete Visit',
      `Delete visit with ${visit.doctorName || visit.chemistName || visit.stockistName || 'this contact'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const visitDate = formatDate(visit.visitDateTime, 'yyyy-MM-dd');
              const dcr = await dcrApi.getDCRByDate(visitDate);
              if (dcr && (dcr.status === 'Submitted' || dcr.status === 'Approved')) {
                Alert.alert(
                  'Cannot Delete',
                  'DCR for this date is already submitted. Contact your manager to make changes.'
                );
                return;
              }
              await visitApi.deleteVisit(visit.id);
              dispatch(removeVisit(visit.id));
            } catch {
              Alert.alert('Error', 'Failed to delete visit. Please try again.');
            }
          },
        },
      ]
    );
  };

  const renderVisitCard = ({ item, index }: { item: Visit; index: number }) => {
    const isActive = item.status === 'Checked-In';
    const isCompleted = item.status === 'Checked-Out' || item.status === 'Completed';
    const isCancelled = item.status === 'Cancelled';

    const accentColor = isActive
      ? COLORS.warning
      : isCompleted
      ? COLORS.success
      : isCancelled
      ? COLORS.error
      : COLORS.textDisabled;

    const statusLabel = isActive ? 'Active' : item.status;

    return (
      <TouchableOpacity onPress={() => handleVisitPress(item)} activeOpacity={0.7}>
        <Card style={styles.visitCard} padding={0}>
          <View style={styles.cardBody}>
            {/* Header row */}
            <View style={styles.cardHeader}>
              <View style={styles.iconContainer}>
                <MaterialCommunityIcons
                  name={item.visitType === 'Doctor' ? 'doctor' : 'store-outline'}
                  size={24}
                  color={COLORS.primary}
                />
              </View>

              <View style={styles.visitInfo}>
                <View style={styles.titleRow}>
                  <Text style={styles.visitNumber}>#{index + 1}</Text>
                  <Text style={styles.visitTitle} numberOfLines={1}>
                    {item.doctorName || item.chemistName || item.stockistName || 'Unknown'}
                  </Text>
                </View>
                {item.doctorSpecialty && (
                  <Text style={styles.visitSubtitle}>{item.doctorSpecialty}</Text>
                )}
                <View style={styles.visitWhenRow}>
                  <MaterialCommunityIcons name="calendar-blank-outline" size={13} color={COLORS.textSecondary} />
                  <Text style={styles.visitTime}>
                    {formatDate(item.visitDateTime, 'EEE, dd MMM yyyy')}
                    {'  ·  '}
                    {formatTime(item.visitDateTime)}
                    {item.checkOutTime ? ` — ${formatTime(item.checkOutTime)}` : ''}
                  </Text>
                </View>
              </View>

              {/* Status badge */}
              <View style={[styles.statusBadge, { backgroundColor: accentColor }]}>
                <Text style={styles.statusText}>{statusLabel}</Text>
              </View>
            </View>

            {/* Info chips row */}
            <View style={styles.cardFooter}>
              {item.visitDurationMinutes > 0 && (
                <View style={styles.durationChip}>
                  <MaterialCommunityIcons name="clock-outline" size={13} color={COLORS.textSecondary} />
                  <Text style={styles.durationChipText}>{item.visitDurationMinutes} min</Text>
                </View>
              )}
              {item.isOrderBooked && (
                <View style={[styles.chip, styles.chipOrder]}>
                  <MaterialCommunityIcons name="cash-multiple" size={13} color="#7c3aed" />
                  <Text style={[styles.chipText, { color: '#7c3aed' }]}>Order</Text>
                </View>
              )}
              {item.samples.length > 0 && (
                <View style={styles.chip}>
                  <MaterialCommunityIcons name="package-variant" size={13} color={COLORS.info} />
                  <Text style={[styles.chipText, { color: COLORS.info }]}>
                    {item.samples.length} Sample{item.samples.length > 1 ? 's' : ''}
                  </Text>
                </View>
              )}
              {item.productsDiscussed.length > 0 && (
                <View style={styles.chip}>
                  <MaterialCommunityIcons name="pill" size={13} color={COLORS.primary} />
                  <Text style={[styles.chipText, { color: COLORS.primary }]}>
                    {item.productsDiscussed.length} Product{item.productsDiscussed.length > 1 ? 's' : ''}
                  </Text>
                </View>
              )}
              {item.isPlannedVisit && (
                <View style={styles.chip}>
                  <MaterialCommunityIcons name="calendar-check" size={13} color={COLORS.secondary} />
                  <Text style={[styles.chipText, { color: COLORS.secondary }]}>Planned</Text>
                </View>
              )}
              {item.isGeofenceBreach && (
                <View style={[styles.chip, styles.chipWarning]}>
                  <MaterialCommunityIcons name="map-marker-alert" size={13} color={COLORS.warning} />
                  <Text style={[styles.chipText, { color: COLORS.warning }]}>Out of Range</Text>
                </View>
              )}
              {!isActive && (
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => handleDeleteVisit(item)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <MaterialCommunityIcons name="trash-can-outline" size={16} color={COLORS.error} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </Card>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => {
    if (loading) return null;
    const emptyText = showTodayOnly
      ? 'No visits today'
      : selectedDay
      ? `No visits on ${format(parseISO(selectedDay), 'dd MMM yyyy')}`
      : `No visits in ${format(month, 'MMMM yyyy')}`;
    return (
      <View style={[styles.emptyContainer, !showTodayOnly && styles.emptyContainerCompact]}>
        <MaterialCommunityIcons name="map-marker-off" size={64} color={COLORS.textDisabled} />
        <Text style={styles.emptyText}>{emptyText}</Text>
        {showTodayOnly && (
          <TouchableOpacity onPress={handleStartVisit} style={styles.startVisitButton}>
            <Text style={styles.startVisitText}>Start a Visit</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderMonthHeader = () => {
    const days = eachDayOfInterval({ start: month, end: endOfMonth(month) });
    const grid: (Date | null)[] = Array(month.getDay()).fill(null);
    grid.push(...days);
    while (grid.length % 7 !== 0) grid.push(null);

    const todayKey = format(new Date(), 'yyyy-MM-dd');
    const doctorCount = visits.filter(v => v.visitType === 'Doctor').length;
    const chemistCount = visits.filter(v => v.visitType === 'Chemist').length;
    const stockistCount = visits.filter(v => v.visitType === 'Stockist').length;
    const activeDays = Object.keys(countsByDay).length;

    return (
      <View>
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

        {/* Summary strip */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryVal}>{visits.length}</Text>
            <Text style={styles.summaryLbl}>Visits</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryVal, { color: COLORS.primary }]}>{doctorCount}</Text>
            <Text style={styles.summaryLbl}>Doctors</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryVal, { color: COLORS.success }]}>{chemistCount}</Text>
            <Text style={styles.summaryLbl}>Chemists</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryVal, { color: COLORS.secondary }]}>{stockistCount}</Text>
            <Text style={styles.summaryLbl}>Stockists</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryVal}>{activeDays}</Text>
            <Text style={styles.summaryLbl}>Field Days</Text>
          </View>
        </View>

        {/* Calendar grid */}
        <View style={styles.calendarCard}>
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
          <View style={styles.gridContainer}>
            {Array.from({ length: grid.length / 7 }, (_, rowIdx) => (
              <View key={rowIdx} style={styles.gridRow}>
                {grid.slice(rowIdx * 7, rowIdx * 7 + 7).map((day, colIdx) => {
                  if (!day) return <View key={colIdx} style={styles.dayCell} />;

                  const key = format(day, 'yyyy-MM-dd');
                  const count = countsByDay[key] ?? 0;
                  const isToday = key === todayKey;
                  const isFuture = key > todayKey;
                  const isSelected = key === selectedDay;
                  const isWeekend = day.getDay() === 0 || day.getDay() === 6;

                  return (
                    <TouchableOpacity
                      key={key}
                      style={[
                        styles.dayCell,
                        count > 0 && styles.dayCellHasVisits,
                        isToday && styles.dayCellToday,
                        isSelected && styles.dayCellSelected,
                        isFuture && styles.dayCellFuture,
                      ]}
                      onPress={() => handleDayPress(key)}
                      disabled={isFuture}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.dayNum,
                          isWeekend && styles.dayNumWeekend,
                          count > 0 && styles.dayNumHasVisits,
                          isToday && styles.dayNumToday,
                          isSelected && styles.dayTextSelected,
                        ]}
                      >
                        {day.getDate()}
                      </Text>
                      {count > 0 && (
                        <Text style={[styles.dayCount, isSelected && styles.dayTextSelected]}>
                          {count}v
                        </Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>
        </View>

        {/* List heading */}
        <View style={styles.listHeading}>
          <Text style={styles.listHeadingText}>
            {selectedDay
              ? `${format(parseISO(selectedDay), 'EEE, dd MMM')} · ${monthVisits.length} visit${monthVisits.length === 1 ? '' : 's'}`
              : `All of ${format(month, 'MMMM')} · tap a day to filter`}
          </Text>
          {selectedDay && (
            <TouchableOpacity
              style={styles.clearDayBtn}
              onPress={() => setSelectedDay(null)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.clearDayText}>Show whole month</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  if (error && !refreshing) {
    return <ErrorMessage message={error} onRetry={() => fetchVisits(showTodayOnly, month)} />;
  }

  const displayVisits = showTodayOnly ? todayVisits : monthVisits;

  return (
    <View style={styles.container}>
      {/* Active Visit Banner */}
      {activeVisit && (
        <TouchableOpacity
          style={styles.activeVisitBanner}
          onPress={() => handleVisitPress(activeVisit)}
        >
          <MaterialCommunityIcons name="map-marker-check" size={24} color={COLORS.textWhite} />
          <View style={styles.activeVisitInfo}>
            <Text style={styles.activeVisitText}>Active Visit</Text>
            <Text style={styles.activeVisitDoctor}>
              {activeVisit.doctorName || activeVisit.chemistName || activeVisit.stockistName || 'Visit in progress'}
            </Text>
          </View>
          <MaterialCommunityIcons name="chevron-right" size={24} color={COLORS.textWhite} />
        </TouchableOpacity>
      )}

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterTab, showTodayOnly && styles.filterTabActive]}
          onPress={() => switchTab(true)}
        >
          <Text style={[styles.filterText, showTodayOnly && styles.filterTextActive]}>
            Today ({todayVisits.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, !showTodayOnly && styles.filterTabActive]}
          onPress={() => switchTab(false)}
        >
          <Text style={[styles.filterText, !showTodayOnly && styles.filterTextActive]}>
            All Visits
          </Text>
        </TouchableOpacity>
      </View>

      {/* Visit List — in "All Visits" the month calendar scrolls with the list */}
      <FlatList
        data={displayVisits}
        renderItem={renderVisitCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        ListHeaderComponent={showTodayOnly ? null : renderMonthHeader()}
        ListEmptyComponent={renderEmpty}
      />

      {/* FAB */}
      {!activeVisit && (
        <TouchableOpacity style={styles.fab} onPress={handleStartVisit}>
          <MaterialCommunityIcons name="plus" size={28} color={COLORS.textWhite} />
        </TouchableOpacity>
      )}

      <Loading visible={loading && !refreshing} message="Loading visits..." />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundGray,
  },
  activeVisitBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.warning,
    padding: SIZES.paddingMD,
  },
  activeVisitInfo: {
    flex: 1,
    marginLeft: SIZES.paddingMD,
  },
  activeVisitText: {
    fontSize: SIZES.fontSM,
    color: COLORS.textWhite,
    fontWeight: '600',
  },
  activeVisitDoctor: {
    fontSize: SIZES.fontMD,
    color: COLORS.textWhite,
    fontWeight: 'bold',
  },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filterTab: {
    flex: 1,
    paddingVertical: SIZES.paddingMD,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: COLORS.transparent,
  },
  filterTabActive: {
    borderBottomColor: COLORS.primary,
  },
  filterText: {
    fontSize: SIZES.fontMD,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  filterTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  listContent: {
    padding: SIZES.paddingMD,
    paddingBottom: 80,
  },
  visitCard: {
    marginBottom: SIZES.paddingMD,
    flexDirection: 'row',
    overflow: 'hidden',
    padding: 0,
  },
  accentStripe: {
    width: 4,
    alignSelf: 'stretch',
    borderTopLeftRadius: SIZES.radiusMD,
    borderBottomLeftRadius: SIZES.radiusMD,
  },
  cardBody: {
    flex: 1,
    padding: SIZES.paddingMD,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SIZES.paddingSM,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SIZES.paddingSM,
  },
  visitInfo: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  visitNumber: {
    fontSize: SIZES.fontSM,
    fontWeight: '700',
    color: COLORS.textDisabled,
  },
  visitTitle: {
    fontSize: SIZES.fontMD,
    fontWeight: '700',
    color: COLORS.textPrimary,
    flex: 1,
  },
  visitSubtitle: {
    fontSize: SIZES.fontSM,
    color: COLORS.primary,
    marginTop: 2,
  },
  visitWhenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  visitTime: {
    fontSize: SIZES.fontSM,
    color: COLORS.textSecondary,
    flexShrink: 1,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: SIZES.radiusRound,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: SIZES.fontXS,
    color: COLORS.textWhite,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  cardFooter: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  durationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    backgroundColor: COLORS.transparent,
    borderRadius: SIZES.radiusRound,
    borderWidth: 1,
    borderColor: COLORS.textSecondary + '60',
  },
  durationChipText: {
    fontSize: SIZES.fontXS,
    color: COLORS.textSecondary,
    fontWeight: '700',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    backgroundColor: COLORS.backgroundGray,
    borderRadius: SIZES.radiusRound,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipOrder: {
    borderColor: '#7c3aed40',
    backgroundColor: '#f5f3ff',
  },
  deleteBtn: {
    marginLeft: 'auto',
    padding: 4,
  },
  chipWarning: {
    borderColor: COLORS.warning + '60',
    backgroundColor: COLORS.warningLight,
  },
  chipText: {
    fontSize: SIZES.fontXS,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyContainerCompact: {
    paddingTop: SIZES.paddingLG,
  },
  emptyText: {
    fontSize: SIZES.fontLG,
    color: COLORS.textSecondary,
    marginTop: SIZES.paddingMD,
    marginBottom: SIZES.paddingLG,
  },
  startVisitButton: {
    paddingHorizontal: SIZES.paddingXL,
    paddingVertical: SIZES.paddingMD,
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.radiusMD,
  },
  startVisitText: {
    color: COLORS.textWhite,
    fontSize: SIZES.fontMD,
    fontWeight: '600',
  },

  // Month view — mirrors DCRCalendarScreen
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
  gridContainer: {
    padding: 4,
  },
  gridRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  dayCell: {
    flex: 1,
    height: 46,
    margin: 2,
    borderRadius: SIZES.radiusSM,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  dayCellHasVisits: {
    backgroundColor: '#dbeafe',
  },
  dayCellToday: {
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  dayCellSelected: {
    backgroundColor: COLORS.primary,
    borderWidth: 0,
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
  dayNumHasVisits: {
    color: '#1d4ed8',
    fontWeight: '700',
  },
  dayNumToday: {
    color: COLORS.primary,
    fontWeight: '800',
  },
  dayCount: {
    fontSize: 9,
    fontWeight: '600',
    color: '#1d4ed8',
    marginTop: 1,
  },
  dayTextSelected: {
    color: COLORS.textWhite,
  },
  listHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SIZES.paddingSM,
  },
  listHeadingText: {
    fontSize: SIZES.fontSM,
    fontWeight: '600',
    color: COLORS.textSecondary,
    flexShrink: 1,
  },
  clearDayBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: SIZES.radiusRound,
    backgroundColor: COLORS.primaryLight,
  },
  clearDayText: {
    fontSize: SIZES.fontXS,
    fontWeight: '700',
    color: COLORS.primary,
  },
  fab: {
    position: 'absolute',
    right: SIZES.paddingLG,
    bottom: SIZES.paddingLG,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
});

export default VisitListScreen;
