import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Loading, ErrorMessage } from '../../components/common';
import { visitApi } from '../../services/api';
import { Visit } from '../../types/visit.types';
import { VisitStackParamList } from '../../types/navigation.types';
import { COLORS, SIZES } from '../../constants';
import { formatTime, formatDateTime } from '../../utils/dateUtils';

type VisitDetailRouteProp = RouteProp<VisitStackParamList, 'VisitDetail'>;

// ─── Sub-components ───────────────────────────────────────────────────────────

const SectionHeader: React.FC<{ icon: string; title: string }> = ({ icon, title }) => (
  <View style={styles.sectionHeader}>
    <MaterialCommunityIcons name={icon} size={16} color={COLORS.primary} />
    <Text style={styles.sectionTitle}>{title}</Text>
  </View>
);

const Row: React.FC<{ label: string; value: string; valueColor?: string }> = ({
  label,
  value,
  valueColor,
}) => (
  <View style={styles.row}>
    <Text style={styles.rowLabel}>{label}</Text>
    <Text style={[styles.rowValue, valueColor ? { color: valueColor } : null]}>{value}</Text>
  </View>
);

const Pill: React.FC<{ label: string; color: string; bg: string }> = ({ label, color, bg }) => (
  <View style={[styles.pill, { backgroundColor: bg }]}>
    <Text style={[styles.pillText, { color }]}>{label}</Text>
  </View>
);

// ─── Main screen ──────────────────────────────────────────────────────────────

