import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useForm, Controller } from 'react-hook-form';
import { Button, Input, Loading, Card } from '../../components/common';
import { useAppDispatch } from '../../store/hooks';
import { addDCR } from '../../store/slices/dcrSlice';
import { dcrApi, visitApi } from '../../services/api';
import { CreateDCRRequest } from '../../types/dcr.types';
import { DCRStackParamList } from '../../types/navigation.types';
import { COLORS, SIZES } from '../../constants';
import { formatDate, getTodayDate } from '../../utils/dateUtils';
import { showAlert } from '../../utils/helpers';

type CreateDCRRouteProp = RouteProp<DCRStackParamList, 'CreateDCR'>;

interface DCRFormData {
  workType: string;
  distanceTraveledKm: string;
  startLocation: string;
  endLocation: string;
  remarks: string;
}

const CreateDCRScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<CreateDCRRouteProp>();
  const dispatch = useAppDispatch();

  const { date } = route.params || {};
  const reportDate = date || getTodayDate();

  const [loading, setLoading] = useState(false);
  const [visitStats, setVisitStats] = useState({
    totalVisits: 0,
    doctorVisits: 0,
    chemistVisits: 0,
    visualsShown: [] as string[],
    totalSamples: 0,
    giftsGiven: false,
  });

  const { control, handleSubmit } = useForm<DCRFormData>({
    defaultValues: {
      workType: 'Field Visit',
      distanceTraveledKm: '',
      startLocation: '',
      endLocation: '',
      remarks: '',
    },
  });

  useEffect(() => {
    fetchTodayVisits();
  }, []);

  const fetchTodayVisits = async () => {
    try {
      const visits = await visitApi.getTodayVisits();
      const completedVisits = visits.filter(v => v.status === 'Checked-Out');
      const doctorVisits = visits.filter(v => v.visitType === 'Doctor');
      const chemistVisits = visits.filter(v => v.visitType === 'Chemist');

      // Aggregate visual aids from all completed visits (deduplicate)
      const allVisuals = completedVisits.flatMap(v => v.visualsShown ?? []);
      const uniqueVisuals = [...new Set(allVisuals)];

      // Total samples distributed
      const totalSamples = completedVisits.reduce((sum, v) => sum + (v.samples?.length ?? 0), 0);

      // Any gifts given
      const giftsGiven = completedVisits.some(v => v.giftsGiven && v.giftsGiven.trim() !== '');

      setVisitStats({
        totalVisits: visits.length,
        doctorVisits: doctorVisits.length,
        chemistVisits: chemistVisits.length,
        visualsShown: uniqueVisuals,
        totalSamples,
        giftsGiven,
      });
    } catch (error) {
      console.error('Fetch visits error:', error);
    }
  };

  const onSubmit = async (data: DCRFormData) => {
    try {
      setLoading(true);

      const dcrData: CreateDCRRequest = {
        reportDate,
        workType: data.workType || undefined,
        totalVisits: visitStats.totalVisits,
        doctorVisits: visitStats.doctorVisits,
        chemistVisits: visitStats.chemistVisits,
        distanceTraveledKm: data.distanceTraveledKm ? parseFloat(data.distanceTraveledKm) : undefined,
        startLocation: data.startLocation || undefined,
        endLocation: data.endLocation || undefined,
        remarks: data.remarks || undefined,
      };

      const newDCR = await dcrApi.createDCR(dcrData);
      dispatch(addDCR(newDCR));

      showAlert('Success', 'DCR created successfully!', () => {
        navigation.goBack();
      });
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to create DCR';
      showAlert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Date Card */}
        <Card style={styles.dateCard}>
          <Text style={styles.dateLabel}>Report Date</Text>
          <Text style={styles.dateValue}>{formatDate(reportDate, 'EEEE, dd MMMM yyyy')}</Text>
        </Card>

        {/* Visit Statistics (Auto-populated) */}
        <Card style={styles.statsCard}>
          <Text style={styles.sectionTitle}>Visit Summary (Auto-calculated)</Text>
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{visitStats.totalVisits}</Text>
              <Text style={styles.statLabel}>Total Visits</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{visitStats.doctorVisits}</Text>
              <Text style={styles.statLabel}>Doctors</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{visitStats.chemistVisits}</Text>
              <Text style={styles.statLabel}>Chemists</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>{visitStats.totalSamples}</Text>
              <Text style={styles.statLabel}>Samples</Text>
            </View>
          </View>

          {visitStats.visualsShown.length > 0 && (
            <View style={styles.aggregateRow}>
              <Text style={styles.aggregateLabel}>Visuals Shown:</Text>
              <Text style={styles.aggregateValue}>{visitStats.visualsShown.join(', ')}</Text>
            </View>
          )}

          {visitStats.giftsGiven && (
            <View style={styles.aggregateRow}>
              <Text style={styles.aggregateLabel}>Gifts Distributed:</Text>
              <Text style={styles.aggregateValue}>Yes</Text>
            </View>
          )}
        </Card>

        {/* Form Fields */}
        <Text style={styles.sectionTitle}>DCR Details</Text>

        <Controller
          control={control}
          name="workType"
          render={({ field: { onChange, value } }) => (
            <Input
              label="Work Type"
              placeholder="e.g., Field Visit, Training, Meeting"
              icon="briefcase"
              value={value}
              onChangeText={onChange}
            />
          )}
        />

        <Controller
          control={control}
          name="distanceTraveledKm"
          render={({ field: { onChange, value } }) => (
            <Input
              label="Distance Traveled (km)"
              placeholder="Enter distance in km"
              icon="map-marker-distance"
              keyboardType="decimal-pad"
              value={value}
              onChangeText={onChange}
            />
          )}
        />

        <Controller
          control={control}
          name="startLocation"
          render={({ field: { onChange, value } }) => (
            <Input
              label="Start Location"
              placeholder="Starting point of the day"
              icon="map-marker"
              value={value}
              onChangeText={onChange}
            />
          )}
        />

        <Controller
          control={control}
          name="endLocation"
          render={({ field: { onChange, value } }) => (
            <Input
              label="End Location"
              placeholder="Ending point of the day"
              icon="map-marker"
              value={value}
              onChangeText={onChange}
            />
          )}
        />

        <Controller
          control={control}
          name="remarks"
          render={({ field: { onChange, value } }) => (
            <Input
              label="Remarks"
              placeholder="Any additional notes"
              icon="note-text"
              multiline
              numberOfLines={4}
              value={value}
              onChangeText={onChange}
            />
          )}
        />

        {/* Submit Buttons */}
        <View style={styles.buttonContainer}>
          <Button
            title="Save as Draft"
            variant="outline"
            onPress={handleSubmit(onSubmit)}
            loading={loading}
            style={styles.draftButton}
          />
          <Button
            title="Submit DCR"
            onPress={handleSubmit(onSubmit)}
            loading={loading}
            style={styles.submitButton}
          />
        </View>
      </ScrollView>

      <Loading visible={loading} message="Creating DCR..." />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundGray,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: SIZES.paddingLG,
  },
  dateCard: {
    marginBottom: SIZES.paddingMD,
  },
  dateLabel: {
    fontSize: SIZES.fontSM,
    color: COLORS.textSecondary,
    marginBottom: SIZES.paddingXS,
  },
  dateValue: {
    fontSize: SIZES.fontLG,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  statsCard: {
    marginBottom: SIZES.paddingLG,
  },
  sectionTitle: {
    fontSize: SIZES.fontMD,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SIZES.paddingMD,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: SIZES.paddingSM,
  },
  aggregateRow: {
    flexDirection: 'row',
    marginTop: SIZES.paddingXS,
    paddingTop: SIZES.paddingXS,
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },
  aggregateLabel: {
    fontSize: SIZES.fontSM,
    color: COLORS.textSecondary,
    fontWeight: '600',
    marginRight: SIZES.paddingXS,
  },
  aggregateValue: {
    flex: 1,
    fontSize: SIZES.fontSM,
    color: COLORS.textPrimary,
  },
  statBox: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: SIZES.font3XL,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  statLabel: {
    fontSize: SIZES.fontXS,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: SIZES.paddingMD,
    marginTop: SIZES.paddingXL,
    marginBottom: SIZES.paddingXL,
  },
  draftButton: {
    flex: 1,
  },
  submitButton: {
    flex: 1,
  },
});

export default CreateDCRScreen;
