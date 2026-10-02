import React, { useCallback, useState } from 'react';
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
import { format } from 'date-fns';
import { ErrorMessage } from '../../components/common';
import { targetApi } from '../../services/api';
import { MyTargets } from '../../types/target.types';
import { COLORS, SIZES } from '../../constants';
import { formatINR, formatINRShort } from './orderMeta';

/** On target / close / behind — same bands as the manager's web report. */
const toneFor = (pct?: number | null) => {
  if (pct == null) return { color: COLORS.textDisabled, bg: COLORS.surface };
  if (pct >= 100) return { color: '#047857', bg: '#d1fae5' };
  if (pct >= 75) return { color: '#b45309', bg: '#fef3c7' };
  return { color: '#dc2626', bg: '#fee2e2' };
};

const pctText = (pct?: number | null) => (pct == null ? '—' : `${Math.round(pct)}%`);

const monthLabel = (t: MyTargets, pattern = 'MMMM yyyy') => format(new Date(t.year, t.month - 1, 1), pattern);

interface ProgressRowProps {
  icon: string;
  title: string;
  achieved: string;
  target: string | null;
  pct?: number | null;
  footnote?: string;
}

const ProgressRow: React.FC<ProgressRowProps> = ({ icon, title, achieved, target, pct, footnote }) => {
  const tone = toneFor(pct);
  return (
    <View style={styles.progressRow}>
      <View style={styles.progressHeader}>
        <View style={styles.progressTitleRow}>
          <MaterialCommunityIcons name={icon} size={18} color={COLORS.textSecondary} />
          <Text style={styles.progressTitle}>{title}</Text>
        </View>
        <View style={[styles.pctPill, { backgroundColor: tone.bg }]}>
          <Text style={[styles.pctText, { color: tone.color }]}>{pctText(pct)}</Text>
        </View>
      </View>
      <Text style={styles.progressValue}>
        {achieved}
        <Text style={styles.progressTarget}>{target ? ` / ${target}` : '  (no target set)'}</Text>
      </Text>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${Math.min(pct ?? 0, 100)}%`, backgroundColor: tone.color }]} />
      </View>
      {footnote ? <Text style={styles.footnote}>{footnote}</Text> : null}
    </View>
  );
};

const MyTargetsScreen: React.FC = () => {
  const [history, setHistory] = useState<MyTargets[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setHistory(await targetApi.getMyHistory(6));
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load targets');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={load} />;
  }

  const current = history[0];
  const past = history.slice(1);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={COLORS.primary} />}
    >
      {current && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{monthLabel(current)}</Text>

          <ProgressRow
            icon="currency-inr"
            title="Sales"
            achieved={formatINR(current.actualSales, 0)}
            target={current.salesTarget ? formatINR(current.salesTarget, 0) : null}
            pct={current.salesAchievement}
            footnote={current.pendingSales > 0
              ? `${formatINR(current.pendingSales, 0)} booked, awaiting dispatch`
              : undefined}
          />

          <View style={styles.divider} />

          <ProgressRow
            icon="account-check-outline"
            title="Visits (Met)"
            achieved={String(current.actualVisits)}
            target={current.visitTarget ? String(current.visitTarget) : null}
            pct={current.visitAchievement}
          />
        </View>
      )}

      <View style={styles.rulesBox}>
        <MaterialCommunityIcons name="information-outline" size={16} color={COLORS.primary} />
        <Text style={styles.rulesText}>
          Sales count in the month your order is dispatched. Visits count when the outcome is Met. Targets are set by your manager.
        </Text>
      </View>

      {past.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Previous Months</Text>
          <View style={styles.historyHeader}>
            <Text style={[styles.historyHeadText, styles.colMonth]}>Month</Text>
            <Text style={[styles.historyHeadText, styles.colValue]}>Sales</Text>
            <Text style={[styles.historyHeadText, styles.colValue]}>Visits</Text>
          </View>
          {past.map((m, idx) => {
            const salesTone = toneFor(m.salesAchievement);
            const visitTone = toneFor(m.visitAchievement);
            return (
              <View key={`${m.year}-${m.month}`} style={[styles.historyRow, idx < past.length - 1 && styles.historyBorder]}>
                <Text style={[styles.historyMonth, styles.colMonth]}>{monthLabel(m, 'MMM yyyy')}</Text>
                <View style={styles.colValue}>
                  <Text style={styles.historyValue}>{formatINRShort(m.actualSales)}</Text>
                  <Text style={[styles.historyPct, { color: salesTone.color }]}>{pctText(m.salesAchievement)}</Text>
                </View>
                <View style={styles.colValue}>
                  <Text style={styles.historyValue}>{m.actualVisits}</Text>
                  <Text style={[styles.historyPct, { color: visitTone.color }]}>{pctText(m.visitAchievement)}</Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundGray,
  },
  content: {
    padding: SIZES.paddingMD,
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundGray,
  },
  card: {
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radiusLG,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SIZES.paddingMD,
    marginBottom: SIZES.paddingMD,
  },
  cardTitle: {
    fontSize: SIZES.fontMD,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SIZES.paddingMD,
  },
  progressRow: {
    gap: 6,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  progressTitle: {
    fontSize: SIZES.fontSM,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  pctPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  pctText: {
    fontSize: SIZES.fontSM,
    fontWeight: '800',
  },
  progressValue: {
    fontSize: SIZES.fontXL,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  progressTarget: {
    fontSize: SIZES.fontSM,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  progressBar: {
    height: 8,
    backgroundColor: COLORS.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  footnote: {
    fontSize: SIZES.fontXS,
    color: '#b45309',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.divider,
    marginVertical: SIZES.paddingMD,
  },
  rulesBox: {
    flexDirection: 'row',
    gap: 8,
    padding: SIZES.paddingSM + 2,
    backgroundColor: COLORS.primaryLight,
    borderRadius: SIZES.radiusMD,
    marginBottom: SIZES.paddingMD,
  },
  rulesText: {
    flex: 1,
    fontSize: SIZES.fontXS,
    color: COLORS.textPrimary,
    lineHeight: 17,
  },
  historyHeader: {
    flexDirection: 'row',
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  historyHeadText: {
    fontSize: SIZES.fontXS,
    fontWeight: '700',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  historyBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  colMonth: {
    flex: 1.2,
  },
  colValue: {
    flex: 1,
    alignItems: 'flex-end',
    textAlign: 'right',
  },
  historyMonth: {
    fontSize: SIZES.fontSM,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  historyValue: {
    fontSize: SIZES.fontSM,
    color: COLORS.textPrimary,
  },
  historyPct: {
    fontSize: SIZES.fontXS,
    fontWeight: '700',
  },
});

export default MyTargetsScreen;
