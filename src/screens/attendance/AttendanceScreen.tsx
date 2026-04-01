import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Card } from '../../components/common';
import attendanceApi from '../../services/api/attendanceApi';
import { AttendanceRecord } from '../../types/attendance.types';
import { COLORS, SIZES } from '../../constants';
import { formatDate, formatTime } from '../../utils/dateUtils';

const AttendanceScreen: React.FC = () => {
  const [record, setRecord] = React.useState<AttendanceRecord | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);

  const load = async () => {
    try {
      const data = await attendanceApi.getTodayAttendance();
      setRecord(data);
    } catch (e) {
      console.error('Failed to load attendance:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(useCallback(() => { load(); }, []));

  const onRefresh = () => { setRefreshing(true); load(); };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const isPunchedIn = !!record?.punchInTime;
  const isPunchedOut = !!record?.punchOutTime;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
    >
      <Text style={styles.heading}>{formatDate(new Date().toISOString(), 'EEEE, dd MMMM yyyy')}</Text>

      {/* Status Badge */}
      <View style={[styles.statusBadge, isPunchedOut ? styles.badgeDone : isPunchedIn ? styles.badgeActive : styles.badgeIdle]}>
        <MaterialCommunityIcons
          name={isPunchedOut ? 'check-circle' : isPunchedIn ? 'briefcase-clock' : 'clock-outline'}
          size={16}
          color={COLORS.textWhite}
        />
        <Text style={styles.statusText}>
          {isPunchedOut ? 'Day Complete' : isPunchedIn ? 'On Duty' : 'Not Started'}
        </Text>
      </View>

      {/* Punch Times Card */}
      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Today's Attendance</Text>
        <View style={styles.punchRow}>
          <View style={styles.punchItem}>
            <MaterialCommunityIcons name="login" size={28} color={COLORS.success} />
            <Text style={styles.punchLabel}>Punch In</Text>
            <Text style={styles.punchTime}>
              {record?.punchInTime ? formatTime(record.punchInTime) : '--:--'}
            </Text>
            {record?.isLate && <Text style={styles.lateTag}>Late</Text>}
          </View>

          <View style={styles.divider} />

          <View style={styles.punchItem}>
            <MaterialCommunityIcons name="logout" size={28} color={COLORS.error} />
            <Text style={styles.punchLabel}>Punch Out</Text>
            <Text style={styles.punchTime}>
              {record?.punchOutTime ? formatTime(record.punchOutTime) : '--:--'}
            </Text>
          </View>
        </View>

        {record?.workDurationFormatted && (
          <View style={styles.durationRow}>
            <MaterialCommunityIcons name="timer-outline" size={18} color={COLORS.primary} />
            <Text style={styles.durationText}>Work Duration: {record.workDurationFormatted}</Text>
          </View>
        )}
      </Card>

      {/* Location Card */}
      {(record?.punchInAddress || record?.punchOutAddress) && (
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Locations</Text>
          {record?.punchInAddress && (
            <View style={styles.locationRow}>
              <MaterialCommunityIcons name="map-marker-check" size={18} color={COLORS.success} style={styles.locationIcon} />
              <View style={styles.locationText}>
                <Text style={styles.locationLabel}>Punch In</Text>
                <Text style={styles.locationValue}>{record.punchInAddress}</Text>
              </View>
            </View>
          )}
          {record?.punchOutAddress && (
            <View style={styles.locationRow}>
              <MaterialCommunityIcons name="map-marker" size={18} color={COLORS.error} style={styles.locationIcon} />
              <View style={styles.locationText}>
                <Text style={styles.locationLabel}>Punch Out</Text>
                <Text style={styles.locationValue}>{record.punchOutAddress}</Text>
              </View>
            </View>
          )}
          {record?.isPunchInOutOfHQ && (
            <View style={styles.warningRow}>
              <MaterialCommunityIcons name="alert" size={16} color={COLORS.warning} />
              <Text style={styles.warningText}>
                Punched in {record.punchInDistanceFromHQ
                  ? `${(record.punchInDistanceFromHQ / 1000).toFixed(1)} km`
                  : 'far'} from HQ
              </Text>
            </View>
          )}
        </Card>
      )}

      {!record && (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="calendar-blank-outline" size={48} color={COLORS.textDisabled} />
          <Text style={styles.emptyText}>No attendance record for today</Text>
          <Text style={styles.emptyHint}>Use the Punch In button on the Dashboard to start your day</Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.backgroundGray },
  content: { padding: SIZES.paddingLG, paddingBottom: SIZES.paddingLG * 2 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  heading: {
    fontSize: SIZES.fontSM,
    color: COLORS.textSecondary,
    fontWeight: '500',
    marginBottom: SIZES.paddingSM,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: SIZES.paddingMD,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    marginBottom: SIZES.paddingMD,
  },
  badgeIdle: { backgroundColor: COLORS.textSecondary },
  badgeActive: { backgroundColor: COLORS.primary },
  badgeDone: { backgroundColor: COLORS.success },
  statusText: { color: COLORS.textWhite, fontSize: SIZES.fontSM, fontWeight: '600' },
  card: { marginBottom: SIZES.paddingMD },
  cardTitle: {
    fontSize: SIZES.fontMD,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SIZES.paddingMD,
  },
  punchRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  punchItem: { alignItems: 'center', flex: 1 },
  punchLabel: { fontSize: SIZES.fontSM, color: COLORS.textSecondary, marginTop: 4 },
  punchTime: { fontSize: SIZES.fontLG, fontWeight: '700', color: COLORS.textPrimary, marginTop: 2 },
  lateTag: {
    fontSize: SIZES.fontXS,
    color: COLORS.textWhite,
    backgroundColor: COLORS.warning,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
    overflow: 'hidden',
  },
  divider: { width: 1, height: 60, backgroundColor: COLORS.divider },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: SIZES.paddingMD,
    paddingTop: SIZES.paddingMD,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  durationText: { fontSize: SIZES.fontMD, color: COLORS.primary, fontWeight: '500' },
  locationRow: { flexDirection: 'row', marginBottom: SIZES.paddingSM },
  locationIcon: { marginTop: 2, marginRight: SIZES.paddingSM },
  locationText: { flex: 1 },
  locationLabel: { fontSize: SIZES.fontXS, color: COLORS.textSecondary, fontWeight: '600', marginBottom: 2 },
  locationValue: { fontSize: SIZES.fontSM, color: COLORS.textPrimary, lineHeight: 18 },
  warningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: SIZES.paddingSM,
    paddingTop: SIZES.paddingSM,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  warningText: { fontSize: SIZES.fontSM, color: COLORS.warning },
  emptyState: { alignItems: 'center', paddingVertical: SIZES.paddingLG * 2, gap: 8 },
  emptyText: { fontSize: SIZES.fontMD, fontWeight: '600', color: COLORS.textSecondary },
  emptyHint: { fontSize: SIZES.fontSM, color: COLORS.textDisabled, textAlign: 'center' },
});

export default AttendanceScreen;
