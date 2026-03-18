import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Button, Card, Input } from '../../components/common';
import { useAppDispatch } from '../../store/hooks';
import { upsertDraftEntry, removeDraftEntry } from '../../store/slices/tourPlanSlice';
import axiosInstance from '../../services/api/axiosInstance';
import { API_CONFIG } from '../../config/api.config';
import { COLORS, SIZES } from '../../constants';
import { ActivityType, DraftDayEntry, LeaveType } from '../../types/tourPlan.types';
import { TourPlanStackParamList } from '../../types/navigation.types';
import { formatDate } from '../../utils/dateUtils';

type RouteProps = RouteProp<TourPlanStackParamList, 'DayPlanForm'>;

interface RouteOption { id: string; routeName: string; }

const ACTIVITY_OPTIONS: { type: ActivityType; label: string; icon: string; color: string }[] = [
  { type: 'FIELD_WORK', label: 'Field Work',  icon: 'briefcase-outline', color: COLORS.primary },
  { type: 'MEETING',    label: 'Meeting',     icon: 'account-group',    color: '#7C3AED' },
  { type: 'TRAINING',   label: 'Training',    icon: 'school-outline',   color: '#0891B2' },
  { type: 'LEAVE',      label: 'Leave',       icon: 'umbrella-beach',   color: '#9CA3AF' },
  { type: 'HOLIDAY',    label: 'Holiday',     icon: 'party-popper',     color: '#9CA3AF' },
];

const LEAVE_OPTIONS: { type: LeaveType; label: string }[] = [
  { type: 'SICK',   label: 'Sick Leave' },
  { type: 'CASUAL', label: 'Casual Leave' },
  { type: 'EARNED', label: 'Earned Leave' },
];

const DayPlanFormScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<RouteProps>();
  const dispatch = useAppDispatch();
  const { date, existingEntry } = route.params;

  const [activityType, setActivityType] = useState<ActivityType>(
    existingEntry?.activityType ?? 'FIELD_WORK'
  );
  const [routeId, setRouteId] = useState<string | undefined>(existingEntry?.routeId);
  const [routeName, setRouteName] = useState<string | undefined>(existingEntry?.routeName);
  const [estimatedCalls, setEstimatedCalls] = useState(
    String(existingEntry?.estimatedCalls ?? 0)
  );
  const [notes, setNotes] = useState(existingEntry?.notes ?? '');
  const [leaveType, setLeaveType] = useState<LeaveType | undefined>(existingEntry?.leaveType);
  const [routes, setRoutes] = useState<RouteOption[]>([]);
  const [loadingRoutes, setLoadingRoutes] = useState(false);
  const [showRouteDropdown, setShowRouteDropdown] = useState(false);

  useEffect(() => {
    if (activityType === 'FIELD_WORK') fetchRoutes();
  }, [activityType]);

  const fetchRoutes = async () => {
    try {
      setLoadingRoutes(true);
      const res = await axiosInstance.get(API_CONFIG.ENDPOINTS.ROUTES, { params: { pageSize: 100 } });
      // Handle both paginated and plain array responses
      const items: RouteOption[] = res.data?.items ?? res.data ?? [];
      setRoutes(items);
    } catch (error) {
      console.error('Failed to load routes:', error);
    } finally {
      setLoadingRoutes(false);
    }
  };

  const handleSelectRoute = (r: RouteOption) => {
    setRouteId(r.id);
    setRouteName(r.routeName);
    setShowRouteDropdown(false);
  };

  const handleSave = () => {
    if (activityType === 'FIELD_WORK' && !routeId) {
      Alert.alert('Route Required', 'Please select a route for field work days.');
      return;
    }
    if (activityType === 'LEAVE' && !leaveType) {
      Alert.alert('Leave Type Required', 'Please select a leave type.');
      return;
    }

    const entry: DraftDayEntry = {
      date,
      activityType,
      routeId: activityType === 'FIELD_WORK' ? routeId : undefined,
      routeName: activityType === 'FIELD_WORK' ? routeName : undefined,
      estimatedCalls: activityType === 'FIELD_WORK' ? (parseInt(estimatedCalls) || 0) : 0,
      notes: notes.trim() || undefined,
      leaveType: activityType === 'LEAVE' ? leaveType : undefined,
    };

    dispatch(upsertDraftEntry(entry));
    navigation.goBack();
  };

  const handleClear = () => {
    Alert.alert('Clear Day', 'Remove the plan for this day?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: () => {
          dispatch(removeDraftEntry(date));
          navigation.goBack();
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Date Header */}
      <Card style={styles.dateCard}>
        <MaterialCommunityIcons name="calendar" size={22} color={COLORS.primary} />
        <Text style={styles.dateText}>{formatDate(date)}</Text>
      </Card>

      {/* Activity Type Selector */}
      <Text style={styles.sectionLabel}>Activity Type</Text>
      <View style={styles.activityGrid}>
        {ACTIVITY_OPTIONS.map(opt => (
          <TouchableOpacity
            key={opt.type}
            style={[
              styles.activityBtn,
              activityType === opt.type && { borderColor: opt.color, backgroundColor: `${opt.color}15` },
            ]}
            onPress={() => setActivityType(opt.type)}
          >
            <MaterialCommunityIcons
              name={opt.icon}
              size={24}
              color={activityType === opt.type ? opt.color : COLORS.textSecondary}
            />
            <Text style={[
              styles.activityLabel,
              activityType === opt.type && { color: opt.color, fontWeight: '700' },
            ]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* FIELD_WORK: Route selection */}
      {activityType === 'FIELD_WORK' && (
        <>
          <Text style={styles.sectionLabel}>Route / Area *</Text>
          <TouchableOpacity
            style={styles.routeSelector}
            onPress={() => setShowRouteDropdown(!showRouteDropdown)}
          >
            <MaterialCommunityIcons name="map-marker-path" size={20} color={COLORS.primary} />
            <Text style={[styles.routeSelectorText, !routeId && styles.placeholder]}>
              {routeName ?? (loadingRoutes ? 'Loading routes...' : 'Select a route')}
            </Text>
            <MaterialCommunityIcons
              name={showRouteDropdown ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={COLORS.textSecondary}
            />
          </TouchableOpacity>

          {showRouteDropdown && (
            <Card style={styles.dropdown}>
              {routes.length === 0 ? (
                <Text style={styles.dropdownEmpty}>No routes available</Text>
              ) : (
                routes.map(r => (
                  <TouchableOpacity
                    key={r.id}
                    style={[styles.dropdownItem, r.id === routeId && styles.dropdownItemSelected]}
                    onPress={() => handleSelectRoute(r)}
                  >
                    <Text style={[
                      styles.dropdownItemText,
                      r.id === routeId && { color: COLORS.primary, fontWeight: '600' },
                    ]}>
                      {r.routeName}
                    </Text>
                    {r.id === routeId && (
                      <MaterialCommunityIcons name="check" size={18} color={COLORS.primary} />
                    )}
                  </TouchableOpacity>
                ))
              )}
            </Card>
          )}

          <Input
            label="Estimated Doctor Calls"
            placeholder="0"
            keyboardType="numeric"
            value={estimatedCalls}
            onChangeText={setEstimatedCalls}
            icon="account-multiple"
          />
        </>
      )}

      {/* LEAVE: Leave type */}
      {activityType === 'LEAVE' && (
        <>
          <Text style={styles.sectionLabel}>Leave Type *</Text>
          <View style={styles.leaveRow}>
            {LEAVE_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.type}
                style={[
                  styles.leaveBtn,
                  leaveType === opt.type && styles.leaveBtnActive,
                ]}
                onPress={() => setLeaveType(opt.type)}
              >
                <Text style={[
                  styles.leaveBtnText,
                  leaveType === opt.type && styles.leaveBtnTextActive,
                ]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      {/* Notes */}
      <Input
        label="Notes (optional)"
        placeholder="Add notes for this day..."
        multiline
        numberOfLines={3}
        value={notes}
        onChangeText={setNotes}
        icon="note-text"
      />

      {/* Buttons */}
      <Button title="Save" onPress={handleSave} style={styles.saveBtn} icon="check" />

      {existingEntry && (
        <Button
          title="Clear Day"
          onPress={handleClear}
          variant="outlined"
          style={styles.clearBtn}
          icon="close"
        />
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.backgroundGray },
  content: { padding: SIZES.paddingLG, paddingBottom: 100 },
  dateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.paddingSM,
    marginBottom: SIZES.paddingMD,
    paddingVertical: SIZES.paddingSM,
  },
  dateText: { fontSize: SIZES.fontLG, fontWeight: '700', color: COLORS.textPrimary },
  sectionLabel: {
    fontSize: SIZES.fontMD,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SIZES.paddingSM,
    marginTop: SIZES.paddingSM,
  },
  activityGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SIZES.paddingSM,
    marginBottom: SIZES.paddingMD,
  },
  activityBtn: {
    width: '30%',
    alignItems: 'center',
    padding: SIZES.paddingSM,
    borderRadius: SIZES.radiusMD,
    borderWidth: 2,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
    gap: 4,
  },
  activityLabel: {
    fontSize: SIZES.fontXS,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  routeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radiusMD,
    padding: SIZES.paddingMD,
    marginBottom: SIZES.paddingSM,
    gap: SIZES.paddingSM,
  },
  routeSelectorText: { flex: 1, fontSize: SIZES.fontMD, color: COLORS.textPrimary },
  placeholder: { color: COLORS.textSecondary },
  dropdown: { marginBottom: SIZES.paddingMD, padding: 0, overflow: 'hidden' },
  dropdownEmpty: {
    padding: SIZES.paddingMD,
    color: COLORS.textSecondary,
    fontSize: SIZES.fontSM,
    textAlign: 'center',
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SIZES.paddingMD,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  dropdownItemSelected: { backgroundColor: `${COLORS.primary}0F` },
  dropdownItemText: { fontSize: SIZES.fontMD, color: COLORS.textPrimary },
  leaveRow: { flexDirection: 'row', gap: SIZES.paddingSM, marginBottom: SIZES.paddingMD },
  leaveBtn: {
    flex: 1,
    padding: SIZES.paddingSM,
    borderRadius: SIZES.radiusMD,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  leaveBtnActive: { borderColor: COLORS.primary, backgroundColor: `${COLORS.primary}15` },
  leaveBtnText: { fontSize: SIZES.fontSM, color: COLORS.textSecondary },
  leaveBtnTextActive: { color: COLORS.primary, fontWeight: '700' },
  saveBtn: { marginTop: SIZES.paddingMD },
  clearBtn: { marginTop: SIZES.paddingSM },
});

export default DayPlanFormScreen;
