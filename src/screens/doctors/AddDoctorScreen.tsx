import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import Geolocation from 'react-native-geolocation-service';
import { Button, Input, Loading, HqRoutePicker, SelectField, CollapsibleSection } from '../../components/common';
import { HqRouteValue } from '../../components/common/HqRoutePicker';
import { doctorApi, lookupApi } from '../../services/api';
import { CreateDoctorRequest } from '../../types/doctor.types';
import { COLORS, SIZES } from '../../constants';
import { doctorSchema } from '../../utils/validation';
import { DOCTOR_TITLE_REGEX, requestLocationPermission, showAlert } from '../../utils/helpers';

// Shown until the admin-managed "Specialty" lookup loads (Master.LookupValues is the source of truth)
const FALLBACK_SPECIALTIES = [
  'General Medicine', 'Cardiology', 'Diabetology', 'Endocrinology', 'Gynecology', 'Pediatrics',
  'Orthopedics', 'Dermatology', 'ENT', 'Ophthalmology', 'Neurology', 'Psychiatry',
  'Gastroenterology', 'Pulmonology', 'Nephrology', 'Urology', 'Oncology', 'General Surgery',
  'Dentistry', 'Other',
];

interface DoctorFormData {
  doctorName: string;
  specialty: string;
  mobileNumber: string | undefined;
  clinicName: string | undefined;
  address: string | undefined;
  city: string | undefined;
  bestTimeToVisit: string | undefined;
  notes: string | undefined;
}

