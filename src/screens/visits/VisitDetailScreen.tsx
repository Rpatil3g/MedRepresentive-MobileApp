import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useRoute, RouteProp, useNavigation } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Card, Loading, ErrorMessage, Button } from '../../components/common';
import { visitApi } from '../../services/api';
import { Visit } from '../../types/visit.types';
import { VisitStackParamList } from '../../types/navigation.types';
import { COLORS, SIZES } from '../../constants';
import { formatTime } from '../../utils/dateUtils';

type VisitDetailRouteProp = RouteProp<VisitStackParamList, 'VisitDetail'>;
type VisitDetailNavProp = import('@react-navigation/stack').StackNavigationProp<VisitStackParamList, 'VisitDetail'>;

const VisitDetailScreen: React.FC = () => {
  const route = useRoute<VisitDetailRouteProp>();
  const navigation = useNavigation<VisitDetailNavProp>();
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

  const handleGoToCheckOut = () => {
    navigation.navigate('VisitCheckOut', { visitId });
  };

  if (loading) {
    return <Loading visible={loading} message="Loading visit details..." />;
  }

  if (error || !visit) {
    return <ErrorMessage message={error || 'Visit not found'} onRetry={fetchVisitDetail} />;
  }

  const isActive = visit.status === 'Checked-In';
  const isCompleted = visit.status === 'Checked-Out';

  return (
    <ScrollView style={styles.container}>
      {/* Status Header */}
      <Card style={styles.statusCard}>
        <View style={styles.statusHeader}>
          <MaterialCommunityIcons
            name={isActive ? 'clock-check' : 'check-circle'}
            size={48}
            color={isActive ? COLORS.warning : COLORS.success}
          />
          <View style={styles.statusInfo}>
            <Text style={styles.statusTitle}>{visit.status}</Text>
            <Text style={styles.statusTime}>
              Check-in: {formatTime(visit.checkInTime)}
            </Text>
            {visit.checkOutTime && (
              <Text style={styles.statusTime}>
                Check-out: {formatTime(visit.checkOutTime)}
              </Text>
            )}
          </View>
        </View>
        {visit.visitDurationMinutes > 0 && (
          <View style={styles.durationBadge}>
            <MaterialCommunityIcons name="timer" size={16} color={COLORS.textWhite} />
            <Text style={styles.durationText}>{visit.visitDurationMinutes} minutes</Text>
          </View>
        )}
      </Card>

      {/* Doctor/Chemist Info */}
      {(visit.doctorName || visit.chemistName) && (
        <Card style={styles.infoCard}>
          <Text style={styles.sectionTitle}>
            {visit.visitType === 'Doctor' ? 'Doctor' : 'Chemist'} Information
          </Text>
          <InfoRow
            icon="doctor"
            label="Name"
            value={visit.doctorName || visit.chemistName || ''}
          />
          {visit.doctorSpecialty && (
            <InfoRow icon="stethoscope" label="Specialty" value={visit.doctorSpecialty} />
          )}
          {visit.chemistShopName && (
            <InfoRow icon="store" label="Shop" value={visit.chemistShopName} />
          )}
        </Card>
      )}

      {/* Visit Details */}
      <Card style={styles.infoCard}>
        <Text style={styles.sectionTitle}>Visit Details</Text>
        <InfoRow
          icon="calendar-check"
          label="Planned"
          value={visit.isPlannedVisit ? 'Yes' : 'No'}
        />
        {visit.distanceFromTargetMeters !== undefined && (
          <InfoRow
            icon="map-marker-distance"
            label="Distance"
            value={`${Math.round(visit.distanceFromTargetMeters)} meters`}
          />
        )}
        {visit.isGeofenceBreach && (
          <InfoRow
            icon="alert"
            label="Geofence"
            value="Out of Range"
            valueColor={COLORS.warning}
          />
        )}
      </Card>

      {/* Products & Samples (if checked out) */}
      {isCompleted && (
        <>
          {visit.productsDiscussed.length > 0 && (
            <Card style={styles.infoCard}>
              <Text style={styles.sectionTitle}>Products Discussed</Text>
              <Text style={styles.detailText}>{visit.productsDiscussed.join(', ')}</Text>
            </Card>
          )}

          {visit.samples.length > 0 && (
            <Card style={styles.infoCard}>
              <Text style={styles.sectionTitle}>Samples Given</Text>
              {visit.samples.map((s) => (
                <Text key={s.id} style={styles.detailText}>
                  {s.productName} × {s.quantity}
                </Text>
              ))}
            </Card>
          )}

          {visit.feedback && (
            <Card style={styles.infoCard}>
              <Text style={styles.sectionTitle}>Feedback</Text>
              <Text style={styles.detailText}>{visit.feedback}</Text>
            </Card>
          )}

          {visit.nextActionPlan && (
            <Card style={styles.infoCard}>
              <Text style={styles.sectionTitle}>Next Action Plan</Text>
              <Text style={styles.detailText}>{visit.nextActionPlan}</Text>
            </Card>
          )}
        </>
      )}

      {/* Check-out Button */}
      {isActive && (
        <Card style={styles.checkOutCard}>
          <Button
            title="Check Out"
            onPress={handleGoToCheckOut}
            icon="logout"
          />
        </Card>
      )}
    </ScrollView>
  );
};

const InfoRow: React.FC<{
  icon: string;
  label: string;
  value: string;
  valueColor?: string;
}> = ({ icon, label, value, valueColor }) => (
  <View style={styles.infoRow}>
    <View style={styles.infoLeft}>
      <MaterialCommunityIcons name={icon} size={20} color={COLORS.textSecondary} />
      <Text style={styles.infoLabel}>{label}</Text>
    </View>
    <Text style={[styles.infoValue, valueColor ? { color: valueColor } : undefined]}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundGray,
  },
  statusCard: {
    margin: SIZES.paddingLG,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusInfo: {
    flex: 1,
    marginLeft: SIZES.paddingMD,
  },
  statusTitle: {
    fontSize: SIZES.font2XL,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  statusTime: {
    fontSize: SIZES.fontMD,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: SIZES.paddingMD,
    paddingVertical: SIZES.paddingSM,
    borderRadius: SIZES.radiusMD,
    alignSelf: 'flex-start',
    marginTop: SIZES.paddingMD,
  },
  durationText: {
    color: COLORS.textWhite,
    fontSize: SIZES.fontSM,
    fontWeight: '600',
    marginLeft: 4,
  },
  infoCard: {
    margin: SIZES.paddingLG,
    marginTop: 0,
  },
  sectionTitle: {
    fontSize: SIZES.fontLG,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SIZES.paddingMD,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SIZES.paddingMD,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  infoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  infoLabel: {
    fontSize: SIZES.fontMD,
    color: COLORS.textSecondary,
    marginLeft: SIZES.paddingSM,
  },
  infoValue: {
    fontSize: SIZES.fontMD,
    color: COLORS.textPrimary,
    fontWeight: '500',
    textAlign: 'right',
    flex: 1,
  },
  detailText: {
    fontSize: SIZES.fontMD,
    color: COLORS.textPrimary,
    lineHeight: 22,
  },
  checkOutCard: {
    margin: SIZES.paddingLG,
    marginTop: 0,
  },
});

export default VisitDetailScreen;
