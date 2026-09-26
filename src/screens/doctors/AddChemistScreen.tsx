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
import { Button, Input, Loading, HqRoutePicker } from '../../components/common';
import { HqRouteValue } from '../../components/common/HqRoutePicker';
import { chemistApi } from '../../services/api';
import { CreateChemistRequest } from '../../types/chemist.types';
import { COLORS, SIZES } from '../../constants';
import { chemistSchema } from '../../utils/validation';
import { requestLocationPermission, showAlert } from '../../utils/helpers';

interface ChemistFormData {
  pharmacyName: string;
  chemistName: string;
  licenseNumber: string | undefined;
  mobileNumber: string;
  alternateMobile: string | undefined;
  email: string | undefined;
  address: string | undefined;
  city: string | undefined;
  state: string | undefined;
  pincode: string | undefined;
  monthlyPotential: string | undefined;
  notes: string | undefined;
}

const AddChemistScreen: React.FC = () => {
  const navigation = useNavigation();

  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [hqRoute, setHqRoute] = useState<HqRouteValue>({});
  const [routeError, setRouteError] = useState<string | undefined>();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ChemistFormData>({
    resolver: yupResolver(chemistSchema) as any,
  });

  useEffect(() => {
    getCurrentLocation();
  }, []);

  const getCurrentLocation = async () => {
    try {
      const hasPermission = await requestLocationPermission();
      if (!hasPermission) {
        showAlert('Permission Denied', 'Location permission is required to add chemists');
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
      const chemists = await chemistApi.searchChemists(mobileNumber);
      return chemists.length > 0;
    } catch (error) {
      console.error('Duplicate check error:', error);
      return false;
    }
  };

  const createChemist = async (data: ChemistFormData) => {
    try {
      const chemistData: CreateChemistRequest = {
        pharmacyName: data.pharmacyName,
        chemistName: data.chemistName,
        licenseNumber: data.licenseNumber,
        mobileNumber: data.mobileNumber,
        alternateMobile: data.alternateMobile || undefined,
        email: data.email,
        address: data.address,
        city: data.city,
        state: data.state,
        pincode: data.pincode,
        latitude: location?.latitude,
        longitude: location?.longitude,
        monthlyPotential: data.monthlyPotential
          ? parseFloat(data.monthlyPotential)
          : undefined,
        notes: data.notes,
        routeId: hqRoute.routeId,
      };

      await chemistApi.createChemist(chemistData);

      showAlert(
        'Submitted for Approval',
        'Chemist sent to your manager. You can plan visits once it is approved — check My Submissions for status.',
        () => {
          navigation.goBack();
        },
      );
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message || 'Failed to add chemist. Please try again.';
      showAlert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit: SubmitHandler<ChemistFormData> = async data => {
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

      const isDuplicate = await checkDuplicate(data.mobileNumber);
      if (isDuplicate) {
        Alert.alert(
          'Duplicate Chemist',
          'A chemist with this mobile number already exists. Do you want to continue?',
          [
            { text: 'Cancel', style: 'cancel', onPress: () => setLoading(false) },
            { text: 'Continue', onPress: () => createChemist(data) },
          ]
        );
        return;
      }

      await createChemist(data);
    } catch (error) {
      console.error('Submit error:', error);
      showAlert('Error', 'Failed to add chemist');
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
          name="pharmacyName"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Pharmacy / Shop Name *"
              placeholder="Enter pharmacy name"
              icon="store"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.pharmacyName?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="chemistName"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Owner / Pharmacist Name *"
              placeholder="Enter owner's name"
              icon="account"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.chemistName?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="licenseNumber"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Drug License Number"
              placeholder="License number"
              icon="card-account-details"
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
            />
          )}
        />

        <Text style={styles.sectionTitle}>Route / Area</Text>
        <HqRoutePicker
          value={hqRoute}
          onChange={v => { setHqRoute(v); if (v.routeId) { setRouteError(undefined); } }}
          routeError={routeError}
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
          name="alternateMobile"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Alternate Mobile"
              placeholder="10-digit mobile number"
              icon="phone-plus"
              keyboardType="phone-pad"
              maxLength={10}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.alternateMobile?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Email"
              placeholder="chemist@example.com"
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

        <Text style={styles.sectionTitle}>Address</Text>
        <Controller
          control={control}
          name="address"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Address"
              placeholder="Shop address"
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
          name="monthlyPotential"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Monthly Potential (₹)"
              placeholder="e.g., 50000"
              icon="currency-inr"
              keyboardType="numeric"
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
          title="Add Chemist"
          onPress={handleSubmit(onSubmit)}
          loading={loading}
          disabled={!location}
          style={styles.submitButton}
        />
      </ScrollView>

      <Loading visible={loading} message="Adding chemist..." />
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

export default AddChemistScreen;
