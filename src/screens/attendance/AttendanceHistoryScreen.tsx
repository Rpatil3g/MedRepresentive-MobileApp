import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Card } from '../../components/common';
import attendanceApi from '../../services/api/attendanceApi';
import { AttendanceRecord, AttendanceSummary } from '../../types/attendance.types';
import { COLORS, SIZES } from '../../constants';
import { formatDate, formatTime } from '../../utils/dateUtils';

const AttendanceHistoryScreen: React.FC = () => {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Last 30 days
  const toDate = new Date().toISOString().split('T')[0];
  const fromDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [listRes, summaryRes] = await Promise.all([
        attendanceApi.getAttendanceList({ fromDate, toDate, pageNumber: 1, pageSize: 20 }),
        attendanceApi.getAttendanceSummary(fromDate, toDate),
      ]);
      setRecords(listRes.items ?? listRes);
      setHasMore((listRes.items ?? listRes).length === 20);
      setSummary(summaryRes);
      setPage(1);
    } catch (error) {
      console.error('Failed to load history:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    try {
      setLoadingMore(true);
      const nextPage = page + 1;
      const res = await attendanceApi.getAttendanceList({ fromDate, toDate, pageNumber: nextPage, pageSize: 20 });
      const items: AttendanceRecord[] = res.items ?? res;
      setRecords(prev => [...prev, ...items]);
      setHasMore(items.length === 20);
      setPage(nextPage);
    } catch (error) {
      console.error('Load more error:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  const renderRecord = ({ item }: { item: AttendanceRecord }) => (
    <Card style={styles.recordCard}>
      <View style={styles.recordHeader}>
        <Text style={styles.recordDate}>{formatDate(item.date)}</Text>
        <View style={styles.tagRow}>
          {item.isLate && (
            <View style={[styles.tag, styles.tagLate]}>
              <Text style={styles.tagText}>Late</Text>
            </View>
          )}
          {item.isHalfDay && (
            <View style={[styles.tag, styles.tagHalf]}>
              <Text style={styles.tagText}>Half Day</Text>
            </View>
          )}
          {item.isPunchInOutOfHQ && (
            <View style={[styles.tag, styles.tagWarning]}>
              <Text style={styles.tagText}>Out of HQ</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.timeRow}>
        <View style={styles.timeItem}>
          <MaterialCommunityIcons name="login" size={18} color={COLORS.success} />
          <Text style={styles.timeLabel}>In</Text>
          <Text style={styles.timeValue}>
            {item.punchInTime ? formatTime(item.punchInTime) : '--:--'}
          </Text>
        </View>

        <MaterialCommunityIcons name="arrow-right" size={16} color={COLORS.textSecondary} />

        <View style={styles.timeItem}>
          <MaterialCommunityIcons name="logout" size={18} color={COLORS.error} />
          <Text style={styles.timeLabel}>Out</Text>
          <Text style={styles.timeValue}>
            {item.punchOutTime ? formatTime(item.punchOutTime) : '--:--'}
          </Text>
        </View>

        {item.workDurationFormatted && (
          <>
            <MaterialCommunityIcons name="timer-outline" size={16} color={COLORS.textSecondary} />
            <Text style={styles.duration}>{item.workDurationFormatted}</Text>
          </>
        )}
      </View>
    </Card>
  );

  const renderSummary = () => {
    if (!summary) return null;
    return (
      <Card style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Last 30 Days Summary</Text>
        <View style={styles.summaryGrid}>
          <SummaryItem icon="calendar-check" label="Present" value={summary.presentDays} color={COLORS.success} />
          <SummaryItem icon="calendar-remove" label="Absent" value={summary.absentDays} color={COLORS.error} />
          <SummaryItem icon="clock-alert" label="Late" value={summary.lateDays} color={COLORS.warning} />
          <SummaryItem icon="calendar-half" label="Half Days" value={summary.halfDays} color={COLORS.secondary} />
        </View>
        <View style={styles.avgRow}>
          <MaterialCommunityIcons name="timer" size={16} color={COLORS.primary} />
          <Text style={styles.avgText}>
            Avg. Work Hours: {summary.averageWorkHours.toFixed(1)} hrs/day
          </Text>
        </View>
      </Card>
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={records}
      keyExtractor={item => item.id}
      renderItem={renderRecord}
      ListHeaderComponent={renderSummary}
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="calendar-blank" size={48} color={COLORS.textSecondary} />
          <Text style={styles.emptyText}>No attendance records found</Text>
        </View>
      }
      ListFooterComponent={
        loadingMore ? <ActivityIndicator color={COLORS.primary} style={{ margin: 16 }} /> : null
      }
      onEndReached={loadMore}
      onEndReachedThreshold={0.3}
      onRefresh={loadData}
      refreshing={loading}
    />
  );
};

const SummaryItem: React.FC<{ icon: string; label: string; value: number; color: string }> = ({
  icon, label, value, color,
}) => (
  <View style={styles.summaryItem}>
    <MaterialCommunityIcons name={icon} size={22} color={color} />
    <Text style={[styles.summaryValue, { color }]}>{value}</Text>
    <Text style={styles.summaryLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.backgroundGray },
  content: { padding: SIZES.paddingMD, paddingBottom: SIZES.paddingLG * 2 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  summaryCard: { marginBottom: SIZES.paddingMD },
  summaryTitle: {
    fontSize: SIZES.fontMD,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SIZES.paddingMD,
  },
  summaryGrid: { flexDirection: 'row', justifyContent: 'space-around' },
  summaryItem: { alignItems: 'center', gap: 2 },
  summaryValue: { fontSize: SIZES.fontXL, fontWeight: '700' },
  summaryLabel: { fontSize: SIZES.fontXS, color: COLORS.textSecondary },
  avgRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SIZES.paddingMD,
    paddingTop: SIZES.paddingMD,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    gap: 6,
  },
  avgText: { fontSize: SIZES.fontSM, color: COLORS.primary, fontWeight: '500' },
  recordCard: { marginBottom: SIZES.paddingSM },
  recordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.paddingSM,
  },
  recordDate: { fontSize: SIZES.fontMD, fontWeight: '600', color: COLORS.textPrimary },
  tagRow: { flexDirection: 'row', gap: 4 },
  tag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  tagLate: { backgroundColor: COLORS.warning },
  tagHalf: { backgroundColor: COLORS.secondary },
  tagWarning: { backgroundColor: COLORS.error },
  tagText: { fontSize: SIZES.fontXS, color: COLORS.textWhite, fontWeight: '600' },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  timeLabel: { fontSize: SIZES.fontXS, color: COLORS.textSecondary },
  timeValue: { fontSize: SIZES.fontMD, fontWeight: '600', color: COLORS.textPrimary },
  duration: { fontSize: SIZES.fontSM, color: COLORS.primary, fontWeight: '500', marginLeft: 4 },
  emptyContainer: { alignItems: 'center', paddingVertical: SIZES.paddingLG * 2 },
  emptyText: { fontSize: SIZES.fontMD, color: COLORS.textSecondary, marginTop: SIZES.paddingSM },
});

export default AttendanceHistoryScreen;