const VisitDetailScreen: React.FC = () => {
  const route = useRoute<VisitDetailRouteProp>();
  const { visitId } = route.params;

  const [visit, setVisit] = useState<Visit | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchVisitDetail();
  }, [visitId]);

  const fetchVisitDetail = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await visitApi.getVisitById(visitId);
      setVisit(data);
    } catch (err: any) {
      console.error('Fetch visit detail error:', err);
      setError('Failed to load visit details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loading visible message="Loading visit details..." />;
  if (error || !visit) return <ErrorMessage message={error || 'Visit not found'} onRetry={fetchVisitDetail} />;

  const isActive = visit.status === 'Checked-In';
  const isCompleted = visit.status === 'Checked-Out' || visit.status === 'Completed';
  const isCancelled = visit.status === 'Cancelled';

  const statusColor = isActive
    ? COLORS.warning
    : isCompleted
    ? COLORS.success
    : isCancelled
    ? COLORS.error
    : COLORS.textDisabled;

  const contactName = visit.doctorName || visit.chemistName || visit.stockistName || 'Unknown';
  const contactSub = visit.doctorSpecialty || visit.chemistShopName || visit.stockistCompanyName || '';
  const isDoctor = visit.visitType === 'Doctor';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>

      {/* ── Hero Card ── */}
      <View style={styles.heroCard}>
        <View style={[styles.heroAccent, { backgroundColor: statusColor }]} />
        <View style={styles.heroBody}>
          <View style={styles.heroTop}>
            <View style={[styles.heroIcon, { backgroundColor: COLORS.primaryLight }]}>
              <MaterialCommunityIcons
                name={isDoctor ? 'doctor' : 'store-outline'}
                size={28}
                color={COLORS.primary}
              />
            </View>
            <View style={styles.heroInfo}>
              <Text style={styles.heroName}>{contactName}</Text>
              {contactSub ? <Text style={styles.heroSub}>{contactSub}</Text> : null}
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
              <Text style={styles.statusBadgeText}>{visit.status}</Text>
            </View>
          </View>

          {/* Timing row */}
          <View style={styles.timingRow}>
            <View style={styles.timingItem}>
              <MaterialCommunityIcons name="calendar-clock" size={14} color={COLORS.textSecondary} />
              <Text style={styles.timingLabel}>Logged</Text>
              <Text style={styles.timingValue}>{formatDateTime(visit.visitDateTime)}</Text>
            </View>
            {visit.checkInTime && (
              <View style={styles.timingItem}>
                <MaterialCommunityIcons name="login" size={14} color={COLORS.success} />
                <Text style={styles.timingLabel}>Check-in</Text>
                <Text style={styles.timingValue}>{formatTime(visit.checkInTime)}</Text>
              </View>
            )}
            {visit.checkOutTime && (
              <View style={styles.timingItem}>
                <MaterialCommunityIcons name="logout" size={14} color={COLORS.error} />
                <Text style={styles.timingLabel}>Check-out</Text>
                <Text style={styles.timingValue}>{formatTime(visit.checkOutTime)}</Text>
              </View>
            )}
            {visit.visitDurationMinutes > 0 && (
              <View style={styles.timingItem}>
                <MaterialCommunityIcons name="clock-outline" size={14} color={COLORS.primary} />
                <Text style={styles.timingLabel}>Duration</Text>
                <Text style={[styles.timingValue, { color: COLORS.primary, fontWeight: '700' }]}>
                  {visit.visitDurationFormatted || `${visit.visitDurationMinutes} min`}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* ── Visit Info ── */}
      <View style={styles.card}>
        <SectionHeader icon="clipboard-text-outline" title="Visit Info" />
        <View style={styles.pillRow}>
          {visit.visitType && (
            <Pill label={visit.visitType} color={COLORS.primary} bg={COLORS.primaryLight} />
          )}
          {visit.callType && (
            <Pill label={visit.callType} color={COLORS.info} bg={COLORS.infoLight} />
          )}
          {visit.isPlannedVisit && (
            <Pill label="Planned" color={COLORS.secondary} bg={COLORS.surface} />
          )}
          {visit.isGeofenceBreach && (
            <Pill label="Out of Range" color={COLORS.warning} bg={COLORS.warningLight} />
          )}
        </View>
        {visit.callOutcome && (
          <Row label="Call Outcome" value={visit.callOutcome} />
        )}
        {(visit.distanceFromTargetMeters ?? 0) > 0 && (
          <Row
            label="Distance from Target"
            value={
              visit.distanceFromTargetMeters! >= 1000
                ? `${(visit.distanceFromTargetMeters! / 1000).toFixed(2)} km`
                : `${visit.distanceFromTargetMeters!.toFixed(1)} m`
            }
            valueColor={visit.isGeofenceBreach ? COLORS.warning : undefined}
          />
        )}
      </View>

      {/* ── Interaction ── */}
      {(visit.productsDiscussed.length > 0 ||
        visit.visualsShown.length > 0 ||
        visit.presentationTimeSeconds > 0 ||
        visit.giftsGiven) && (
        <View style={styles.card}>
          <SectionHeader icon="handshake-outline" title="Interaction" />
          {visit.productsDiscussed.length > 0 && (
            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>Products Discussed</Text>
              <View style={styles.pillRow}>
                {visit.productsDiscussed.map((p, i) => (
                  <Pill key={i} label={p} color={COLORS.primary} bg={COLORS.primaryLight} />
                ))}
              </View>
            </View>
          )}
          {visit.visualsShown.length > 0 && (
            <View style={styles.fieldBlock}>
              <Text style={styles.fieldLabel}>Visuals Shown</Text>
              <View style={styles.pillRow}>
                {visit.visualsShown.map((v, i) => (
                  <Pill key={i} label={v} color={COLORS.secondary} bg={COLORS.surface} />
                ))}
              </View>
            </View>
          )}
          {visit.presentationTimeSeconds > 0 && (
            <Row
              label="Presentation Time"
              value={visit.presentationTimeFormatted || `${Math.round(visit.presentationTimeSeconds / 60)} min`}
            />
          )}
          {visit.giftsGiven && (
            <Row label="Gifts Given" value={visit.giftsGiven} />
          )}
        </View>
      )}

      {/* ── Order ── */}
      <View style={styles.card}>
        <SectionHeader icon="cash-multiple" title="Order" />
        <Row
          label="Order Booked"
          value={visit.isOrderBooked ? 'Yes' : 'No'}
          valueColor={visit.isOrderBooked ? COLORS.success : COLORS.textSecondary}
        />
        {visit.isOrderBooked && visit.orderValue !== undefined && visit.orderValue !== null && (
          <Row label="Order Value" value={`₹ ${visit.orderValue.toLocaleString('en-IN')}`} />
        )}
      </View>

      {/* ── Samples ── */}
      {visit.samples.length > 0 && (
        <View style={styles.card}>
          <SectionHeader icon="package-variant" title={`Samples Given (${visit.samples.length})`} />
          {visit.samples.map((s, i) => (
            <View
              key={s.id}
              style={[styles.sampleRow, i < visit.samples.length - 1 && styles.sampleDivider]}
            >
              <View style={styles.sampleMain}>
                <Text style={styles.sampleName}>{s.productName}</Text>
                {s.packSize && <Text style={styles.sampleSub}>{s.packSize}</Text>}
              </View>
              <View style={styles.sampleMeta}>
                <Text style={styles.sampleQty}>×{s.quantity}</Text>
                {s.batchNumber && (
                  <Text style={styles.sampleBatch}>Batch: {s.batchNumber}</Text>
                )}
              </View>
            </View>
          ))}
        </View>
      )}

      {/* ── Remarks & Notes ── */}
      {(visit.issuesDiscussed || visit.feedback || visit.competitorInfo || visit.nextActionPlan) && (
        <View style={styles.card}>
          <SectionHeader icon="note-text-outline" title="Remarks & Notes" />
          {visit.issuesDiscussed && (
            <View style={styles.noteBlock}>
              <Text style={styles.noteLabel}>Issues Discussed</Text>
              <Text style={styles.noteText}>{visit.issuesDiscussed}</Text>
            </View>
          )}
          {visit.feedback && (
            <View style={styles.noteBlock}>
              <Text style={styles.noteLabel}>Doctor Feedback</Text>
              <Text style={styles.noteText}>{visit.feedback}</Text>
            </View>
          )}
          {visit.competitorInfo && (
            <View style={styles.noteBlock}>
              <Text style={styles.noteLabel}>Competitor Info</Text>
              <Text style={styles.noteText}>{visit.competitorInfo}</Text>
            </View>
          )}
          {visit.nextActionPlan && (
            <View style={styles.noteBlock}>
              <Text style={styles.noteLabel}>Next Action Plan</Text>
              <Text style={styles.noteText}>{visit.nextActionPlan}</Text>
            </View>
          )}
        </View>
      )}

    </ScrollView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundGray,
  },
  content: {
    padding: SIZES.paddingMD,
    paddingBottom: 40,
    gap: SIZES.paddingMD,
  },

  // Hero card
  heroCard: {
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radiusLG,
    flexDirection: 'row',
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  heroAccent: {
    width: 5,
  },
  heroBody: {
    flex: 1,
    padding: SIZES.paddingMD,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SIZES.paddingSM,
  },
  heroIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroInfo: {
    flex: 1,
  },
  heroName: {
    fontSize: SIZES.font2XL,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  heroSub: {
    fontSize: SIZES.fontSM,
    color: COLORS.primary,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: SIZES.radiusRound,
  },
  statusBadgeText: {
    fontSize: SIZES.fontXS,
    fontWeight: '700',
    color: COLORS.textWhite,
    letterSpacing: 0.3,
  },

  // Timing row
  timingRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SIZES.paddingMD,
    marginTop: SIZES.paddingMD,
    paddingTop: SIZES.paddingMD,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  timingItem: {
    alignItems: 'flex-start',
    gap: 2,
  },
  timingLabel: {
    fontSize: SIZES.fontXS,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  timingValue: {
    fontSize: SIZES.fontSM,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },

  // Generic card
  card: {
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radiusLG,
    padding: SIZES.paddingMD,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    gap: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: SIZES.paddingSM,
    paddingBottom: SIZES.paddingSM,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  sectionTitle: {
    fontSize: SIZES.fontMD,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Row (label / value)
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  rowLabel: {
    fontSize: SIZES.fontMD,
    color: COLORS.textSecondary,
    flex: 1,
  },
  rowValue: {
    fontSize: SIZES.fontMD,
    fontWeight: '600',
    color: COLORS.textPrimary,
    textAlign: 'right',
    flex: 1,
  },

  // Pills
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingVertical: 6,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: SIZES.radiusRound,
  },
  pillText: {
    fontSize: SIZES.fontXS,
    fontWeight: '600',
  },

  // Field block (label above pills)
  fieldBlock: {
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  fieldLabel: {
    fontSize: SIZES.fontSM,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },

  // Samples
  sampleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  sampleDivider: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  sampleMain: {
    flex: 1,
  },
  sampleName: {
    fontSize: SIZES.fontMD,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  sampleSub: {
    fontSize: SIZES.fontSM,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  sampleMeta: {
    alignItems: 'flex-end',
  },
  sampleQty: {
    fontSize: SIZES.fontLG,
    fontWeight: '700',
    color: COLORS.primary,
  },
  sampleBatch: {
    fontSize: SIZES.fontXS,
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  // Notes
  noteBlock: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  noteLabel: {
    fontSize: SIZES.fontSM,
    color: COLORS.textSecondary,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  noteText: {
    fontSize: SIZES.fontMD,
    color: COLORS.textPrimary,
    lineHeight: 22,
  },
});

export default VisitDetailScreen;
