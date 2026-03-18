import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  AppState,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Geolocation from 'react-native-geolocation-service';
import DeviceInfo from 'react-native-device-info';
import { Button, Card, Loading } from '../../components/common';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  setTodayRecord,
  setAttendanceStatus,
  addOfflineRecord,
} from '../../store/slices/attendanceSlice';
import attendanceApi from '../../services/api/attendanceApi';
import { COLORS, SIZES } from '../../constants';
import { requestLocationPermission, showAlert } from '../../utils/helpers';
import { formatTime, formatDate } from '../../utils/dateUtils';

// 5 km threshold per spec
const MAX_HQ_DISTANCE_METERS = 5000;

const AttendanceScreen: React.FC = () => {
  const dispatch = useAppDispatch();
  const { todayRecord, status } = useAppSelector(s => s.attendance);

  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [isMockLocation, setIsMockLocation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [remarks, setRemarks] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());

  // Tick clock every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadTodayAttendance();
      captureLocation();
    }, [])
  );

  const loadTodayAttendance = async () => {
    try {
      setInitializing(true);
      const [record, statusData] = await Promise.all([
        attendanceApi.getTodayAttendance(),
        attendanceApi.getAttendanceStatus(),
      ]);
      dispatch(setTodayRecord(record));
      dispatch(setAttendanceStatus(statusData));
    } catch (error) {
      console.error('Failed to load attendance:', error);
    } finally {
      setInitializing(false);
    }
  };

  const captureLocation = async () => {
    try {
      const hasPermission = await requestLocationPermission();
      if (!hasPermission) {
        showAlert('Permission Denied', 'Location permission is required to punch in/out.');
        return;
      }

      setGettingLocation(true);

      // Check for mock/spoofed location (Android)
      if (Platform.OS === 'android') {
        const isMock = await DeviceInfo.isMockLocation();
        if (isMock) {
          setIsMockLocation(true);
          setGettingLocation(false);
          showAlert(
            'Mock Location Detected',
            'Fake GPS or location spoofing apps are detected. Attendance cannot be recorded.'
          );
          return;
        }
      }
      setIsMockLocation(false);

      Geolocation.getCurrentPosition(
        pos => {
          setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
          setGettingLocation(false);
        },
        err => {
          console.error('GPS error:', err);
          setGettingLocation(false);
          showAlert('Location Error', 'Unable to get GPS location. Please enable GPS and try again.');
        },
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
      );
    } catch (error) {
      console.error('Location capture error:', error);
      setGettingLocation(false);
    }
  };

  // Haversine formula — returns distance in metres
  const calcDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3;
    const f1 = (lat1 * Math.PI) / 180;
    const f2 = (lat2 * Math.PI) / 180;
    const df = ((lat2 - lat1) * Math.PI) / 180;
    const dl = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(df / 2) ** 2 + Math.cos(f1) * Math.cos(f2) * Math.sin(dl / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const getBatteryLevel = async (): Promise<number | undefined> => {
    try {
      const level = await DeviceInfo.getBatteryLevel();
      return Math.round(level * 100);
    } catch {
      return undefined;
    }
  };

  const handlePunchIn = async () => {
    if (!location) {
      showAlert('Location Required', 'Please wait for GPS location to be captured.');
      return;
    }
    if (isMockLocation) {
      showAlert('Mock Location', 'Cannot punch in with a fake GPS location.');
      return;
    }

    // If HQ location is known (from todayRecord metadata), check geofence
    // For now we warn if punchInDistanceFromHQ > 5km (server will calculate exact distance)
    const doSubmit = async () => {
      try {
        setLoading(true);
        const batteryLevel = await getBatteryLevel();
        const payload = {
          timestamp: new Date().toISOString(),
          latitude: location.latitude,
          longitude: location.longitude,
          batteryLevel,
        };

        try {
          const record = await attendanceApi.punchIn(payload);
          dispatch(setTodayRecord(record));
          dispatch(setAttendanceStatus({ hasPunchedIn: true, hasPunchedOut: false }));
          showAlert('Punched In', `Successfully punched in at ${formatTime(record.punchInTime!)}`);
        } catch (apiError: any) {
          const msg = apiError?.response?.data?.message;
          if (msg === 'User has already punched in for today.') {
            showAlert('Already Punched In', 'You have already punched in for today.');
            await loadTodayAttendance();
          } else if (!msg) {
            // Likely offline — queue for later sync
            const offlineId = `ATT-${Date.now()}`;
            dispatch(addOfflineRecord({ ...payload, offlineId }));
            showAlert(
              'Saved Offline',
              'No internet connection. Punch-in saved and will sync automatically when back online.'
            );
          } else {
            showAlert('Error', msg || 'Failed to punch in. Please try again.');
          }
        }
      } finally {
        setLoading(false);
      }
    };

    // Geofence warning: server computes exact distance; we show a UI warning if deviation flag came back
    if (todayRecord?.isPunchInOutOfHQ) {
      Alert.alert(
        'Out of HQ Range',
        'You appear to be more than 5 km from your HQ. Punch-in will be flagged. Continue?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Continue', onPress: doSubmit },
        ]
      );
    } else {
      await doSubmit();
    }
  };

  const handlePunchOut = async () => {
    if (!location) {
      showAlert('Location Required', 'Please wait for GPS location to be captured.');
      return;
    }

    Alert.alert('Confirm Punch Out', 'Are you sure you want to end your work day?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Punch Out',
        style: 'destructive',
        onPress: async () => {
          try {
            setLoading(true);
            const payload = {
              timestamp: new Date().toISOString(),
              latitude: location.latitude,
              longitude: location.longitude,
              remarks,
            };

            const record = await attendanceApi.punchOut(payload);
            dispatch(setTodayRecord(record));
            dispatch(setAttendanceStatus({ hasPunchedIn: true, hasPunchedOut: true }));
            showAlert(
              'Punched Out',
              `Work day ended.\nDuration: ${record.workDurationFormatted ?? 'N/A'}`
            );
          } catch (error: any) {
            const msg = error?.response?.data?.message;
            showAlert('Error', msg || 'Failed to punch out. Please try again.');
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  const renderStatusBadge = () => {
    if (status.hasPunchedOut) {
      return (
        <View style={[styles.badge, styles.badgeComplete]}>
          <MaterialCommunityIcons name="check-circle" size={16} color={COLORS.textWhite} />
          <Text style={styles.badgeText}>Day Complete</Text>
        </View>
      );
    }
    if (status.hasPunchedIn) {
      return (
        <View style={[styles.badge, styles.badgeActive]}>
          <MaterialCommunityIcons name="briefcase-clock" size={16} color={COLORS.textWhite} />
          <Text style={styles.badgeText}>Working</Text>
        </View>
      );
    }
    return (
      <View style={[styles.badge, styles.badgePending]}>
        <MaterialCommunityIcons name="clock-outline" size={16} color={COLORS.textWhite} />
        <Text style={styles.badgeText}>Not Started</Text>
      </View>
    );
  };

  if (initializing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading attendance...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Date & Time Header */}
      <Card style={styles.headerCard}>
        <Text style={styles.dateText}>{formatDate(currentTime.toISOString())}</Text>
        <Text style={styles.timeText}>
          {currentTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </Text>
        <View style={styles.badgeRow}>{renderStatusBadge()}</View>
      </Card>

      {/* Today's Punch Details */}
      {todayRecord && (
        <Card style={styles.punchCard}>
          <Text style={styles.sectionTitle}>Today's Attendance</Text>
          <View style={styles.punchRow}>
            <View style={styles.punchItem}>
              <MaterialCommunityIcons name="login" size={28} color={COLORS.success} />
              <Text style={styles.punchLabel}>Punch In</Text>
              <Text style={styles.punchTime}>
                {todayRecord.punchInTime ? formatTime(todayRecord.punchInTime) : '--:--'}
              </Text>
              {todayRecord.isLate && (
                <Text style={styles.lateTag}>Late</Text>
              )}
            </View>

            <View style={styles.punchDivider} />

            <View style={styles.punchItem}>
              <MaterialCommunityIcons name="logout" size={28} color={COLORS.error} />
              <Text style={styles.punchLabel}>Punch Out</Text>
              <Text style={styles.punchTime}>
                {todayRecord.punchOutTime ? formatTime(todayRecord.punchOutTime) : '--:--'}
              </Text>
            </View>
          </View>

          {todayRecord.workDurationFormatted && (
            <View style={styles.durationRow}>
              <MaterialCommunityIcons name="timer-outline" size={18} color={COLORS.primary} />
              <Text style={styles.durationText}>
                Work Duration: {todayRecord.workDurationFormatted}
              </Text>
            </View>
          )}

          {todayRecord.isPunchInOutOfHQ && (
            <View style={styles.warningRow}>
              <MaterialCommunityIcons name="alert" size={16} color={COLORS.warning} />
              <Text style={styles.warningText}>
                Punched in {todayRecord.punchInDistanceFromHQ
                  ? `${(todayRecord.punchInDistanceFromHQ / 1000).toFixed(1)} km`
                  : 'far'} from HQ
              </Text>
            </View>
          )}
        </Card>
      )}

      {/* GPS Location Status */}
      <Card style={styles.locationCard}>
        <View style={styles.locationHeader}>
          <MaterialCommunityIcons
            name="map-marker"
            size={22}
            color={
              isMockLocation ? COLORS.error : location ? COLORS.success : COLORS.warning
            }
          />
          <Text style={styles.sectionTitle}>GPS Location</Text>
          {gettingLocation && <ActivityIndicator size="small" color={COLORS.primary} style={{ marginLeft: 8 }} />}
        </View>

        {isMockLocation ? (
          <Text style={styles.mockWarning}>
            Mock/fake GPS detected. Attendance is blocked.
          </Text>
        ) : location ? (
          <Text style={styles.coordText}>
            {location.latitude.toFixed(6)}, {location.longitude.toFixed(6)}
          </Text>
        ) : (
          <Text style={styles.locationWaiting}>
            {gettingLocation ? 'Capturing GPS...' : 'GPS unavailable'}
          </Text>
        )}

        {!gettingLocation && !isMockLocation && (
          <TouchableOpacity onPress={captureLocation} style={styles.refreshBtn}>
            <MaterialCommunityIcons name="refresh" size={16} color={COLORS.primary} />
            <Text style={styles.refreshText}>Refresh Location</Text>
          </TouchableOpacity>
        )}
      </Card>

      {/* Action Buttons */}
      {!status.hasPunchedIn && (
        <Button
          title="Punch In"
          onPress={handlePunchIn}
          loading={loading}
          disabled={!location || isMockLocation || gettingLocation}
          style={styles.punchInBtn}
          icon="login"
        />
      )}

      {status.hasPunchedIn && !status.hasPunchedOut && (
        <Button
          title="Punch Out"
          onPress={handlePunchOut}
          loading={loading}
          disabled={!location || gettingLocation}
          variant="outlined"
          style={styles.punchOutBtn}
          icon="logout"
        />
      )}

      {status.hasPunchedOut && (
        <View style={styles.doneContainer}>
          <MaterialCommunityIcons name="check-circle" size={48} color={COLORS.success} />
          <Text style={styles.doneText}>Work day complete!</Text>
        </View>
      )}

      <Loading visible={loading} message={status.hasPunchedIn ? 'Punching out...' : 'Punching in...'} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundGray,
  },
  content: {
    padding: SIZES.paddingLG,
    paddingBottom: SIZES.paddingLG * 2,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SIZES.paddingSM,
    color: COLORS.textSecondary,
    fontSize: SIZES.fontMD,
  },
  headerCard: {
    alignItems: 'center',
    paddingVertical: SIZES.paddingLG,
    marginBottom: SIZES.paddingMD,
  },
  dateText: {
    fontSize: SIZES.fontMD,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  timeText: {
    fontSize: 36,
    fontWeight: '700',
    color: COLORS.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  badgeRow: {
    marginTop: SIZES.paddingSM,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.paddingMD,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 4,
  },
  badgePending: { backgroundColor: COLORS.textSecondary },
  badgeActive: { backgroundColor: COLORS.primary },
  badgeComplete: { backgroundColor: COLORS.success },
  badgeText: {
    color: COLORS.textWhite,
    fontSize: SIZES.fontSM,
    fontWeight: '600',
  },
  punchCard: {
    marginBottom: SIZES.paddingMD,
  },
  sectionTitle: {
    fontSize: SIZES.fontMD,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SIZES.paddingMD,
  },
  punchRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  punchItem: {
    alignItems: 'center',
    flex: 1,
  },
  punchLabel: {
    fontSize: SIZES.fontSM,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  punchTime: {
    fontSize: SIZES.fontLG,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 2,
  },
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
  punchDivider: {
    width: 1,
    height: 60,
    backgroundColor: COLORS.divider,
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SIZES.paddingMD,
    paddingTop: SIZES.paddingMD,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
    gap: 6,
  },
  durationText: {
    fontSize: SIZES.fontMD,
    color: COLORS.primary,
    fontWeight: '500',
  },
  warningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SIZES.paddingSM,
    gap: 6,
  },
  warningText: {
    fontSize: SIZES.fontSM,
    color: COLORS.warning,
  },
  locationCard: {
    marginBottom: SIZES.paddingMD,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.paddingSM,
    gap: 6,
  },
  coordText: {
    fontSize: SIZES.fontSM,
    color: COLORS.textSecondary,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  locationWaiting: {
    fontSize: SIZES.fontSM,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
  },
  mockWarning: {
    fontSize: SIZES.fontSM,
    color: COLORS.error,
    fontWeight: '500',
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SIZES.paddingSM,
    gap: 4,
  },
  refreshText: {
    fontSize: SIZES.fontSM,
    color: COLORS.primary,
  },
  punchInBtn: {
    marginTop: SIZES.paddingSM,
    backgroundColor: COLORS.success,
  },
  punchOutBtn: {
    marginTop: SIZES.paddingSM,
  },
  doneContainer: {
    alignItems: 'center',
    paddingVertical: SIZES.paddingLG,
  },
  doneText: {
    fontSize: SIZES.fontLG,
    color: COLORS.success,
    fontWeight: '600',
    marginTop: SIZES.paddingSM,
  },
});

export default AttendanceScreen;
