import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Card } from '../../components/common';
import tourPlanApi from '../../services/api/tourPlanApi';
import { TourPlanResponse, PlanStatus } from '../../types/tourPlan.types';
import { COLORS, SIZES } from '../../constants';
import { formatDate } from '../../utils/dateUtils';

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

const STATUS_COLORS: Record<PlanStatus, string> = {
  DRAFT: '#F59E0B',
  PENDING: '#3B82F6',
  APPROVED: '#16A34A',
  REJECTED: '#DC2626',
};

const STATUS_ICONS: Record<PlanStatus, string> = {
  DRAFT: 'pencil-outline',
  PENDING: 'clock-outline',
  APPROVED: 'check-circle-outline',
  REJECTED: 'close-circle-outline',
};

const ACTIVITY_LABELS: Record<string, string> = {
  FIELD_WORK: 'Field Work',
  MEETING: 'Meeting',
  TRAINING: 'Training',
  LEAVE: 'Leave',
  HOLIDAY: 'Holiday',
};

const MTPSummaryScreen: React.FC = () => {
  const [plans, setPlans] = useState<TourPlanResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      setLoading(true);
      const year = new Date().getFullYear();
      const res = await tourPlanApi.getById; // unused — use list endpoint
      const listRes = await tourPlanApi.getMyPlanByMonth; // unused below

      // Fetch this year's plans using the list endpoint
      const axiosRes = await import('../../services/api/axiosInstance').then(m => m.default);
      const { API_CONFIG } = await import('../../config/api.config');
      const response = await axiosRes.get(API_CONFIG.ENDPOINTS.TOUR_PLANS, {
        params: { year, pageSize: 12 },
      });
      const items: TourPlanResponse[] = response.data?.items ?? response.data ?? [];
      setPlans(items.sort((a, b) => b.month - a.month));
    } catch (error) {
      console.error('Failed to load plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderPlanCard = ({ item }: { item: TourPlanResponse }) => {
    const color = STATUS_COLORS[item.approvalStatus as PlanStatus] ?? COLORS.textSecondary;
    const icon = STATUS_ICONS[item.approvalStatus as PlanStatus] ?? 'help-circle-outline';

    return (
      <Card style={styles.planCard}>
        <View style={styles.planHeader}>
          <View>
            <Text style={styles.planMonth}>{MONTH_NAMES[item.month - 1]} {item.year}</Text>
            <Text style={styles.planSub}>{item.plannedDays}/{item.totalWorkingDays} days planned</Text>
          </View>
          <View style={[styles.statusChip, { backgroundColor: `${color}22`, borderColor: color }]}>
            <MaterialCommunityIcons name={icon} size={14} color={color} />
            <Text style={[styles.statusChipText, { color }]}>{item.approvalStatus}</Text>
          </View>
        </View>

        {/* Progress bar */}
        <View style={styles.barBg}>
          <View
            style={[
              styles.barFill,
              {
                width: `${item.totalWorkingDays > 0 ? (item.plannedDays / item.totalWorkingDays) * 100 : 0}%`,
                backgroundColor: color,
              },
            ]}
          />
        </View>

        {/* Date meta */}
        {item.submittedAt && (
          <Text style={styles.metaText}>
            Submitted: {formatDate(item.submittedAt)}
          </Text>
        )}
        {item.approvedAt && (
          <Text style={styles.metaText}>
            Reviewed: {formatDate(item.approvedAt)}
            {item.approverName ? ` by ${item.approverName}` : ''}
          </Text>
        )}
        {item.approverRemarks && (
          <Text style={styles.remarkText}>"{item.approverRemarks}"</Text>
        )}

        {/* Activity breakdown */}
        {item.details.length > 0 && (
          <View style={styles.activityRow}>
            {Object.entries(
              item.details.reduce((acc, d) => {
                acc[d.activityType] = (acc[d.activityType] ?? 0) + 1;
                return acc;
              }, {} as Record<string, number>)
            ).map(([type, count]) => (
              <View key={type} style={styles.activityChip}>
                <Text style={styles.activityChipText}>{ACTIVITY_LABELS[type] ?? type}: {count}</Text>
              </View>
            ))}
          </View>
        )}
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
      data={plans}
      keyExtractor={item => item.id}
      renderItem={renderPlanCard}
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="calendar-blank" size={48} color={COLORS.textSecondary} />
          <Text style={styles.emptyText}>No tour plans found for this year</Text>
        </View>
      }
      onRefresh={loadPlans}
      refreshing={loading}
    />
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.backgroundGray },
  content: { padding: SIZES.paddingMD, paddingBottom: SIZES.paddingLG },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  planCard: { marginBottom: SIZES.paddingMD },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SIZES.paddingSM,
  },
  planMonth: { fontSize: SIZES.fontLG, fontWeight: '700', color: COLORS.textPrimary },
  planSub: { fontSize: SIZES.fontSM, color: COLORS.textSecondary, marginTop: 2 },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusChipText: { fontSize: SIZES.fontXS, fontWeight: '700' },
  barBg: {
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: SIZES.paddingSM,
  },
  barFill: { height: 4, borderRadius: 2 },
  metaText: { fontSize: SIZES.fontXS, color: COLORS.textSecondary, marginTop: 2 },
  remarkText: {
    fontSize: SIZES.fontSM,
    color: COLORS.textSecondary,
    fontStyle: 'italic',
    marginTop: SIZES.paddingXS,
    paddingLeft: SIZES.paddingSM,
    borderLeftWidth: 2,
    borderLeftColor: COLORS.border,
  },
  activityRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: SIZES.paddingSM,
  },
  activityChip: {
    backgroundColor: COLORS.backgroundGray,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  activityChipText: { fontSize: SIZES.fontXS, color: COLORS.textSecondary },
  emptyContainer: { alignItems: 'center', paddingVertical: SIZES.paddingLG * 2 },
  emptyText: { fontSize: SIZES.fontMD, color: COLORS.textSecondary, marginTop: SIZES.paddingSM },
});

export default MTPSummaryScreen;
