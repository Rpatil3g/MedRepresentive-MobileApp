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
  ActivityIndicator,
} from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import { useNavigation, useRoute, RouteProp, useFocusEffect } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAppDispatch } from '../../store/hooks';
import { addDCR, updateDCR as updateDCRAction } from '../../store/slices/dcrSlice';
import { dcrApi, visitApi, attendanceApi, expenseApi } from '../../services/api';
import { Expense } from '../../types/expense.types';
import { CreateDCRRequest, DailyCallReport } from '../../types/dcr.types';
import { Visit } from '../../types/visit.types';
import { AttendanceRecord } from '../../types/attendance.types';
import { DCRStackParamList } from '../../types/navigation.types';
import { COLORS, SIZES } from '../../constants';
import { formatDate, formatTime, getTodayDate } from '../../utils/dateUtils';
import { showAlert, requestLocationPermission } from '../../utils/helpers';
import { Loading } from '../../components/common';

type CreateDCRRouteProp = RouteProp<DCRStackParamList, 'CreateDCR'>;

const CATEGORY_META: Record<string, { icon: string; color: string }> = {
  Travel: { icon: 'car-outline',      color: '#ea580c' },
  Food:   { icon: 'food-outline',     color: '#16a34a' },
  Other:  { icon: 'dots-horizontal',  color: '#7c3aed' },
};

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
  const [dayExpenses, setDayExpenses] = useState<Expense[]>([]);

  // Form fields
  const [endLocation, setEndLocation] = useState('');
  const [locating, setLocating] = useState(false);
  const [remarks, setRemarks] = useState('');

  const fetchData = async () => {
    try {
      const isToday = reportDate === getTodayDate();
      const dateStr = reportDate.split('T')[0];

      const [visitsResponse, fetchedAttendance, existingDCR, allExpenses] = await Promise.all([
        isToday
          ? visitApi.getTodayVisits()
          : visitApi.getVisits({ fromDate: reportDate, toDate: `${dateStr}T23:59:59` })
              .then(r => (Array.isArray(r) ? r : r.items ?? [])),
        isToday
          ? attendanceApi.getTodayAttendance()
          : attendanceApi.getAttendanceByDate(reportDate).catch(() => null),
        dcrApi.getDCRByDate(reportDate),
        expenseApi.getMyExpenses({ date: dateStr }).catch(() => [] as Expense[]),
      ]);

      setVisits(visitsResponse as Visit[]);
      setAttendance(fetchedAttendance);
      setExistingDraft(existingDCR);
      setDayExpenses(allExpenses.filter(e => e.expenseDate.startsWith(dateStr)));

      if (existingDCR) {
        if (existingDCR.endLocation) setEndLocation(existingDCR.endLocation);
        if (existingDCR.remarks)     setRemarks(existingDCR.remarks);
      }
    } catch (error) {
      console.error('Fetch data error:', error);
      showAlert('Error', 'Failed to load DCR data. Please go back and try again.');
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
  const chemistVisitsList = visits.filter(v => v.visitType === 'Chemist');
  const totalPOB = completedVisits.reduce((sum, v) => sum + (v.orderValue ?? 0), 0);
  const totalSamples = completedVisits.reduce((sum, v) => sum + (v.samples?.length ?? 0), 0);

  // For existing DCRs (rejected / re-opened), use stored counts — live visits
  // only reflect today and won't match a past report date.
  const effectiveTotalVisits   = existingDraft ? existingDraft.totalVisits   : visits.length;
  const effectiveDoctorVisits  = existingDraft ? existingDraft.doctorVisits  : doctorsMet.length;
  const effectiveChemistVisits = existingDraft ? existingDraft.chemistVisits : chemistVisitsList.length;

  // ── Read-only guard ───────────────────────────────────────────────────────
  const isReadOnly =
    existingDraft?.status === 'Submitted' || existingDraft?.status === 'Approved';

  // ── Duplicate doctor visit guard ──────────────────────────────────────────
  const duplicateDoctorNames: string[] = React.useMemo(() => {
    const doctorVisits = visits.filter(v => v.visitType === 'Doctor' && v.doctorId);
    const seen = new Map<string, string>();
    const dupes = new Set<string>();
    for (const v of doctorVisits) {
      if (seen.has(v.doctorId!)) dupes.add(seen.get(v.doctorId!)!);
      else seen.set(v.doctorId!, v.doctorName || v.doctorId!);
    }
    return Array.from(dupes);
  }, [visits]);
  const hasDuplicateDoctors = duplicateDoctorNames.length > 0;

  // ── Expense summary ───────────────────────────────────────────────────────
  const expenseTotal = dayExpenses.reduce((sum, e) => sum + e.amount, 0);

  const handleLocate = async () => {
    const ok = await requestLocationPermission();
    if (!ok) {
      showAlert('Permission Denied', 'Location permission is required to fetch your position.');
      return;
    }
    setLocating(true);
    Geolocation.getCurrentPosition(
      async pos => {
        const { latitude, longitude } = pos.coords;
        let address = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
            { headers: { 'Accept-Language': 'en', 'User-Agent': 'GoodPharmaApp/1.0' } },
          );
          const data = await res.json();
          if (data.display_name) address = data.display_name as string;
        } catch {
          // fallback to raw coordinates
        }
        setEndLocation(address);
        setLocating(false);
      },
      () => {
        showAlert('Location Error', 'Could not fetch location. Please try again.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 },
    );
  };

  const handleSubmit = async (isDraft: boolean) => {
    if (!isDraft && !remarks.trim()) {
      showAlert('Required', 'Please add your daily remarks before submitting.');
      return;
    }

    if (existingDraft?.status === 'Submitted') {
      showAlert('Already Submitted', 'The DCR for today has already been submitted for approval.');
      return;
    }
    if (existingDraft?.status === 'Approved') {
      showAlert('Already Approved', 'The DCR for today has already been approved.');
      return;
    }

    try {
      setSubmitting(true);

      const dcrData: CreateDCRRequest = {
        reportDate,
        workType: 'Field Visit',
        totalVisits: effectiveTotalVisits,
        doctorVisits: effectiveDoctorVisits,
        chemistVisits: effectiveChemistVisits,
        startLocation: attendance?.punchInAddress || undefined,
        endLocation: endLocation.trim() || undefined,
        remarks: remarks.trim() || undefined,
      };

      const savedDCR = existingDraft
        ? await dcrApi.updateDCR(existingDraft.id, dcrData)
        : await dcrApi.createDCR(dcrData);

      dispatch(existingDraft ? updateDCRAction(savedDCR) : addDCR(savedDCR));

      if (!isDraft) {
        await dcrApi.submitDCR(savedDCR.id);
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

        {/* ── Status Badge (read-only states) ─────────────────────────────── */}
        {isReadOnly && (
          <View style={[
            styles.statusBanner,
            existingDraft?.status === 'Approved' ? styles.statusBannerApproved : styles.statusBannerSubmitted,
          ]}>
            <MaterialCommunityIcons
              name={existingDraft?.status === 'Approved' ? 'check-decagram' : 'clock-check-outline'}
              size={20}
              color={existingDraft?.status === 'Approved' ? COLORS.success : '#f59e0b'}
            />
            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text style={[
                styles.statusBannerTitle,
                existingDraft?.status === 'Approved' && { color: COLORS.success },
              ]}>
                {existingDraft?.status === 'Approved' ? 'DCR Approved' : 'DCR Submitted for Approval'}
              </Text>
              <Text style={styles.statusBannerSub}>This report is locked and cannot be edited.</Text>
            </View>
          </View>
        )}

        {/* ── Duplicate doctor warning ─────────────────────────────────────── */}
        {hasDuplicateDoctors && !isReadOnly && (
          <View style={styles.duplicateWarning}>
            <MaterialCommunityIcons name="alert-circle-outline" size={20} color={COLORS.error} />
            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text style={styles.duplicateWarningTitle}>Duplicate Doctor Visit Detected</Text>
              <Text style={styles.duplicateWarningSub}>
                {duplicateDoctorNames.join(', ')} {duplicateDoctorNames.length === 1 ? 'has' : 'have'} been visited more than once today. Remove the duplicate visit before submitting.
              </Text>
            </View>
          </View>
        )}

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
              <Text style={[styles.fieldInput, styles.readonlyInput]} numberOfLines={1} ellipsizeMode="tail">
                {attendance?.punchInAddress || existingDraft?.startLocation || '—'}
              </Text>
            </View>
          </View>

          <View style={[styles.formGroup, { marginBottom: 0 }]}>
            <Text style={styles.fieldLabel}>End Location</Text>
            <View style={styles.iconInputRow}>
              <MaterialCommunityIcons name="map-marker-outline" size={SIZES.iconSM} color={COLORS.secondary} style={styles.inputIcon} />
              {locating ? (
                <>
                  <ActivityIndicator size="small" color={COLORS.primary} style={{ marginRight: 8 }} />
                  <Text style={[styles.fieldInput, { color: COLORS.textSecondary, flex: 1 }]}>
                    Fetching location...
                  </Text>
                </>
              ) : (
                <Text
                  style={[styles.fieldInput, !endLocation && { color: COLORS.textDisabled }, isReadOnly && styles.readonlyInput, { flex: 1 }]}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                  onPress={!isReadOnly ? handleLocate : undefined}
                >
                  {endLocation || 'Tap to fetch GPS location'}
                </Text>
              )}
              {!isReadOnly && !locating && (
                <TouchableOpacity style={styles.locateBtn} onPress={handleLocate}>
                  <Text style={styles.locateBtnText}>{endLocation ? 'Re-locate' : 'Locate'}</Text>
                </TouchableOpacity>
              )}
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
              <Text style={[styles.metricVal, { color: COLORS.success }]}>{effectiveTotalVisits}</Text>
              <Text style={styles.metricLbl}>Actual Calls</Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={styles.metricVal}>{effectiveDoctorVisits}</Text>
              <Text style={styles.metricLbl}>Doctor (Met)</Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={[styles.metricVal, { color: COLORS.error }]}>0</Text>
              <Text style={styles.metricLbl}>Doctor (Missed)</Text>
            </View>
            <View style={styles.metricBox}>
              <Text style={styles.metricVal}>{effectiveChemistVisits}</Text>
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
            <Text style={styles.promoValue}>₹ {totalPOB.toLocaleString('en-IN')}</Text>
          </View>
          <View style={styles.promoRow}>
            <Text style={styles.promoLabel}>Total Samples Given</Text>
            <Text style={styles.promoValue}>{totalSamples} Units</Text>
          </View>
        </View>

        {/* ── SECTION 4: Expenses Summary ──────────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.cardTitleRow}>
            <Text style={styles.cardTitle}>Expenses</Text>
            <TouchableOpacity
              style={styles.manageBtn}
              onPress={() => (navigation as any).navigate('Expenses', {
                screen: 'ExpenseList',
                params: { date: reportDate.split('T')[0] },
              })}
            >
              <MaterialCommunityIcons name="plus" size={14} color={COLORS.primary} />
              <Text style={styles.manageBtnText}>
                {dayExpenses.length === 0 ? 'Add Expense' : 'Manage'}
              </Text>
            </TouchableOpacity>
          </View>

          {dayExpenses.length === 0 ? (
            <Text style={styles.noExpenseText}>No expenses logged for this date.</Text>
          ) : (
            <>
              {dayExpenses.map(expense => {
                const meta = CATEGORY_META[expense.category] ?? CATEGORY_META.Other;
                return (
                  <View key={expense.id} style={styles.expenseSummaryRow}>
                    <MaterialCommunityIcons name={meta.icon} size={16} color={meta.color} />
                    <Text style={styles.expenseSummaryCategory}>{expense.category}</Text>
                    <Text style={styles.expenseSummaryAmount}>
                      ₹ {expense.amount.toLocaleString('en-IN')}
                    </Text>
                    {expense.receiptUrl ? (
                      <MaterialCommunityIcons name="paperclip" size={13} color={COLORS.textSecondary} />
                    ) : null}
                  </View>
                );
              })}
              <View style={styles.expenseTotalRow}>
                <Text style={styles.expenseTotalLabel}>Total</Text>
                <Text style={styles.expenseTotalValue}>₹ {expenseTotal.toLocaleString('en-IN')}</Text>
              </View>
            </>
          )}
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
            style={[styles.remarksInput, isReadOnly && styles.readonlyInput]}
            placeholder="E.g., Had a great discussion with Dr. Gupta regarding the new CardioMax study..."
            placeholderTextColor={COLORS.textDisabled}
            multiline
            numberOfLines={4}
            value={remarks}
            onChangeText={setRemarks}
            textAlignVertical="top"
            editable={!isReadOnly}
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
          <TouchableOpacity
            key={visit.id}
            style={styles.visitCard}
            activeOpacity={0.7}
            onPress={() => (navigation as any).navigate('VisitEdit', { visitId: visit.id })}
          >
            <View style={styles.visitInfo}>
              <Text style={styles.visitName}>
                {visit.doctorName || visit.chemistShopName || visit.stockistCompanyName || visit.stockistName || 'Unknown'}
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
            <MaterialCommunityIcons name="pencil-outline" size={SIZES.iconSM} color={COLORS.primary} />
          </TouchableOpacity>
        ))}

        {visits.length === 0 && (
          <View style={styles.emptyVisits}>
            <Text style={styles.emptyVisitsText}>No visits logged today</Text>
          </View>
        )}

        {/* ── Action Buttons ────────────────────────────────────────────────── */}
        {isReadOnly ? (
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
          >
            <MaterialCommunityIcons name="arrow-left" size={18} color={COLORS.primary} />
            <Text style={styles.backBtnText}>Back to Dashboard</Text>
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity
              style={[styles.submitBtn, (submitting || hasDuplicateDoctors) && styles.btnDisabled]}
              onPress={() => handleSubmit(false)}
              disabled={submitting || hasDuplicateDoctors}
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
          </>
        )}

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

  // ── Expense Summary ───────────────────────────────────────────────────────
  manageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: SIZES.radiusSM,
    paddingHorizontal: SIZES.paddingSM,
    paddingVertical: 3,
    gap: 2,
  },
  manageBtnText: {
    fontSize: SIZES.fontXS,
    fontWeight: '600',
    color: COLORS.primary,
    marginLeft: 2,
  },
  noExpenseText: {
    fontSize: SIZES.fontSM,
    color: COLORS.textDisabled,
    textAlign: 'center',
    paddingVertical: SIZES.paddingSM,
  },
  expenseSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SIZES.paddingXS + 2,
    gap: 8,
  },
  expenseSummaryCategory: {
    flex: 1,
    fontSize: SIZES.fontSM,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  expenseSummaryAmount: {
    fontSize: SIZES.fontSM,
    fontWeight: '600',
    color: COLORS.textPrimary,
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
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: SIZES.radiusMD,
    paddingVertical: SIZES.paddingMD - 2,
    marginTop: SIZES.paddingMD,
    gap: 6,
  },
  backBtnText: {
    fontSize: SIZES.fontMD,
    fontWeight: '600',
    color: COLORS.primary,
  },

  // ── Duplicate doctor warning ─────────────────────────────────────────────
  duplicateWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fef2f2',
    borderRadius: SIZES.radiusMD,
    borderWidth: 1,
    borderColor: '#fca5a5',
    paddingHorizontal: SIZES.paddingMD,
    paddingVertical: SIZES.paddingMD,
    marginBottom: SIZES.paddingMD,
  },
  duplicateWarningTitle: {
    fontSize: SIZES.fontSM,
    fontWeight: '700',
    color: COLORS.error,
    marginBottom: 2,
  },
  duplicateWarningSub: {
    fontSize: SIZES.fontXS,
    color: COLORS.error,
    lineHeight: 16,
  },

  // ── Status banner ─────────────────────────────────────────────────────────
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: SIZES.radiusMD,
    borderWidth: 1,
    paddingHorizontal: SIZES.paddingMD,
    paddingVertical: SIZES.paddingMD,
    marginBottom: SIZES.paddingMD,
  },
  statusBannerSubmitted: {
    backgroundColor: '#fffbeb',
    borderColor: '#f59e0b',
  },
  statusBannerApproved: {
    backgroundColor: '#f0fdf4',
    borderColor: '#a7f3d0',
  },
  statusBannerTitle: {
    fontSize: SIZES.fontSM,
    fontWeight: '700',
    color: '#b45309',
    marginBottom: 2,
  },
  statusBannerSub: {
    fontSize: SIZES.fontXS,
    color: COLORS.textSecondary,
  },
});

export default CreateDCRScreen;
