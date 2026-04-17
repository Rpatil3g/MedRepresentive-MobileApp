import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAppDispatch } from '../../store/hooks';
import { addDCR, updateDCR as updateDCRAction } from '../../store/slices/dcrSlice';
import { dcrApi, visitApi, attendanceApi, expenseApi } from '../../services/api';
import { CreateDCRRequest, DailyCallReport } from '../../types/dcr.types';
import { Visit } from '../../types/visit.types';
import { AttendanceRecord } from '../../types/attendance.types';
import { DCRStackParamList } from '../../types/navigation.types';
import { COLORS, SIZES } from '../../constants';
import { formatDate, formatTime, getTodayDate } from '../../utils/dateUtils';
import { showAlert } from '../../utils/helpers';
import { Loading } from '../../components/common';

type CreateDCRRouteProp = RouteProp<DCRStackParamList, 'CreateDCR'>;

const CreateDCRScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<CreateDCRRouteProp>();
  const dispatch = useAppDispatch();

  const { date } = route.params || {};
  const reportDate = date || getTodayDate();

  const [submitting, setSubmitting] = useState(false);
  const [attendance, setAttendance] = useState<AttendanceRecord | null>(null);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [existingDraft, setExistingDraft] = useState<DailyCallReport | null>(null);

  // Form fields
  const [endLocation, setEndLocation] = useState('');
  const [remarks, setRemarks] = useState('');
  const [travelExpense, setTravelExpense] = useState('');
  const [daExpense, setDaExpense] = useState('');
  const [otherExpense, setOtherExpense] = useState('');

  const fetchData = async () => {
    try {
      const [todayVisits, todayAttendance, existingDraft] = await Promise.all([
        visitApi.getTodayVisits(),
        attendanceApi.getTodayAttendance(),
        dcrApi.getDCRByDate(reportDate),
      ]);
      setVisits(todayVisits);
      setAttendance(todayAttendance);
      setExistingDraft(existingDraft);

      // Restore draft field values so the form is never blank on reopen
      if (existingDraft && existingDraft.status === 'Draft') {
        if (existingDraft.endLocation) setEndLocation(existingDraft.endLocation);
        if (existingDraft.remarks)     setRemarks(existingDraft.remarks);
        if (existingDraft.travelExpense != null) setTravelExpense(String(existingDraft.travelExpense));
        if (existingDraft.daExpense    != null) setDaExpense(String(existingDraft.daExpense));
        if (existingDraft.otherExpense != null) setOtherExpense(String(existingDraft.otherExpense));
      }
    } catch (error) {
      console.error('Fetch data error:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [])
  );

  // ── Computed metrics from visits ─────────────────────────────────────────
  const completedVisits = visits.filter(
    v => v.status === 'Checked-Out' || v.status === 'Completed'
  );
  const doctorsMet = visits.filter(
    v => v.visitType === 'Doctor' && (v.status === 'Checked-Out' || v.status === 'Completed')
  );
  const chemistVisits = visits.filter(v => v.visitType === 'Chemist');
  const totalPOB = completedVisits.reduce((sum, v) => sum + (v.orderValue ?? 0), 0);
  const totalSamples = completedVisits.reduce((sum, v) => sum + (v.samples?.length ?? 0), 0);

  // ── Expense total ─────────────────────────────────────────────────────────
  const travel = parseFloat(travelExpense) || 0;
  const da = parseFloat(daExpense) || 0;
  const other = parseFloat(otherExpense) || 0;
  const totalExpense = travel + da + other;

  const handleLocate = () => {
    // TODO: integrate Geolocation for real GPS address
    setEndLocation('Current Location');
  };

  const handleSubmit = async (isDraft: boolean) => {
    if (!isDraft && !remarks.trim()) {
      showAlert('Required', 'Please add your daily remarks before submitting.');
      return;
    }

    try {
      setSubmitting(true);

      const dcrData: CreateDCRRequest = {
        reportDate,
        workType: 'Field Visit',
        totalVisits: visits.length,
        doctorVisits: doctorsMet.length,
        chemistVisits: chemistVisits.length,
        startLocation: attendance?.punchInAddress || undefined,
        endLocation: endLocation.trim() || undefined,
        remarks: remarks.trim() || undefined,
        travelExpense: travel > 0 ? travel : undefined,
        daExpense:     da     > 0 ? da     : undefined,
        otherExpense:  other  > 0 ? other  : undefined,
      };

      // Guard against non-editable states (uses value already fetched on screen load)
      if (existingDraft) {
        if (existingDraft.status === 'Submitted') {
          showAlert('Already Submitted', 'The DCR for today has already been submitted for approval.');
          return;
        }
        if (existingDraft.status === 'Approved') {
          showAlert('Already Approved', 'The DCR for today has already been approved.');
          return;
        }
      }

      // Create or update depending on whether a draft already exists
      const savedDCR = existingDraft
        ? await dcrApi.updateDCR(existingDraft.id, dcrData)
        : await dcrApi.createDCR(dcrData);

      dispatch(existingDraft ? updateDCRAction(savedDCR) : addDCR(savedDCR));

      if (!isDraft) {
        // Submit for approval
        await dcrApi.submitDCR(savedDCR.id);

        // Create expense entries (best-effort, non-blocking)
        const expenseDate = reportDate;
        const expensePromises = [];
        if (travel > 0) {
          expensePromises.push(
            expenseApi.createExpense({
              expenseDate,
              category: 'Travel',
              amount: travel,
              description: 'Daily travel expense',
            })
          );
        }
        if (da > 0) {
          expensePromises.push(
            expenseApi.createExpense({
              expenseDate,
              category: 'Food',
              amount: da,
              description: 'Daily allowance (DA)',
            })
          );
        }
        if (other > 0) {
          expensePromises.push(
            expenseApi.createExpense({
              expenseDate,
              category: 'Other',
              amount: other,
              description: 'Other daily expense',
            })
          );
        }
        await Promise.allSettled(expensePromises);
      }

      showAlert(
        'Success',
        isDraft ? 'DCR saved as draft.' : 'DCR submitted successfully!',
        () => navigation.goBack()
      );
    } catch (error: any) {
      const msg = error.response?.data?.message || (isDraft ? 'Failed to save DCR' : 'Failed to submit DCR');
      showAlert('Error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>

        {/* ── Date Header ─────────────────────────────────────────────────── */}
        <View style={styles.dateRow}>
          <MaterialCommunityIcons name="calendar-today" size={SIZES.iconSM} color={COLORS.primary} />
          <Text style={styles.dateText}>{formatDate(reportDate, 'EEEE, dd MMMM yyyy')}</Text>
        </View>

        {/* ── SECTION 1: Shift Details ─────────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Shift Details</Text>

          <View style={styles.timeRow}>
            <View style={styles.timeBox}>
              <Text style={styles.fieldLabel}>Start Time</Text>
              <View style={styles.readonlyBox}>
                <Text style={styles.readonlyText}>
                  {attendance?.punchInTime ? formatTime(attendance.punchInTime) : '—'}
                </Text>
              </View>
            </View>
            <View style={[styles.timeBox, { marginLeft: SIZES.paddingMD }]}>
              <Text style={styles.fieldLabel}>End Time</Text>
              <View style={styles.readonlyBox}>
                <Text style={styles.readonlyText}>
                  {attendance?.punchOutTime ? formatTime(attendance.punchOutTime) : 'Active'}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.fieldLabel}>Start Location</Text>
            <View style={styles.iconInputRow}>
              <MaterialCommunityIcons name="crosshairs-gps" size={SIZES.iconSM} color={COLORS.secondary} style={styles.inputIcon} />
              <TextInput
                style={[styles.fieldInput, styles.readonlyInput]}
                value={attendance?.punchInAddress || '—'}
                editable={false}
              />
            </View>
          </View>

          <View style={[styles.formGroup, { marginBottom: 0 }]}>
            <Text style={styles.fieldLabel}>End Location</Text>
            <View style={styles.iconInputRow}>
              <MaterialCommunityIcons name="map-marker-outline" size={SIZES.iconSM} color={COLORS.secondary} style={styles.inputIcon} />
              <TextInput
                style={styles.fieldInput}
                placeholder="Tap to fetch GPS location"
                placeholderTextColor={COLORS.textDisabled}
                value={endLocation}
                onChangeText={setEndLocation}
              />
              <TouchableOpacity style={styles.locateBtn} onPress={handleLocate}>
                <Text style={styles.locateBtnText}>Locate</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ── SECTION 2: Call Metrics ──────────────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle}>Call Metrics</Text>
            <View style={styles.autoBadge}>
              <Text style={styles.autoBadgeText}>AUTO-CALCULATED</Text>
            </View>
          </View>

          <View style={styles.metricsGrid}>
            <View style={styles.metricBox}>
              <Text style={styles.metricVal}>0</Text>
              <Text style={styles.metricLbl}>Planned Calls</Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={[styles.metricVal, { color: COLORS.success }]}>{visits.length}</Text>
              <Text style={styles.metricLbl}>Actual Calls</Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={styles.metricVal}>{doctorsMet.length}</Text>
              <Text style={styles.metricLbl}>Doctor (Met)</Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={[styles.metricVal, { color: COLORS.error }]}>0</Text>
              <Text style={styles.metricLbl}>Doctor (Missed)</Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={styles.metricVal}>{chemistVisits.length}</Text>
              <Text style={styles.metricLbl}>Chemists</Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={styles.metricVal}>0</Text>
              <Text style={styles.metricLbl}>Stockists</Text>
            </View>
          </View>
        </View>

        {/* ── SECTION 3: Business & Promo ──────────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle}>Business & Promo</Text>
            <View style={styles.autoBadge}>
              <Text style={styles.autoBadgeText}>AUTO-CALCULATED</Text>
            </View>
          </View>

          <View style={styles.promoRow}>
            <Text style={styles.promoLabel}>Total POB Value</Text>
            <Text style={styles.promoValue}>
              ₹ {totalPOB.toLocaleString('en-IN')}
            </Text>
          </View>
          <View style={styles.promoRow}>
            <Text style={styles.promoLabel}>Total Samples Given</Text>
            <Text style={styles.promoValue}>{totalSamples} Units</Text>
          </View>
        </View>

        {/* ── SECTION 4: Daily Expenses ────────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Daily Expenses</Text>

          <View style={styles.expenseRow}>
            <Text style={styles.expenseLabel}>Travel Expense</Text>
            <View style={styles.expenseInputBox}>
              <Text style={styles.currency}>₹</Text>
              <TextInput
                style={styles.expenseInput}
                value={travelExpense}
                onChangeText={setTravelExpense}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={COLORS.textDisabled}
              />
            </View>
          </View>

          <View style={styles.expenseRow}>
            <Text style={styles.expenseLabel}>DA / Food</Text>
            <View style={styles.expenseInputBox}>
              <Text style={styles.currency}>₹</Text>
              <TextInput
                style={styles.expenseInput}
                value={daExpense}
                onChangeText={setDaExpense}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={COLORS.textDisabled}
              />
            </View>
          </View>

          <View style={styles.expenseRow}>
            <Text style={styles.expenseLabel}>Other Expense</Text>
            <View style={styles.expenseInputBox}>
              <Text style={styles.currency}>₹</Text>
              <TextInput
                style={styles.expenseInput}
                value={otherExpense}
                onChangeText={setOtherExpense}
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={COLORS.textDisabled}
              />
            </View>
          </View>

          <View style={styles.expenseTotalRow}>
            <Text style={styles.expenseTotalLabel}>Total Expense</Text>
            <Text style={styles.expenseTotalValue}>
              ₹ {totalExpense.toLocaleString('en-IN')}
            </Text>
          </View>
        </View>

        {/* ── SECTION 5: Daily Remarks ─────────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            Daily Remarks{'  '}
            <Text style={{ color: COLORS.error, fontSize: SIZES.fontLG }}>*</Text>
          </Text>
          <Text style={styles.remarksHint}>
            Summarize what happened today, key discussions, or any issues.
          </Text>
          <TextInput
            style={styles.remarksInput}
            placeholder="E.g., Had a great discussion with Dr. Gupta regarding the new CardioMax study..."
            placeholderTextColor={COLORS.textDisabled}
            multiline
            numberOfLines={4}
            value={remarks}
            onChangeText={setRemarks}
            textAlignVertical="top"
          />
        </View>

        {/* ── SECTION 6: Review Logged Visits ─────────────────────────────── */}
        <View style={styles.visitsHeader}>
          <Text style={styles.visitsSectionTitle}>Review Visits ({visits.length})</Text>
          <TouchableOpacity
            style={styles.logMoreBtn}
            onPress={() => (navigation as any).navigate('Visits')}
          >
            <MaterialCommunityIcons name="plus" size={14} color={COLORS.primary} />
            <Text style={styles.logMoreText}>Log More</Text>
          </TouchableOpacity>
        </View>

        {visits.map(visit => (
          <View key={visit.id} style={styles.visitCard}>
            <View style={styles.visitInfo}>
              <Text style={styles.visitName}>
                {visit.doctorName || visit.chemistShopName || 'Unknown'}
              </Text>
              <Text style={styles.visitMeta}>
                {[
                  visit.visitType,
                  visit.doctorSpecialty,
                  visit.status === 'Checked-Out' || visit.status === 'Completed' ? 'Met' : 'In Progress',
                  visit.samples?.length ? `${visit.samples.length} Sample${visit.samples.length > 1 ? 's' : ''}` : null,
                  visit.orderValue ? `₹${visit.orderValue.toLocaleString('en-IN')} POB` : null,
                ]
                  .filter(Boolean)
                  .join(' • ')}
              </Text>
            </View>
            <MaterialCommunityIcons name="pencil-outline" size={SIZES.iconSM} color={COLORS.secondary} />
          </View>
        ))}

        {visits.length === 0 && (
          <View style={styles.emptyVisits}>
            <Text style={styles.emptyVisitsText}>No visits logged today</Text>
          </View>
        )}

        {/* ── Action Buttons ────────────────────────────────────────────────── */}
        <TouchableOpacity
          style={[styles.submitBtn, submitting && styles.btnDisabled]}
          onPress={() => handleSubmit(false)}
          disabled={submitting}
        >
          <Text style={styles.submitBtnText}>Submit Final DCR</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.draftBtn, submitting && styles.btnDisabled]}
          onPress={() => handleSubmit(true)}
          disabled={submitting}
        >
          <Text style={styles.draftBtnText}>Save as Draft</Text>
        </TouchableOpacity>

      </ScrollView>

      <Loading visible={submitting} message="Please wait..." />
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
    padding: SIZES.paddingMD,
    paddingBottom: SIZES.paddingXL,
  },

  // ── Date header ─────────────────────────────────────────────────────────
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.paddingMD,
    paddingHorizontal: SIZES.paddingXS,
  },
  dateText: {
    fontSize: SIZES.fontMD,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginLeft: SIZES.paddingSM,
  },

  // ── Card ────────────────────────────────────────────────────────────────
  card: {
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radiusLG,
    padding: SIZES.paddingMD,
    marginBottom: SIZES.paddingMD,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  cardTitle: {
    fontSize: SIZES.fontMD,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SIZES.paddingMD,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SIZES.paddingMD,
  },
  autoBadge: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: SIZES.radiusXS,
  },
  autoBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: 0.5,
  },

  // ── Shift Details ────────────────────────────────────────────────────────
  timeRow: {
    flexDirection: 'row',
    marginBottom: SIZES.paddingMD,
  },
  timeBox: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: SIZES.fontSM,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SIZES.paddingXS + 2,
  },
  readonlyBox: {
    backgroundColor: COLORS.backgroundGray,
    borderRadius: SIZES.radiusMD,
    paddingHorizontal: SIZES.paddingMD,
    paddingVertical: SIZES.paddingSM + 2,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  readonlyText: {
    fontSize: SIZES.fontMD,
    color: COLORS.textSecondary,
  },
  formGroup: {
    marginBottom: SIZES.paddingMD,
  },
  iconInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radiusMD,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SIZES.paddingSM + 2,
  },
  inputIcon: {
    marginRight: SIZES.paddingSM,
  },
  fieldInput: {
    flex: 1,
    paddingVertical: SIZES.paddingSM + 2,
    fontSize: SIZES.fontMD,
    color: COLORS.textPrimary,
  },
  readonlyInput: {
    color: COLORS.textSecondary,
  },
  locateBtn: {
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: SIZES.paddingSM,
    paddingVertical: 4,
    borderRadius: SIZES.radiusSM,
  },
  locateBtnText: {
    fontSize: SIZES.fontXS,
    fontWeight: '700',
    color: COLORS.primary,
  },

  // ── Metrics Grid ─────────────────────────────────────────────────────────
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  metricBox: {
    width: '33.33%',
    alignItems: 'center',
    paddingVertical: SIZES.paddingSM + 2,
    paddingHorizontal: SIZES.paddingXS,
  },
  metricVal: {
    fontSize: SIZES.fontXL,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  metricLbl: {
    fontSize: SIZES.fontXS,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 14,
  },

  // ── Business & Promo ─────────────────────────────────────────────────────
  promoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SIZES.paddingSM,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  promoLabel: {
    fontSize: SIZES.fontSM,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  promoValue: {
    fontSize: SIZES.fontMD,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },

  // ── Expenses ─────────────────────────────────────────────────────────────
  expenseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SIZES.paddingSM + 2,
  },
  expenseLabel: {
    fontSize: SIZES.fontSM,
    fontWeight: '500',
    color: COLORS.textPrimary,
    flex: 1,
  },
  expenseInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radiusSM,
    paddingHorizontal: SIZES.paddingSM,
    paddingVertical: 5,
    width: 120,
  },
  currency: {
    fontSize: SIZES.fontSM,
    color: COLORS.textSecondary,
    marginRight: 4,
  },
  expenseInput: {
    flex: 1,
    fontSize: SIZES.fontMD,
    fontWeight: '600',
    color: COLORS.textPrimary,
    padding: 0,
  },
  expenseTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SIZES.paddingXS,
    paddingTop: SIZES.paddingSM,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    borderStyle: 'dashed',
  },
  expenseTotalLabel: {
    fontSize: SIZES.fontMD,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  expenseTotalValue: {
    fontSize: SIZES.fontMD,
    fontWeight: '700',
    color: COLORS.primary,
  },

  // ── Remarks ──────────────────────────────────────────────────────────────
  remarksHint: {
    fontSize: SIZES.fontXS + 1,
    color: COLORS.textSecondary,
    marginBottom: SIZES.paddingSM,
    marginTop: -SIZES.paddingXS,
  },
  remarksInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radiusMD,
    padding: SIZES.paddingMD,
    fontSize: SIZES.fontMD,
    color: COLORS.textPrimary,
    minHeight: 90,
    backgroundColor: COLORS.background,
  },

  // ── Visits Section ───────────────────────────────────────────────────────
  visitsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.paddingSM,
    paddingHorizontal: SIZES.paddingXS,
    marginTop: SIZES.paddingXS,
  },
  visitsSectionTitle: {
    fontSize: SIZES.fontMD,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  logMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: SIZES.radiusSM,
    paddingHorizontal: SIZES.paddingSM,
    paddingVertical: 3,
    gap: 2,
  },
  logMoreText: {
    fontSize: SIZES.fontXS,
    fontWeight: '600',
    color: COLORS.primary,
    marginLeft: 2,
  },
  visitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radiusMD,
    paddingHorizontal: SIZES.paddingMD,
    paddingVertical: SIZES.paddingSM + 2,
    marginBottom: SIZES.paddingXS + 2,
  },
  visitInfo: {
    flex: 1,
    marginRight: SIZES.paddingSM,
  },
  visitName: {
    fontSize: SIZES.fontSM + 1,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  visitMeta: {
    fontSize: SIZES.fontXS,
    color: COLORS.textSecondary,
  },
  emptyVisits: {
    alignItems: 'center',
    paddingVertical: SIZES.paddingMD,
    marginBottom: SIZES.paddingMD,
  },
  emptyVisitsText: {
    fontSize: SIZES.fontSM,
    color: COLORS.textDisabled,
  },

  // ── Buttons ──────────────────────────────────────────────────────────────
  submitBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.radiusMD,
    paddingVertical: SIZES.paddingMD,
    alignItems: 'center',
    marginTop: SIZES.paddingMD,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  submitBtnText: {
    fontSize: SIZES.fontMD,
    fontWeight: '700',
    color: COLORS.textWhite,
  },
  draftBtn: {
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: SIZES.radiusMD,
    paddingVertical: SIZES.paddingMD - 2,
    alignItems: 'center',
    marginTop: SIZES.paddingSM,
  },
  draftBtnText: {
    fontSize: SIZES.fontMD,
    fontWeight: '600',
    color: COLORS.primary,
  },
  btnDisabled: {
    opacity: 0.5,
  },
});

export default CreateDCRScreen;
