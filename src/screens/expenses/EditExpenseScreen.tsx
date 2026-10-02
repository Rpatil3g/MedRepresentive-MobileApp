import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import DateTimePicker, { DateTimePickerChangeEvent } from '@react-native-community/datetimepicker';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  launchCamera,
  launchImageLibrary,
  ImageLibraryOptions,
  CameraOptions,
} from 'react-native-image-picker';
import { expenseApi, storageApi } from '../../services/api';
import { refreshRejectedCounts } from '../../hooks/useRejectedCounts';
import { ExpenseCategory } from '../../types/expense.types';
import { ExpenseStackParamList } from '../../types/navigation.types';
import { COLORS, SIZES } from '../../constants';
import { showAlert } from '../../utils/helpers';
import { Loading } from '../../components/common';

type EditExpenseNavProp = StackNavigationProp<ExpenseStackParamList, 'EditExpense'>;
type EditExpenseRouteProp = RouteProp<ExpenseStackParamList, 'EditExpense'>;

const CATEGORIES: Array<{ value: ExpenseCategory; label: string; icon: string; color: string; bg: string }> = [
  { value: 'Travel', label: 'Travel', icon: 'car-outline',     color: '#ea580c', bg: '#ffedd5' },
  { value: 'Food',   label: 'Food',   icon: 'food-outline',    color: '#16a34a', bg: '#dcfce7' },
  { value: 'Other',  label: 'Other',  icon: 'dots-horizontal', color: '#7c3aed', bg: '#ede9fe' },
];

const IMAGE_OPTIONS: ImageLibraryOptions & CameraOptions = {
  mediaType: 'photo',
  quality: 0.8,
  maxWidth: 1600,
  maxHeight: 1600,
};

