import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { RouteProp, useRoute } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Card, Loading, ErrorMessage } from '../../components/common';
import { doctorApi } from '../../services/api';
import { Doctor } from '../../types/doctor.types';
import { DoctorStackParamList } from '../../types/navigation.types';
import { COLORS, SIZES } from '../../constants';

type DoctorDetailRouteProp = RouteProp<DoctorStackParamList, 'DoctorDetail'>;

const DoctorDetailScreen: React.FC = () => {
  const route = useRoute<DoctorDetailRouteProp>();
  const { doctorId } = route.params;

  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDoctorDetail = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await doctorApi.getDoctorById(doctorId);
      setDoctor(data);
    } catch (err) {
      console.error('Fetch doctor detail error:', err);
      setError('Failed to load doctor details');
    } finally {
      setLoading(false);
    }
  }, [doctorId]);

  useEffect(() => {
    fetchDoctorDetail();
  }, [fetchDoctorDetail]);

  const handleCall = async () => {
    if (!doctor?.mobileNumber) {
      return;
    }
    const url = `tel:${doctor.mobileNumber}`;
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      Linking.openURL(url);
    }
  };

  const handleOpenMap = async () => {
    if (!doctor?.geoLocation) {
      return;
    }
    const { latitude, longitude } = doctor.geoLocation;
    const url = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      Linking.openURL(url);
    }
  };

  if (loading) {
    return <Loading visible={loading} message="Loading doctor details..." />;
  }

  if (error || !doctor) {
    return <ErrorMessage message={error || 'Doctor not found'} onRetry={fetchDoctorDetail} />;
  }

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.headerCard}>
        <View style={styles.avatarLarge}>
          <MaterialCommunityIcons name="doctor" size={64} color={COLORS.primary} />
        </View>
        <Text style={styles.doctorName}>{doctor.doctorName}</Text>
        {doctor.qualification ? <Text style={styles.qualification}>{doctor.qualification}</Text> : null}
        {doctor.specialty ? (
          <View style={styles.specialtyBadge}>
            <Text style={styles.specialtyText}>{doctor.specialty}</Text>
          </View>
        ) : null}
      </Card>

      {doctor.mobileNumber ? (
        <View style={styles.actionsContainer}>
          <TouchableOpacity style={styles.actionButton} onPress={handleCall}>
            <MaterialCommunityIcons name="phone" size={24} color={COLORS.primary} />
            <Text style={styles.actionText}>Call</Text>
          </TouchableOpacity>

          {doctor.geoLocation ? (
            <TouchableOpacity style={styles.actionButton} onPress={handleOpenMap}>
              <MaterialCommunityIcons name="map-marker" size={24} color={COLORS.primary} />
              <Text style={styles.actionText}>Directions</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      <Card style={styles.infoCard}>
        <Text style={styles.sectionTitle}>Professional Information</Text>
        {doctor.registrationNumber ? (
          <InfoRow icon="card-account-details" label="Registration No" value={doctor.registrationNumber} />
        ) : null}
        {doctor.category ? <InfoRow icon="star" label="Category" value={doctor.category} /> : null}
        {doctor.averagePatientPerDay ? (
          <InfoRow
            icon="account-group"
            label="Avg Patients/Day"
            value={doctor.averagePatientPerDay.toString()}
          />
        ) : null}
        {doctor.bestTimeToVisit ? (
          <InfoRow icon="clock" label="Best Time to Visit" value={doctor.bestTimeToVisit} />
        ) : null}
      </Card>

      <Card style={styles.infoCard}>
        <Text style={styles.sectionTitle}>Contact Information</Text>
        {doctor.mobileNumber ? <InfoRow icon="phone" label="Mobile" value={doctor.mobileNumber} /> : null}
        {doctor.email ? <InfoRow icon="email" label="Email" value={doctor.email} /> : null}
        {doctor.clinicName ? (
          <InfoRow icon="hospital-building" label="Clinic Name" value={doctor.clinicName} />
        ) : null}
      </Card>

      {doctor.address ? (
        <Card style={styles.infoCard}>
          <Text style={styles.sectionTitle}>Address</Text>
          <View style={styles.addressContainer}>
            <MaterialCommunityIcons
              name="map-marker"
              size={20}
              color={COLORS.primary}
              style={styles.addressIcon}
            />
            <Text style={styles.addressText}>
              {doctor.address}
              {doctor.city ? `, ${doctor.city}` : ''}
              {doctor.state ? `, ${doctor.state}` : ''}
              {doctor.pincode ? ` - ${doctor.pincode}` : ''}
            </Text>
          </View>
        </Card>
      ) : null}

      {doctor.notes ? (
        <Card style={styles.infoCard}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <Text style={styles.notesText}>{doctor.notes}</Text>
        </Card>
      ) : null}
    </ScrollView>
  );
};

const InfoRow: React.FC<{ icon: string; label: string; value: string }> = ({ icon, label, value }) => {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoLeft}>
        <MaterialCommunityIcons name={icon} size={20} color={COLORS.textSecondary} />
        <Text style={styles.infoLabel}>{label}</Text>
      </View>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundGray,
  },
  headerCard: {
    margin: SIZES.paddingLG,
    alignItems: 'center',
    padding: SIZES.paddingXL,
  },
  avatarLarge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: `${COLORS.primaryLight}20`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SIZES.paddingMD,
  },
  doctorName: {
    fontSize: SIZES.font3XL,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: SIZES.paddingXS,
  },
  qualification: {
    fontSize: SIZES.fontMD,
    color: COLORS.textSecondary,
    marginBottom: SIZES.paddingSM,
  },
  specialtyBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SIZES.paddingMD,
    paddingVertical: SIZES.paddingSM,
    borderRadius: SIZES.radiusMD,
    marginTop: SIZES.paddingSM,
  },
  specialtyText: {
    color: COLORS.textWhite,
    fontSize: SIZES.fontMD,
    fontWeight: '600',
  },
  actionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: SIZES.paddingLG,
    gap: SIZES.paddingMD,
    marginBottom: SIZES.paddingMD,
  },
  actionButton: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: SIZES.paddingMD,
    borderRadius: SIZES.radiusMD,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  actionText: {
    marginTop: SIZES.paddingXS,
    fontSize: SIZES.fontSM,
    color: COLORS.primary,
    fontWeight: '600',
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
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  addressIcon: {
    marginRight: SIZES.paddingSM,
    marginTop: 2,
  },
  addressText: {
    flex: 1,
    fontSize: SIZES.fontMD,
    color: COLORS.textPrimary,
    lineHeight: 22,
  },
  notesText: {
    fontSize: SIZES.fontMD,
    color: COLORS.textPrimary,
    lineHeight: 22,
  },
});

export default DoctorDetailScreen;

