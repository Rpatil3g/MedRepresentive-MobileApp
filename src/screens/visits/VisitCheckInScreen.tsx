import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Geolocation from 'react-native-geolocation-service';
import { Button, Card, Input, Loading } from '../../components/common';
import { useAppDispatch } from '../../store/hooks';
import { addVisit, setActiveVisit } from '../../store/slices/visitSlice';
import { visitApi, doctorApi } from '../../services/api';
import { Doctor } from '../../types/doctor.types';
import { CheckInVisitRequest } from '../../types/visit.types';
import { VisitStackParamList } from '../../types/navigation.types';
import { COLORS, SIZES } from '../../constants';
import { requestLocationPermission, showAlert } from '../../utils/helpers';

type VisitCheckInRouteProp = RouteProp<VisitStackParamList, 'VisitCheckIn'>;

const VisitCheckInScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<VisitCheckInRouteProp>();
  const dispatch = useAppDispatch();

  const { doctorId } = route.params || {};

  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [visitType, setVisitType] = useState<'Doctor' | 'Chemist'>('Doctor');
  const [isPlanned, setIsPlanned] = useState(false);
  const [purposeOfVisit, setPurposeOfVisit] = useState('');
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);

  useEffect(() => {
    if (doctorId) {
      fetchDoctorDetails();
    }
    getCurrentLocation();
  }, [doctorId]);

  const fetchDoctorDetails = async () => {
    try {
      const data = await doctorApi.getDoctorById(doctorId!);
      setDoctor(data);
    } catch (error) {
      console.error('Fetch doctor error:', error);
    }
  };

  const getCurrentLocation = async () => {
    try {
      const hasPermission = await requestLocationPermission();
      if (!hasPermission) {
        showAlert('Permission Denied', 'Location permission is required for check-in');
        return;
      }

      setGettingLocation(true);
      Geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          setGettingLocation(false);
        },
        (error) => {
          console.error('Location error:', error);
          setGettingLocation(false);
          showAlert('Location Error', 'Failed to get current location. Please try again.');
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
      );
    } catch (error) {
      console.error('Permission error:', error);
      setGettingLocation(false);
    }
  };

  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number => {
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  };

  const handleCheckIn = async () => {
    try {
      if (!location) {
        showAlert('Location Required', 'Please wait for location to be captured');
        return;
      }

      setLoading(true);

      if (doctor?.geoLocation && location) {
        const distance = calculateDistance(
          location.latitude,
          location.longitude,
          doctor.geoLocation.latitude,
          doctor.geoLocation.longitude
        );

        if (distance > 200) {
          Alert.alert(
            'Distance Warning',
            `You are ${Math.round(distance)} meters away from the doctor's location. Continue check-in?`,
            [
              { text: 'Cancel', style: 'cancel', onPress: () => setLoading(false) },
              { text: 'Continue', onPress: () => performCheckIn() },
            ]
          );
          return;
        }
      }

      await performCheckIn();
    } catch (error: any) {
      console.error('Check-in error:', error);
      showAlert('Error', 'Failed to check-in. Please try again.');
      setLoading(false);
    }
  };

  const performCheckIn = async () => {
    try {
      const checkInData: CheckInVisitRequest = {
        doctorId: visitType === 'Doctor' ? doctorId : undefined,
        chemistId: visitType === 'Chemist' ? doctorId : undefined,
        checkInTime: new Date().toISOString(),
        visitType,
        latitude: location!.latitude,
        longitude: location!.longitude,
        isPlannedVisit: isPlanned,
      };

      const visit = await visitApi.checkIn(checkInData);
      dispatch(addVisit(visit));
      dispatch(setActiveVisit(visit));

      showAlert('Success', 'Check-in successful!', () => {
        navigation.goBack();
      });
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message || 'Failed to check-in. Please try again.';
      showAlert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Location Card */}
      <Card style={styles.locationCard}>
        <View style={styles.locationHeader}>
          <MaterialCommunityIcons
            name="map-marker"
            size={24}
            color={location ? COLORS.success : COLORS.warning}
          />
          <Text style={styles.locationTitle}>Current Location</Text>
        </View>
        {gettingLocation ? (
          <View style={styles.locationLoading}>
            <ActivityIndicator color={COLORS.primary} />
            <Text style={styles.locationText}>Getting location...</Text>
          </View>
        ) : location ? (
          <Text style={styles.locationText}>
            Latitude: {location.latitude.toFixed(6)}{'\n'}
            Longitude: {location.longitude.toFixed(6)}
          </Text>
        ) : (
          <View>
            <Text style={styles.locationError}>Location not available</Text>
            <Button
              title="Retry Location"
              onPress={getCurrentLocation}
              size="small"
              style={styles.retryButton}
            />
          </View>
        )}
      </Card>

      {/* Doctor Info (if selected) */}
      {doctor && (
        <Card style={styles.doctorCard}>
          <View style={styles.doctorHeader}>
            <MaterialCommunityIcons name="doctor" size={32} color={COLORS.primary} />
            <View style={styles.doctorInfo}>
              <Text style={styles.doctorName}>{doctor.doctorName}</Text>
              {doctor.specialty && (
                <Text style={styles.doctorSpecialty}>{doctor.specialty}</Text>
              )}
              {doctor.clinicName && (
                <Text style={styles.doctorClinic}>{doctor.clinicName}</Text>
              )}
            </View>
          </View>
          {doctor.geoLocation && location && (
            <View style={styles.distanceInfo}>
              <MaterialCommunityIcons
                name="map-marker-distance"
                size={16}
                color={COLORS.textSecondary}
              />
              <Text style={styles.distanceText}>
                Distance:{' '}
                {Math.round(
                  calculateDistance(
                    location.latitude,
                    location.longitude,
                    doctor.geoLocation.latitude,
                    doctor.geoLocation.longitude
                  )
                )}{' '}
                meters
              </Text>
            </View>
          )}
        </Card>
      )}

      {/* Visit Type */}
      <Text style={styles.label}>Visit Type</Text>
      <View style={styles.visitTypeContainer}>
        <TouchableOpacity
          style={[
            styles.visitTypeButton,
            visitType === 'Doctor' && styles.visitTypeButtonActive,
          ]}
          onPress={() => setVisitType('Doctor')}
        >
          <MaterialCommunityIcons
            name="doctor"
            size={24}
            color={visitType === 'Doctor' ? COLORS.textWhite : COLORS.textSecondary}
          />
          <Text
            style={[
              styles.visitTypeText,
              visitType === 'Doctor' && styles.visitTypeTextActive,
            ]}
          >
            Doctor
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.visitTypeButton,
            visitType === 'Chemist' && styles.visitTypeButtonActive,
          ]}
          onPress={() => setVisitType('Chemist')}
        >
          <MaterialCommunityIcons
            name="pharmacy"
            size={24}
            color={visitType === 'Chemist' ? COLORS.textWhite : COLORS.textSecondary}
          />
          <Text
            style={[
              styles.visitTypeText,
              visitType === 'Chemist' && styles.visitTypeTextActive,
            ]}
          >
            Chemist
          </Text>
        </TouchableOpacity>
      </View>

      {/* Planned Visit Toggle */}
      <TouchableOpacity
        style={styles.checkboxContainer}
        onPress={() => setIsPlanned(!isPlanned)}
      >
        <MaterialCommunityIcons
          name={isPlanned ? 'checkbox-marked' : 'checkbox-blank-outline'}
          size={24}
          color={isPlanned ? COLORS.primary : COLORS.textSecondary}
        />
        <Text style={styles.checkboxLabel}>This is a planned visit</Text>
      </TouchableOpacity>

      {/* Purpose */}
      <Input
        label="Purpose of Visit"
        placeholder="Enter purpose of visit (optional)"
        icon="text"
        multiline
        numberOfLines={3}
        value={purposeOfVisit}
        onChangeText={setPurposeOfVisit}
      />

      {/* Check-in Button */}
      <Button
        title="Check In"
        onPress={handleCheckIn}
        loading={loading}
        disabled={!location}
        style={styles.checkInButton}
      />

      <Loading visible={loading} message="Checking in..." />
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
  },
  locationCard: {
    marginBottom: SIZES.paddingMD,
  },
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.paddingSM,
  },
  locationTitle: {
    fontSize: SIZES.fontMD,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginLeft: SIZES.paddingSM,
  },
  locationLoading: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationText: {
    fontSize: SIZES.fontSM,
    color: COLORS.textSecondary,
    marginLeft: SIZES.paddingSM,
  },
  locationError: {
    fontSize: SIZES.fontSM,
    color: COLORS.error,
    marginBottom: SIZES.paddingSM,
  },
  retryButton: {
    marginTop: SIZES.paddingSM,
  },
  doctorCard: {
    marginBottom: SIZES.paddingMD,
  },
  doctorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  doctorInfo: {
    flex: 1,
    marginLeft: SIZES.paddingMD,
  },
  doctorName: {
    fontSize: SIZES.fontLG,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  doctorSpecialty: {
    fontSize: SIZES.fontSM,
    color: COLORS.primary,
    marginTop: 2,
  },
  doctorClinic: {
    fontSize: SIZES.fontSM,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  distanceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SIZES.paddingSM,
    paddingTop: SIZES.paddingSM,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  distanceText: {
    fontSize: SIZES.fontSM,
    color: COLORS.textSecondary,
    marginLeft: SIZES.paddingXS,
  },
  label: {
    fontSize: SIZES.fontMD,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SIZES.paddingSM,
  },
  visitTypeContainer: {
    flexDirection: 'row',
    gap: SIZES.paddingMD,
    marginBottom: SIZES.paddingLG,
  },
  visitTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SIZES.paddingMD,
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radiusMD,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  visitTypeButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  visitTypeText: {
    fontSize: SIZES.fontMD,
    color: COLORS.textSecondary,
    marginLeft: SIZES.paddingSM,
    fontWeight: '500',
  },
  visitTypeTextActive: {
    color: COLORS.textWhite,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.paddingLG,
  },
  checkboxLabel: {
    fontSize: SIZES.fontMD,
    color: COLORS.textPrimary,
    marginLeft: SIZES.paddingSM,
  },
  checkInButton: {
    marginTop: SIZES.paddingLG,
  },
});

export default VisitCheckInScreen;
