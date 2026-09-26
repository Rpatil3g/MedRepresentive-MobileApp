import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Card, ErrorMessage, Loading } from '../../components/common';
import { chemistApi, doctorApi } from '../../services/api';
import { ApprovalStatus } from '../../types/doctor.types';
import { COLORS, SIZES } from '../../constants';
import { formatDoctorName } from '../../utils/helpers';

interface Submission {
  id: string;
  kind: 'Doctor' | 'Chemist';
  name: string;
  detail?: string;
  routeName?: string;
  status: ApprovalStatus;
  rejectionReason?: string;
  createdAt: string;
}

const STATUS_STYLE: Record<ApprovalStatus, { label: string; color: string; bg: string; icon: string }> = {
  PENDING: { label: 'Pending approval', color: '#b45309', bg: '#fef3c7', icon: 'clock-outline' },
  APPROVED: { label: 'Approved', color: '#047857', bg: '#d1fae5', icon: 'check-circle-outline' },
  REJECTED: { label: 'Rejected', color: '#b91c1c', bg: '#fee2e2', icon: 'close-circle-outline' },
};

// Doctors and chemists this MR added, with the manager's decision on each.
const MySubmissionsScreen: React.FC = () => {
  const [items, setItems] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [doctors, chemists] = await Promise.all([
        doctorApi.getMySubmissions(),
        chemistApi.getMySubmissions(),
      ]);
      const all: Submission[] = [
        ...doctors.map(d => ({
          id: d.id,
          kind: 'Doctor' as const,
          name: formatDoctorName(d.doctorName),
          detail: [d.specialty, d.clinicName].filter(Boolean).join(' · ') || undefined,
          routeName: d.routeName,
          status: d.approvalStatus ?? 'APPROVED',
          rejectionReason: d.rejectionReason,
          createdAt: d.createdAt,
        })),
        ...chemists.map(c => ({
          id: c.id,
          kind: 'Chemist' as const,
          name: c.pharmacyName || c.chemistName,
          detail: c.pharmacyName ? c.chemistName : undefined,
          routeName: c.routeName,
          status: c.approvalStatus ?? 'APPROVED',
          rejectionReason: c.rejectionReason,
          createdAt: c.createdAt,
        })),
      ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      setItems(all);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Failed to load your submissions.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (error && !refreshing) {
    return <ErrorMessage message={error} onRetry={load} />;
  }

  const pendingCount = items.filter(i => i.status === 'PENDING').length;

  const renderItem = ({ item }: { item: Submission }) => {
    const status = STATUS_STYLE[item.status] ?? STATUS_STYLE.PENDING;
    return (
      <Card style={styles.card}>
        <View style={styles.cardHeader}>
          <MaterialCommunityIcons
            name={item.kind === 'Doctor' ? 'doctor' : 'store'}
            size={24}
            color={COLORS.primary}
          />
          <View style={styles.cardTitle}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.meta}>
              {item.kind}
              {item.routeName ? ` · ${item.routeName}` : ''}
            </Text>
            {item.detail ? <Text style={styles.meta}>{item.detail}</Text> : null}
          </View>
        </View>
        <View style={[styles.badge, { backgroundColor: status.bg }]}>
          <MaterialCommunityIcons name={status.icon} size={14} color={status.color} />
          <Text style={[styles.badgeText, { color: status.color }]}>{status.label}</Text>
        </View>
        {item.status === 'REJECTED' && item.rejectionReason ? (
          <Text style={styles.reason}>Reason: {item.rejectionReason}</Text>
        ) : null}
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.intro}>
        {pendingCount > 0
          ? `${pendingCount} waiting for your manager's approval. Approved doctors and chemists appear in your tour plan.`
          : 'Doctors and chemists you add appear in your tour plan once your manager approves them.'}
      </Text>
      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={item => `${item.kind}-${item.id}`}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
          />
        }
        ListEmptyComponent={
          !loading ? <Text style={styles.empty}>You haven't added any doctors or chemists yet.</Text> : null
        }
      />
      <Loading visible={loading && !refreshing} message="Loading submissions..." />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundGray,
  },
  intro: {
    fontSize: SIZES.fontSM,
    color: COLORS.textSecondary,
    paddingHorizontal: SIZES.paddingLG,
    paddingTop: SIZES.paddingMD,
  },
  listContent: {
    padding: SIZES.paddingMD,
  },
  card: {
    marginBottom: SIZES.paddingMD,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  cardTitle: {
    flex: 1,
    marginLeft: SIZES.paddingSM,
  },
  name: {
    fontSize: SIZES.fontMD,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  meta: {
    fontSize: SIZES.fontSM,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: SIZES.paddingSM,
    paddingVertical: 4,
    borderRadius: SIZES.radiusMD,
    marginTop: SIZES.paddingSM,
  },
  badgeText: {
    fontSize: SIZES.fontXS,
    fontWeight: '600',
  },
  reason: {
    fontSize: SIZES.fontSM,
    color: COLORS.error,
    marginTop: SIZES.paddingSM,
  },
  empty: {
    textAlign: 'center',
    color: COLORS.textSecondary,
    marginTop: SIZES.paddingXL,
  },
});

export default MySubmissionsScreen;