const EditExpenseScreen: React.FC = () => {
  const navigation = useNavigation<EditExpenseNavProp>();
  const route = useRoute<EditExpenseRouteProp>();
  const { expenseId } = route.params;

  const [fetching, setFetching] = useState(true);
  const [rejectionReason, setRejectionReason] = useState<string | undefined>();

  const [category, setCategory] = useState<ExpenseCategory>('Travel');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [receiptUri, setReceiptUri] = useState<string | null>(null);
  const [receiptUrl, setReceiptUrl] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const today = new Date();

  useEffect(() => {
    expenseApi.getExpenseById(expenseId)
      .then(expense => {
        const [y, m, d] = expense.expenseDate.split('T')[0].split('-').map(Number);
        setSelectedDate(new Date(y, m - 1, d));
        setCategory(expense.category as ExpenseCategory);
        setAmount(String(expense.amount));
        setDescription(expense.description ?? '');
        setReceiptUrl(expense.receiptUrl ?? '');
        setReceiptUri(expense.receiptUrl ?? null);
        setRejectionReason(expense.approvalComments);
      })
      .catch(() => showAlert('Error', 'Could not load expense details.', () => navigation.goBack()))
      .finally(() => setFetching(false));
  }, [expenseId]);

  const expenseDate = [
    selectedDate.getFullYear(),
    String(selectedDate.getMonth() + 1).padStart(2, '0'),
    String(selectedDate.getDate()).padStart(2, '0'),
  ].join('-');

  const onDateChange = (_event: DateTimePickerChangeEvent, date: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    setSelectedDate(date);
  };

  const handlePickImage = async (source: 'camera' | 'gallery') => {
    const result = source === 'camera'
      ? await launchCamera(IMAGE_OPTIONS)
      : await launchImageLibrary(IMAGE_OPTIONS);

    if (result.didCancel || !result.assets?.[0]?.uri) return;

    const asset = result.assets[0];
    setReceiptUri(asset.uri!);
    setUploading(true);
    try {
      const url = await storageApi.uploadFile(
        asset.uri!,
        asset.type || 'image/jpeg',
        asset.fileName || `receipt_${Date.now()}.jpg`,
        'expenses',
      );
      setReceiptUrl(url);
    } catch {
      showAlert('Upload Failed', 'Could not upload receipt. Please try again.');
      setReceiptUri(null);
      setReceiptUrl('');
    } finally {
      setUploading(false);
    }
  };

  const clearReceipt = () => {
    setReceiptUri(null);
    setReceiptUrl('');
  };

  const handleSave = async () => {
    const parsedAmount = parseFloat(amount);
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      showAlert('Required', 'Please enter a valid amount.');
      return;
    }
    if (uploading) {
      showAlert('Please Wait', 'Receipt is still uploading. Please wait.');
      return;
    }

    setSaving(true);
    try {
      await expenseApi.updateExpense(expenseId, {
        expenseDate,
        category,
        amount: parsedAmount,
        description: description.trim() || undefined,
        receiptUrl: receiptUrl || undefined,
      });
      refreshRejectedCounts();
      showAlert('Resubmitted', 'Your expense has been resubmitted for approval.', () => navigation.goBack());
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'Failed to update expense.';
      showAlert('Error', msg);
    } finally {
      setSaving(false);
    }
  };

  if (fetching) {
    return <Loading visible message="Loading expense..." />;
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>

        {/* Rejection reason banner */}
        {rejectionReason ? (
          <View style={styles.rejectionBanner}>
            <MaterialCommunityIcons name="alert-circle-outline" size={18} color="#dc2626" />
            <View style={styles.rejectionBannerText}>
              <Text style={styles.rejectionBannerTitle}>Reason for rejection</Text>
              <Text style={styles.rejectionBannerBody}>{rejectionReason}</Text>
            </View>
          </View>
        ) : null}

        {/* Date */}
        <TouchableOpacity style={styles.card} onPress={() => setShowDatePicker(true)} activeOpacity={0.7}>
          <View style={styles.dateRow}>
            <MaterialCommunityIcons name="calendar-today" size={SIZES.iconSM} color={COLORS.primary} />
            <Text style={styles.dateText}>{expenseDate}</Text>
            <MaterialCommunityIcons name="chevron-down" size={18} color={COLORS.textSecondary} style={{ marginLeft: 'auto' }} />
          </View>
        </TouchableOpacity>

        {showDatePicker && (
          <DateTimePicker
            value={selectedDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            maximumDate={today}
            onValueChange={onDateChange}
          />
        )}

        {/* Category */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Category</Text>
          <View style={styles.categoryRow}>
            {CATEGORIES.map(cat => {
              const isActive = category === cat.value;
              return (
                <TouchableOpacity
                  key={cat.value}
                  style={[
                    styles.catChip,
                    { borderColor: isActive ? cat.color : COLORS.border },
                    isActive && { backgroundColor: cat.bg },
                  ]}
                  onPress={() => setCategory(cat.value)}
                  activeOpacity={0.75}
                >
                  <MaterialCommunityIcons
                    name={cat.icon}
                    size={18}
                    color={isActive ? cat.color : COLORS.textSecondary}
                  />
                  <Text style={[styles.catChipText, isActive && { color: cat.color }]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Amount */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Amount</Text>
          <View style={styles.amountRow}>
            <Text style={styles.currencySymbol}>₹</Text>
            <TextInput
              style={styles.amountInput}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor={COLORS.textDisabled}
            />
          </View>
        </View>

        {/* Description */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Description (optional)</Text>
          <TextInput
            style={styles.descInput}
            value={description}
            onChangeText={setDescription}
            placeholder="E.g., Cab from office to Dr. Sharma clinic"
            placeholderTextColor={COLORS.textDisabled}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* Receipt */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Receipt</Text>

          {receiptUri ? (
            <View style={styles.receiptPreview}>
              <Image source={{ uri: receiptUri }} style={styles.receiptImage} resizeMode="cover" />
              {uploading && (
                <View style={styles.uploadOverlay}>
                  <ActivityIndicator color={COLORS.textWhite} size="large" />
                  <Text style={styles.uploadingText}>Uploading...</Text>
                </View>
              )}
              {!uploading && (
                <TouchableOpacity style={styles.removeBtn} onPress={clearReceipt}>
                  <MaterialCommunityIcons name="close-circle" size={26} color={COLORS.error} />
                </TouchableOpacity>
              )}
              {!uploading && receiptUrl ? (
                <View style={styles.uploadedBadge}>
                  <MaterialCommunityIcons name="check-circle" size={14} color={COLORS.success} />
                  <Text style={styles.uploadedText}>Uploaded</Text>
                </View>
              ) : null}
            </View>
          ) : (
            <View style={styles.pickerButtons}>
              <TouchableOpacity style={styles.pickerBtn} onPress={() => handlePickImage('camera')}>
                <MaterialCommunityIcons name="camera-outline" size={22} color={COLORS.primary} />
                <Text style={styles.pickerBtnText}>Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.pickerBtn} onPress={() => handlePickImage('gallery')}>
                <MaterialCommunityIcons name="image-outline" size={22} color={COLORS.primary} />
                <Text style={styles.pickerBtnText}>Gallery</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Resubmit */}
        <TouchableOpacity
          style={[styles.saveBtn, (saving || uploading) && styles.btnDisabled]}
          onPress={handleSave}
          disabled={saving || uploading}
        >
          <MaterialCommunityIcons name="send-outline" size={18} color={COLORS.textWhite} />
          <Text style={styles.saveBtnText}>Resubmit for Approval</Text>
        </TouchableOpacity>

      </ScrollView>

      <Loading visible={saving} message="Resubmitting..." />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundGray,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: SIZES.paddingMD,
    paddingBottom: SIZES.paddingXL,
  },
  rejectionBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: '#fef2f2',
    borderRadius: SIZES.radiusMD,
    padding: SIZES.paddingMD,
    marginBottom: SIZES.paddingMD,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  rejectionBannerText: {
    flex: 1,
  },
  rejectionBannerTitle: {
    fontSize: SIZES.fontSM,
    fontWeight: '700',
    color: '#dc2626',
    marginBottom: 2,
  },
  rejectionBannerBody: {
    fontSize: SIZES.fontSM,
    color: '#7f1d1d',
    lineHeight: 18,
  },
  card: {
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radiusLG,
    padding: SIZES.paddingMD,
    marginBottom: SIZES.paddingMD,
    borderWidth: 1,
    borderColor: COLORS.border,
    elevation: 1,
  },
  cardTitle: {
    fontSize: SIZES.fontSM,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SIZES.paddingSM + 2,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateText: {
    fontSize: SIZES.fontMD,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  categoryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  catChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: SIZES.paddingSM + 2,
    borderRadius: SIZES.radiusMD,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.backgroundGray,
  },
  catChipText: {
    fontSize: SIZES.fontSM,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radiusMD,
    paddingHorizontal: SIZES.paddingMD,
    backgroundColor: COLORS.backgroundGray,
  },
  currencySymbol: {
    fontSize: SIZES.fontXL,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginRight: 6,
  },
  amountInput: {
    flex: 1,
    fontSize: SIZES.font2XL,
    fontWeight: '700',
    color: COLORS.textPrimary,
    paddingVertical: SIZES.paddingSM + 4,
  },
  descInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radiusMD,
    padding: SIZES.paddingMD,
    fontSize: SIZES.fontMD,
    color: COLORS.textPrimary,
    minHeight: 80,
    backgroundColor: COLORS.backgroundGray,
  },
  pickerButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  pickerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: SIZES.paddingMD,
    borderRadius: SIZES.radiusMD,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
    backgroundColor: COLORS.primaryLight,
  },
  pickerBtnText: {
    fontSize: SIZES.fontSM,
    fontWeight: '600',
    color: COLORS.primary,
  },
  receiptPreview: {
    borderRadius: SIZES.radiusMD,
    overflow: 'hidden',
    height: 180,
    position: 'relative',
  },
  receiptImage: {
    width: '100%',
    height: '100%',
    borderRadius: SIZES.radiusMD,
  },
  uploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  uploadingText: {
    color: COLORS.textWhite,
    fontSize: SIZES.fontSM,
    fontWeight: '600',
  },
  removeBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: COLORS.background,
    borderRadius: 13,
  },
  uploadedBadge: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.background,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: SIZES.radiusSM,
  },
  uploadedText: {
    fontSize: SIZES.fontXS,
    fontWeight: '600',
    color: COLORS.success,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.radiusMD,
    paddingVertical: SIZES.paddingMD,
    marginTop: SIZES.paddingXS,
    elevation: 4,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },
  saveBtnText: {
    fontSize: SIZES.fontMD,
    fontWeight: '700',
    color: COLORS.textWhite,
  },
  btnDisabled: {
    opacity: 0.5,
  },
});

export default EditExpenseScreen;
