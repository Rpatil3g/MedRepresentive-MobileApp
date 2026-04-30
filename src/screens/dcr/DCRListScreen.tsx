import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { ErrorMessage, Loading } from '../../components/common';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { setDCRs } from '../../store/slices/dcrSlice';
import { dcrApi } from '../../services/api';
import { DailyCallReport, DCRCalendarDay } from '../../types/dcr.types';
import { DCRStackParamList } from '../../types/navigation.types';
import { COLORS, SIZES, ROUTES } from '../../constants';
import { formatDate } from '../../utils/dateUtils';

type DCRListNavigationProp = StackNavigationProp<DCRStackParamList, 'DCRList'>;

const STATUS_CONFIG: Record<string, { color: string; bg: string; icon: string; label: string }> = {
  Draft:     { color: COLORS.textSecondary, bg: '#f3f4f6', icon: 'file-outline',         label: 'Draft' },
  Submitted: { color: COLORS.primary,       bg: '#eff6ff', icon: 'clock-outline',        label: 'Submitted' },
  Approved:  { color: COLORS.success,       bg: '#f0fdf4', icon: 'check-circle-outline', label: 'Approved' },
  Rejected:  { color: COLORS.error,         bg: '#fef2f2', icon: 'close-circle-outline', label: 'Rejected' },
};

const CAL_STATUS: Record<string, { bg: string; text: string }> = {
  Approved:  { bg: '#dcfce7', text: '#15803d' },
  Submitted: { bg: '#dbeafe', text: '#1d4ed8' },
  Draft:     { bg: '#f3f4f6', text: COLORS.textSecondary },
  Rejected:  { bg: '#fee2e2', text: '#b91c1c' },
};