const AddDoctorScreen: React.FC = () => {
  const navigation = useNavigation();

  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [hqRoute, setHqRoute] = useState<HqRouteValue>({});
  const [routeError, setRouteError] = useState<string | undefined>();
  const [specialties, setSpecialties] = useState<string[]>(FALLBACK_SPECIALTIES);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<DoctorFormData>({
    resolver: yupResolver(doctorSchema) as any,
  });

  useEffect(() => {
    getCurrentLocation();
    lookupApi
      .getByCategory('Specialty')
      .then(values => { if (values.length) setSpecialties(values); })
      .catch(() => undefined);
  }, []);

  const getCurrentLocation = async () => {
    try {
      const hasPermission = await requestLocationPermission();
      if (!hasPermission) {
        showAlert('Permission Denied', 'Location permission is required to add doctors');
        return;
      }

      setGettingLocation(true);
      Geolocation.getCurrentPosition(
        position => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          setGettingLocation(false);
        },
        error => {
          console.error('Location error:', error);
          setGettingLocation(false);
          showAlert('Location Error', 'Failed to get current location');
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
      );
    } catch (error) {
      console.error('Permission error:', error);
      setGettingLocation(false);
    }
  };

  const checkDuplicate = async (mobileNumber: string): Promise<boolean> => {
    try {
      const doctors = await doctorApi.searchDoctors(mobileNumber);
      return doctors.length > 0;
    } catch (error) {
      console.error('Duplicate check error:', error);
      return false;
    }
  };

  const createDoctor = async (data: DoctorFormData) => {
    try {
      const doctorData: CreateDoctorRequest = {
        doctorName: data.doctorName.replace(DOCTOR_TITLE_REGEX, '').trim(),
        specialty: data.specialty,
        mobileNumber: data.mobileNumber || undefined,
        clinicName: data.clinicName,
        address: data.address,
        city: data.city,
        latitude: location?.latitude,
        longitude: location?.longitude,
        bestTimeToVisit: data.bestTimeToVisit,
        notes: data.notes,
        routeId: hqRoute.routeId,
      };

      await doctorApi.createDoctor(doctorData);

      showAlert(
        'Submitted for Approval',
        'Doctor sent to your manager. You can plan visits once it is approved — check My Submissions for status.',
        () => {
          navigation.goBack();
        },
      );
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message || 'Failed to add doctor. Please try again.';
      showAlert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit: SubmitHandler<DoctorFormData> = async data => {
    try {
      if (!hqRoute.routeId) {
        setRouteError('Route / Area is required');
        return;
      }

      if (!location) {
        showAlert('Location Required', 'Please wait for location to be detected or enable GPS');
        return;
      }

      setLoading(true);

      // Mobile is optional for doctors — only check duplicates when one was given
      const isDuplicate = data.mobileNumber ? await checkDuplicate(data.mobileNumber) : false;
      if (isDuplicate) {
        Alert.alert(
          'Duplicate Doctor',
          'A doctor with this mobile number already exists. Do you want to continue?',
          [
            { text: 'Cancel', style: 'cancel', onPress: () => setLoading(false) },
            { text: 'Continue', onPress: () => createDoctor(data) },
          ]
        );
        return;
      }

      await createDoctor(data);
    } catch (error) {
      console.error('Submit error:', error);
      showAlert('Error', 'Failed to add doctor');
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.locationCard}>
          <Text style={styles.locationText}>
            {gettingLocation
              ? 'Getting location...'
              : location
              ? `Location captured: ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`
              : 'Location not available'}
          </Text>
          {!location && !gettingLocation ? (
            <Button
              title="Retry Location"
              onPress={getCurrentLocation}
              size="small"
              style={styles.retryButton}
            />
          ) : null}
        </View>

        <Controller
          control={control}
          name="doctorName"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Doctor Name *"
              placeholder="Full name, e.g. Anil Mehta"
              icon="doctor"
              prefix="Dr."
              autoCapitalize="words"
              value={value}
              onChangeText={text => onChange(text.replace(DOCTOR_TITLE_REGEX, ''))}
              onBlur={onBlur}
              error={errors.doctorName?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="specialty"
          render={({ field: { onChange, value } }) => (
            <SelectField
              label="Specialty *"
              placeholder="Select specialty"
              icon="stethoscope"
              options={specialties}
              value={value}
              onSelect={onChange}
              error={errors.specialty?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="clinicName"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Clinic / Hospital Name"
              placeholder="Helps you find the doctor later"
              icon="hospital-building"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
            />
          )}
        />
        <Controller
          control={control}
          name="mobileNumber"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Mobile Number"
              placeholder="10-digit number (optional)"
              icon="phone"
              keyboardType="phone-pad"
              maxLength={10}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.mobileNumber?.message}
            />
          )}
        />

        <Text style={styles.sectionTitle}>Route / Area</Text>
        <HqRoutePicker
          value={hqRoute}
          onChange={v => { setHqRoute(v); if (v.routeId) { setRouteError(undefined); } }}
          routeError={routeError}
        />

        <CollapsibleSection title="More details (optional)" hint="Address, city, best time to visit, notes">
          <Controller
            control={control}
            name="address"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Address"
                placeholder="Clinic address"
                icon="map-marker"
                multiline
                numberOfLines={3}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
              />
            )}
          />
          <Controller
            control={control}
            name="city"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="City"
                placeholder="City"
                icon="city"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
              />
            )}
          />
          <Controller
            control={control}
            name="bestTimeToVisit"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Best Time to Visit"
                placeholder="e.g., 10:00 AM - 12:00 PM"
                icon="clock"
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
              />
            )}
          />
          <Controller
            control={control}
            name="notes"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Notes"
                placeholder="Any additional notes"
                icon="note-text"
                multiline
                numberOfLines={4}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
              />
            )}
          />
        </CollapsibleSection>

        <Button
          title="Add Doctor"
          onPress={handleSubmit(onSubmit)}
          loading={loading}
          disabled={!location}
          style={styles.submitButton}
        />
      </ScrollView>

      <Loading visible={loading} message="Adding doctor..." />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SIZES.paddingLG,
  },
  locationCard: {
    backgroundColor: COLORS.backgroundGray,
    padding: SIZES.paddingMD,
    borderRadius: SIZES.radiusMD,
    marginBottom: SIZES.paddingLG,
  },
  locationText: {
    fontSize: SIZES.fontSM,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: SIZES.paddingSM,
  },
  sectionTitle: {
    fontSize: SIZES.fontLG,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: SIZES.paddingSM,
    marginBottom: SIZES.paddingMD,
  },
  submitButton: {
    marginTop: SIZES.paddingLG,
    marginBottom: SIZES.paddingXL,
  },
});

export default AddDoctorScreen;
