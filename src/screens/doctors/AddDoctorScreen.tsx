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
import { Button, Input, Loading } from '../../components/common';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { addDoctor } from '../../store/slices/doctorSlice';
import { doctorApi } from '../../services/api';
import { CreateDoctorRequest } from '../../types/doctor.types';
import { COLORS, SIZES } from '../../constants';
import { doctorSchema } from '../../utils/validation';
import { requestLocationPermission, showAlert } from '../../utils/helpers';

interface DoctorFormData {
  doctorName: string;
  specialty: string;
  qualification: string | undefined;
  category: string | undefined;
  registrationNumber: string | undefined;
  mobileNumber: string;
  email: string | undefined;
  clinicName: string | undefined;
  address: string | undefined;
  city: string | undefined;
  state: string | undefined;
  pincode: string | undefined;
  averagePatientPerDay: string | undefined;
  bestTimeToVisit: string | undefined;
  notes: string | undefined;
}

const AddDoctorScreen: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const { mrProfile } = useAppSelector(state => state.user);

  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<DoctorFormData>({
    resolver: yupResolver(doctorSchema) as any,
  });

  useEffect(() => {
    getCurrentLocation();
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
      const territoryId = mrProfile?.territories?.[0]?.territoryId;

      const doctorData: CreateDoctorRequest = {
        doctorName: data.doctorName,
        specialty: data.specialty,
        qualification: data.qualification,
        category: data.category,
        registrationNumber: data.registrationNumber,
        mobileNumber: data.mobileNumber,
        email: data.email,
        clinicName: data.clinicName,
        address: data.address,
        city: data.city,
        state: data.state,
        pincode: data.pincode,
        latitude: location?.latitude,
        longitude: location?.longitude,
        averagePatientPerDay: data.averagePatientPerDay
          ? parseInt(data.averagePatientPerDay, 10)
          : undefined,
        bestTimeToVisit: data.bestTimeToVisit,
        notes: data.notes,
        territoryId,
      };

      const newDoctor = await doctorApi.createDoctor(doctorData);
      dispatch(addDoctor(newDoctor));

      showAlert('Success', 'Doctor added successfully', () => {
        navigation.goBack();
      });
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
      if (!location) {
        showAlert('Location Required', 'Please wait for location to be detected or enable GPS');
        return;
      }

      setLoading(true);

      const isDuplicate = await checkDuplicate(data.mobileNumber);
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

        <Text style={styles.sectionTitle}>Basic Information</Text>
        <Controller
          control={control}
          name="doctorName"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Doctor Name *"
              placeholder="Enter doctor's name"
              icon="doctor"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.doctorName?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="specialty"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Specialty *"
              placeholder="e.g., Cardiologist, Pediatrician"
              icon="stethoscope"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.specialty?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="qualification"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Qualification"
              placeholder="e.g., MBBS, MD"
              icon="school"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
            />
          )}
        />
        <Controller
          control={control}
          name="category"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Category"
              placeholder="e.g., A, B, C"
              icon="star"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
            />
          )}
        />
        <Controller
          control={control}
          name="registrationNumber"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Registration Number"
              placeholder="Medical registration number"
              icon="card-account-details"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
            />
          )}
        />

        <Text style={styles.sectionTitle}>Contact Information</Text>
        <Controller
          control={control}
          name="mobileNumber"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Mobile Number *"
              placeholder="10-digit mobile number"
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
        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Email"
              placeholder="doctor@example.com"
              icon="email"
              keyboardType="email-address"
              autoCapitalize="none"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.email?.message}
            />
          )}
        />

        <Text style={styles.sectionTitle}>Clinic Information</Text>
        <Controller
          control={control}
          name="clinicName"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Clinic Name"
              placeholder="Enter clinic/hospital name"
              icon="hospital-building"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
            />
          )}
        />
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
          name="state"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="State"
              placeholder="State"
              icon="map"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
            />
          )}
        />
        <Controller
          control={control}
          name="pincode"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Pincode"
              placeholder="6-digit pincode"
              icon="numeric"
              keyboardType="numeric"
              maxLength={6}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
            />
          )}
        />

        <Text style={styles.sectionTitle}>Additional Information</Text>
        <Controller
          control={control}
          name="averagePatientPerDay"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Average Patients Per Day"
              placeholder="e.g., 50"
              icon="account-group"
              keyboardType="numeric"
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
    marginTop: SIZES.paddingMD,
    marginBottom: SIZES.paddingMD,
  },
  submitButton: {
    marginTop: SIZES.paddingXL,
    marginBottom: SIZES.paddingXL,
  },
});

export default AddDoctorScreen;