const DAY_HEADERS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const DCRListScreen: React.FC = () => {
  const navigation = useNavigation<DCRListNavigationProp>();
  const dispatch = useAppDispatch();
  const { dcrs } = useAppSelector(state => state.dcr);

  const now = new Date();

  // List view state
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // View toggle
  const [view, setView] = useState<'list' | 'calendar'>('list');

  // Calendar view state
  const [calMonth, setCalMonth] = useState(now.getMonth() + 1);
  const [calYear, setCalYear]   = useState(now.getFullYear());
  const [calDays, setCalDays]   = useState<DCRCalendarDay[]>([]);
  const [calLoading, setCalLoading] = useState(false);
  const [calError, setCalError] = useState<string | null>(null);

  // ── Data fetching ─────────────────────────────────────────────────────────

  const fetchDCRs = async () => {
    try {
      setError(null);
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - 60);
      const response = await dcrApi.getMyDCRs({
        pageNumber: 1,
        pageSize: 50,
        fromDate: fromDate.toISOString().split('T')[0],
      });
      const items = Array.isArray(response) ? response : (response?.items ?? []);
      dispatch(setDCRs(items));
    } catch {
      setError('Failed to load DCRs');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchCalendar = useCallback(async (m: number, y: number) => {
    try {
      setCalError(null);
      setCalLoading(true);
      const result = await dcrApi.getMonthlyCalendar(m, y);
      setCalDays(result);
    } catch {
      setCalError('Failed to load calendar');
    } finally {
      setCalLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchDCRs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  // Fetch calendar whenever month/year changes or user switches to calendar tab
  useFocusEffect(
    useCallback(() => {
      if (view === 'calendar') fetchCalendar(calMonth, calYear);
    }, [view, calMonth, calYear, fetchCalendar]),
  );

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDCRs();
  };

  const handleDCRPress = (dcr: DailyCallReport) => {
    navigation.navigate(ROUTES.CREATE_DCR, { date: dcr.reportDate });
  };

  const handleCreateDCR = () => {
    navigation.navigate(ROUTES.CREATE_DCR, {});
  };

  const handleDeleteDCR = (dcr: DailyCallReport) => {
    Alert.alert(
      'Delete Draft DCR',
      `Delete the draft DCR for ${formatDate(dcr.reportDate, 'dd MMM yyyy')}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeletingId(dcr.id);
            try {
              await dcrApi.deleteDCR(dcr.id);
              dispatch(setDCRs(dcrs.filter(d => d.id !== dcr.id)));
            } catch {
              Alert.alert('Error', 'Failed to delete DCR. Please try again.');
            } finally {
              setDeletingId(null);
            }
          },
        },
      ],
    );
  };

  const handleCalDayPress = (day: DCRCalendarDay) => {
    const dateOnly = day.date.split('T')[0];
    if (dateOnly > todayStr) return;
    navigation.navigate(ROUTES.CREATE_DCR, { date: dateOnly });
  };

  const goToPrevCalMonth = () => {
    if (calMonth === 1) { setCalMonth(12); setCalYear(y => y - 1); }
    else setCalMonth(m => m - 1);
  };

  const goToNextCalMonth = () => {
    const isAtCurrent = calYear === now.getFullYear() && calMonth === now.getMonth() + 1;
    if (isAtCurrent) return;
    if (calMonth === 12) { setCalMonth(1); setCalYear(y => y + 1); }
    else setCalMonth(m => m + 1);
  };

  // ── Calendar grid helpers ─────────────────────────────────────────────────

  const buildGrid = (days: DCRCalendarDay[]): (DCRCalendarDay | null)[] => {
    if (days.length === 0) return [];
    const firstDay = new Date(days[0].date);
    const startOffset = firstDay.getDay();
    const grid: (DCRCalendarDay | null)[] = Array(startOffset).fill(null);
    grid.push(...days);
    while (grid.length % 7 !== 0) grid.push(null);
    return grid;
  };

  // ── Render helpers ────────────────────────────────────────────────────────

  const rejectedDCRs = dcrs.filter(d => d.status === 'Rejected');
  const otherDCRs    = dcrs.filter(d => d.status !== 'Rejected');
  const todayStr     = now.toISOString().split('T')[0];

  const renderDCRCard = ({ item, isRejected = false }: { item: DailyCallReport; isRejected?: boolean }) => {
    const cfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.Draft;
    return (
      <TouchableOpacity
        onPress={() => handleDCRPress(item)}
        activeOpacity={0.7}
        style={[styles.card, isRejected && styles.cardRejected]}
      >
        <View style={styles.cardHeader}>
          <View style={styles.dateRow}>
            <MaterialCommunityIcons name="calendar" size={18} color={COLORS.primary} />
            <Text style={styles.dateText}>{formatDate(item.reportDate, 'dd MMM yyyy')}</Text>
            <Text style={styles.dayText}>{formatDate(item.reportDate, 'EEEE')}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
            <MaterialCommunityIcons name={cfg.icon as any} size={13} color={cfg.color} />
            <Text style={[styles.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
        </View>

        {item.status === 'Rejected' && item.approvalComments ? (
          <View style={styles.rejectionBox}>
            <MaterialCommunityIcons name="alert-circle-outline" size={14} color={COLORS.error} />
            <Text style={styles.rejectionText} numberOfLines={2}>{item.approvalComments}</Text>
          </View>
        ) : null}

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <MaterialCommunityIcons name="map-marker-check" size={18} color={COLORS.primary} />
            <Text style={styles.statValue}>{item.totalVisits}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <MaterialCommunityIcons name="doctor" size={18} color={COLORS.success} />
            <Text style={styles.statValue}>{item.doctorVisits}</Text>
            <Text style={styles.statLabel}>Doctors</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <MaterialCommunityIcons name="store-outline" size={18} color={COLORS.info} />
            <Text style={styles.statValue}>{item.chemistVisits}</Text>
            <Text style={styles.statLabel}>Chemists</Text>
          </View>
        </View>

        {(item.status === 'Rejected' || item.status === 'Draft') && (
          <View style={styles.cardFooter}>
            {item.status === 'Rejected' && (
              <View style={styles.editHint}>
                <MaterialCommunityIcons name="pencil-outline" size={13} color={COLORS.error} />
                <Text style={styles.editHintText}>Tap to edit and resubmit</Text>
              </View>
            )}
            {item.status === 'Draft' && (
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => handleDeleteDCR(item)}
                disabled={deletingId === item.id}
              >
                <MaterialCommunityIcons name="trash-can-outline" size={15} color={COLORS.error} />
                <Text style={styles.deleteBtnText}>
                  {deletingId === item.id ? 'Deleting…' : 'Delete Draft'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyContainer}>
        <MaterialCommunityIcons name="file-document-outline" size={64} color={COLORS.textDisabled} />
        <Text style={styles.emptyTitle}>No DCRs yet</Text>
        <Text style={styles.emptySubtitle}>Submit your first Daily Call Report</Text>
        <TouchableOpacity style={styles.emptyBtn} onPress={handleCreateDCR}>
          <Text style={styles.emptyBtnText}>Create DCR</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderCalendar = () => {
    const grid = buildGrid(calDays);
    const filed    = calDays.filter(d => d.hasDCR).length;
    const approved = calDays.filter(d => d.status === 'Approved').length;
    const pending  = calDays.filter(d => d.status === 'Submitted').length;
    const rejected = calDays.filter(d => d.status === 'Rejected').length;
    const workDays = calDays.filter(d => !d.isWeekend).length;
    const isNextDisabled = calYear === now.getFullYear() && calMonth >= now.getMonth() + 1;
    const monthLabel = new Date(calYear, calMonth - 1, 1)
      .toLocaleString('default', { month: 'long', year: 'numeric' });

    return (
      <ScrollView contentContainerStyle={styles.calendarContent} showsVerticalScrollIndicator={false}>

        {/* Month navigator */}
        <View style={styles.navRow}>
          <TouchableOpacity style={styles.navBtn} onPress={goToPrevCalMonth}>
            <MaterialCommunityIcons name="chevron-left" size={24} color={COLORS.primary} />
          </TouchableOpacity>
          <Text style={styles.monthLabel}>{monthLabel}</Text>
          <TouchableOpacity
            style={[styles.navBtn, isNextDisabled && styles.navBtnDisabled]}
            onPress={goToNextCalMonth}
            disabled={isNextDisabled}
          >
            <MaterialCommunityIcons
              name="chevron-right"
              size={24}
              color={isNextDisabled ? COLORS.textDisabled : COLORS.primary}
            />
          </TouchableOpacity>
        </View>

        {/* Summary strip */}
        <View style={styles.summaryRow}>
          {[
            { val: filed,    label: 'Filed',    color: COLORS.textPrimary },
            { val: approved, label: 'Approved', color: COLORS.success },
            { val: pending,  label: 'Pending',  color: COLORS.primary },
            { val: rejected, label: 'Rejected', color: COLORS.error },
            { val: workDays - filed, label: 'Missing', color: COLORS.textPrimary },
          ].map((item, idx, arr) => (
            <React.Fragment key={item.label}>
              <View style={styles.summaryItem}>
                <Text style={[styles.summaryVal, { color: item.color }]}>{item.val}</Text>
                <Text style={styles.summaryLbl}>{item.label}</Text>
              </View>
              {idx < arr.length - 1 && <View style={styles.summaryDivider} />}
            </React.Fragment>
          ))}
        </View>

        {/* Grid */}
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

          {calLoading ? (
            <View style={styles.calLoadingBox}>
              <Loading visible message="Loading calendar..." />
            </View>
          ) : calError ? (
            <View style={styles.calLoadingBox}>
              <Text style={styles.calErrorText}>{calError}</Text>
              <TouchableOpacity onPress={() => fetchCalendar(calMonth, calYear)}>
                <Text style={styles.calRetryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.gridContainer}>
              {Array.from({ length: grid.length / 7 }, (_, rowIdx) => (
                <View key={rowIdx} style={styles.gridRow}>
                  {grid.slice(rowIdx * 7, rowIdx * 7 + 7).map((day, colIdx) => {
                    if (!day) return <View key={colIdx} style={styles.dayCell} />;

                    const dateOnly = day.date.split('T')[0];
                    const dayNum   = parseInt(dateOnly.split('-')[2], 10);
                    const isToday  = dateOnly === todayStr;
                    const isFuture = dateOnly > todayStr;
                    const cs = day.status ? CAL_STATUS[day.status] : null;

                    return (
                      <TouchableOpacity
                        key={day.date}
                        style={[
                          styles.dayCell,
                          cs && { backgroundColor: cs.bg },
                          isToday && styles.dayCellToday,
                          isFuture && styles.dayCellFuture,
                        ]}
                        onPress={() => handleCalDayPress(day)}
                        disabled={isFuture}
                        activeOpacity={isFuture ? 1 : 0.7}
                      >
                        <Text style={[
                          styles.dayNum,
                          day.isWeekend && styles.dayNumWeekend,
                          cs && { color: cs.text, fontWeight: '700' },
                          isToday && styles.dayNumToday,
                          isFuture && styles.dayNumFuture,
                        ]}>
                          {dayNum}
                        </Text>
                        {day.hasDCR && day.totalVisits !== undefined && (
                          <Text style={[styles.visitCount, cs && { color: cs.text }]}>
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

        {/* Legend */}
        <View style={styles.legendCard}>
          <Text style={styles.legendTitle}>Legend</Text>
          <View style={styles.legendGrid}>
            {Object.entries(CAL_STATUS).map(([status, s]) => (
              <View key={status} style={styles.legendItem}>
                <View style={[styles.legendSwatch, { backgroundColor: s.bg, borderColor: s.text }]} />
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
          <Text style={styles.legendHint}>Tap any past day to view or create its DCR.</Text>
        </View>

      </ScrollView>
    );
  };

  if (error && !refreshing && view === 'list') {
    return <ErrorMessage message={error} onRetry={fetchDCRs} />;
  }

  return (
    <View style={styles.container}>

      {/* ── View toggle tabs ── */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, view === 'list' && styles.tabActive]}
          onPress={() => setView('list')}
        >
          <MaterialCommunityIcons
            name="format-list-bulleted"
            size={16}
            color={view === 'list' ? COLORS.primary : COLORS.textSecondary}
          />
          <Text style={[styles.tabText, view === 'list' && styles.tabTextActive]}>
            List
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, view === 'calendar' && styles.tabActive]}
          onPress={() => setView('calendar')}
        >
          <MaterialCommunityIcons
            name="calendar-month"
            size={16}
            color={view === 'calendar' ? COLORS.primary : COLORS.textSecondary}
          />
          <Text style={[styles.tabText, view === 'calendar' && styles.tabTextActive]}>
            Calendar
          </Text>
        </TouchableOpacity>
      </View>

      {/* ── Content ── */}
      {view === 'calendar' ? (
        renderCalendar()
      ) : (
        <FlatList
          data={[]}
          renderItem={null}
          keyExtractor={() => ''}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={null}
          ListHeaderComponent={
            <>
              {rejectedDCRs.length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <MaterialCommunityIcons name="alert-circle" size={16} color={COLORS.error} />
                    <Text style={styles.sectionTitle}>Needs Attention</Text>
                    <View style={styles.sectionBadge}>
                      <Text style={styles.sectionBadgeText}>{rejectedDCRs.length}</Text>
                    </View>
                  </View>
                  {rejectedDCRs.map(item =>
                    <View key={item.id}>{renderDCRCard({ item, isRejected: true })}</View>
                  )}
                </View>
              )}

              {otherDCRs.length > 0 && (
                <View style={styles.section}>
                  {rejectedDCRs.length > 0 && (
                    <Text style={styles.sectionTitlePlain}>All Reports</Text>
                  )}
                  {otherDCRs.map(item =>
                    <View key={item.id}>{renderDCRCard({ item })}</View>
                  )}
                </View>
              )}

              {dcrs.length === 0 && renderEmpty()}
            </>
          }
        />
      )}

      {/* FAB — only on list view */}
      {view === 'list' && (
        <TouchableOpacity style={styles.fab} onPress={handleCreateDCR}>
          <MaterialCommunityIcons name="plus" size={28} color={COLORS.textWhite} />
        </TouchableOpacity>
      )}

      <Loading visible={loading && !refreshing && view === 'list'} message="Loading DCRs..." />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundGray,
  },

  // ── Tab bar ──────────────────────────────────────────────────────────────
  tabBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: SIZES.paddingMD,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.transparent,
  },
  tabActive: {
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: SIZES.fontSM,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },

  // ── List view ─────────────────────────────────────────────────────────────
  listContent: {
    padding: SIZES.paddingMD,
    paddingBottom: 100,
  },
  section: {
    marginBottom: SIZES.paddingMD,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: SIZES.paddingSM,
  },
  sectionTitle: {
    fontSize: SIZES.fontSM,
    fontWeight: '700',
    color: COLORS.error,
    flex: 1,
  },
  sectionTitlePlain: {
    fontSize: SIZES.fontSM,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: SIZES.paddingSM,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionBadge: {
    backgroundColor: COLORS.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  sectionBadgeText: {
    fontSize: SIZES.fontXS,
    fontWeight: '700',
    color: '#fff',
  },
  card: {
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radiusLG,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SIZES.paddingMD,
    marginBottom: SIZES.paddingSM + 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  cardRejected: {
    borderColor: '#fca5a5',
    borderWidth: 1.5,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.paddingSM,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  dateText: {
    fontSize: SIZES.fontMD,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  dayText: {
    fontSize: SIZES.fontXS,
    color: COLORS.textSecondary,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: SIZES.radiusSM,
  },
  badgeText: {
    fontSize: SIZES.fontXS,
    fontWeight: '700',
  },
  rejectionBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: '#fef2f2',
    borderRadius: SIZES.radiusSM,
    paddingHorizontal: SIZES.paddingSM,
    paddingVertical: 7,
    marginBottom: SIZES.paddingSM,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.error,
  },
  rejectionText: {
    flex: 1,
    fontSize: SIZES.fontXS,
    color: '#b91c1c',
    lineHeight: 17,
  },
  statsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    paddingTop: SIZES.paddingSM,
    marginTop: SIZES.paddingXS,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    fontSize: SIZES.fontLG,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  statLabel: {
    fontSize: SIZES.fontXS,
    color: COLORS.textSecondary,
  },
  statDivider: {
    width: 1,
    backgroundColor: COLORS.divider,
  },
  editHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  editHintText: {
    fontSize: SIZES.fontXS,
    color: COLORS.error,
    fontWeight: '500',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SIZES.paddingSM,
    paddingTop: SIZES.paddingXS,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  deleteBtnText: {
    fontSize: SIZES.fontXS,
    color: COLORS.error,
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyTitle: {
    fontSize: SIZES.fontLG,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: SIZES.paddingMD,
  },
  emptySubtitle: {
    fontSize: SIZES.fontSM,
    color: COLORS.textSecondary,
    marginTop: 4,
    marginBottom: SIZES.paddingLG,
  },
  emptyBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.radiusMD,
    paddingHorizontal: SIZES.paddingXL,
    paddingVertical: SIZES.paddingMD,
  },
  emptyBtnText: {
    fontSize: SIZES.fontMD,
    fontWeight: '600',
    color: COLORS.textWhite,
  },

  // ── Calendar view ─────────────────────────────────────────────────────────
  calendarContent: {
    padding: SIZES.paddingMD,
    paddingBottom: 32,
  },
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
  calLoadingBox: {
    height: 240,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calErrorText: {
    fontSize: SIZES.fontSM,
    color: COLORS.textSecondary,
    marginBottom: 8,
  },
  calRetryText: {
    fontSize: SIZES.fontSM,
    color: COLORS.primary,
    fontWeight: '600',
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
    height: 48,
    margin: 2,
    borderRadius: SIZES.radiusSM,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayCellToday: {
    borderWidth: 2,
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryLight,
  },
  dayCellFuture: {
    opacity: 0.3,
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
  },

  // FAB
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
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
});

export default DCRListScreen;
