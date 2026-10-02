import React, { useMemo, useRef, useState } from 'react';
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
import { useNavigation, useRoute, RouteProp, CommonActions } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  launchCamera,
  launchImageLibrary,
  ImageLibraryOptions,
  CameraOptions,
} from 'react-native-image-picker';
import { expenseApi, storageApi } from '../../services/api';
import { ExpenseCategory } from '../../types/expense.types';
import { ExpenseStackParamList } from '../../types/navigation.types';
import { COLORS, SIZES } from '../../constants';
import { getTodayDate } from '../../utils/dateUtils';
import { showAlert } from '../../utils/helpers';
import { Loading } from '../../components/common';

type AddExpenseNavProp = StackNavigationProp<ExpenseStackParamList, 'AddExpense'>;
type AddExpenseRouteProp = RouteProp<ExpenseStackParamList, 'AddExpense'>;

const CATEGORIES: Array<{ value: ExpenseCategory; label: string; icon: string; color: string; bg: string }> = [
  { value: 'Travel', label: 'Travel',  icon: 'car-outline',      color: '#ea580c', bg: '#ffedd5' },
  { value: 'Food',   label: 'Food',    icon: 'food-outline',     color: '#16a34a', bg: '#dcfce7' },
  { value: 'Other',  label: 'Other',   icon: 'dots-horizontal',  color: '#7c3aed', bg: '#ede9fe' },
];

const IMAGE_OPTIONS: ImageLibraryOptions & CameraOptions = {
  mediaType: 'photo',
  quality: 0.8,
  maxWidth: 1600,
  maxHeight: 1600,
};

const AddExpenseScreen: React.FC = () => {
  const navigation = useNavigation<AddExpenseNavProp>();
  const route = useRoute<AddExpenseRouteProp>();
  const defaultDate = route.params?.date ?? getTodayDate();
  const returnTo = route.params?.returnTo;

  // Tick every type spent on that day; each gets its own amount and is saved as its own expense
  const [selected, setSelected] = useState<ExpenseCategory[]>([]);
  const [amounts, setAmounts] = useState<Partial<Record<ExpenseCategory, string>>>({});
  const amountRefs = useRef<Partial<Record<ExpenseCategory, TextInput | null>>>({});
  const [description, setDescription] = useState('');

  const parseInitialDate = (d: string): Date => {
    const [y, m, day] = d.split('T')[0].split('-').map(Number);
    return new Date(y, m - 1, day); // local midnight — avoids UTC offset shifting the day
  };
  const [selectedDate, setSelectedDate] = useState<Date>(parseInitialDate(defaultDate));
  const [showDatePicker, setShowDatePicker] = useState(false);

  const expenseDate = [
    selectedDate.getFullYear(),
    String(selectedDate.getMonth() + 1).padStart(2, '0'),
    String(selectedDate.getDate()).padStart(2, '0'),
  ].join('-');
  const today = new Date();

  const onDateChange = (_event: DateTimePickerChangeEvent, date: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    setSelectedDate(date);
  };

  const [receiptUri, setReceiptUri] = useState<string | null>(null);
  const [receiptUrl, setReceiptUrl] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const toggleCategory = (cat: ExpenseCategory) => {
    if (selected.includes(cat)) {
      setSelected(prev => prev.filter(c => c !== cat));
      return;
    }
    // Keep the list order (Travel, Food, Other) regardless of tap order
    setSelected(prev => CATEGORIES.map(c => c.value).filter(v => v === cat || prev.includes(v)));
    setTimeout(() => amountRefs.current[cat]?.focus(), 50);
  };

  const total = useMemo(
    () => selected.reduce((sum, c) => sum + (parseFloat(amounts[c] ?? '') || 0), 0),
    [selected, amounts],
  );

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

  // Opened from the DCR screen: go back there, leaving the Expenses stack on its list for next time
  const leave = () => {
    if (returnTo === 'DCR') {
      navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'ExpenseList' }] }));
      navigation.getParent()?.navigate('DCR' as never);
    } else {
      navigation.goBack();
    }
  };

  const handleSave = async () => {
    if (selected.length === 0) {
      showAlert('Required', 'Tick at least one expense type.');
      return;
    }
    const missing = selected.find(c => !(parseFloat(amounts[c] ?? '') > 0));
    if (missing) {
      showAlert('Required', `Please enter a valid amount for ${missing}.`);
      amountRefs.current[missing]?.focus();
      return;
    }
    if (uploading) {
      showAlert('Please Wait', 'Receipt is still uploading. Please wait.');
      return;
    }

    setSaving(true);
    try {
      // One request, all-or-nothing: one expense per ticked type
      await expenseApi.createExpenses({
        expenseDate,
        items: selected.map(c => ({ category: c, amount: parseFloat(amounts[c]!) })),
        description: description.trim() || undefined,
        receiptUrl: receiptUrl || undefined,
      });
      showAlert(
        'Saved',
        selected.length === 1
          ? 'Expense added successfully.'
          : `${selected.length} expenses added • ₹ ${total.toLocaleString('en-IN')}`,
        leave,
      );
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'Failed to save expense.';
      showAlert('Error', msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">

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

        {/* Expense types — tick all that apply, amount per type */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Expenses for the day</Text>
          {CATEGORIES.map((cat, idx) => {
            const isOn = selected.includes(cat.value);
            return (
              <View key={cat.value} style={[styles.catRow, idx < CATEGORIES.length - 1 && styles.catRowBorder]}>
                <TouchableOpacity style={styles.catToggle} onPress={() => toggleCategory(cat.value)} activeOpacity={0.7}>
                  <MaterialCommunityIcons
                    name={isOn ? 'checkbox-marked' : 'checkbox-blank-outline'}
                    size={24}
                    color={isOn ? COLORS.primary : COLORS.textSecondary}
                  />
                  <View style={[styles.catIcon, { backgroundColor: cat.bg }]}>
                    <MaterialCommunityIcons name={cat.icon} size={18} color={cat.color} />
                  </View>
                  <Text style={[styles.catLabel, isOn && styles.catLabelOn]}>{cat.label}</Text>
                </TouchableOpacity>
                {isOn ? (
                  <View style={styles.catAmount}>
                    <Text style={styles.catCurrency}>₹</Text>
                    <TextInput
                      ref={el => { amountRefs.current[cat.value] = el; }}
                      style={styles.catAmountInput}
                      value={amounts[cat.value] ?? ''}
                      onChangeText={v => setAmounts(prev => ({ ...prev, [cat.value]: v.replace(/[^0-9.]/g, '') }))}
                      keyboardType="decimal-pad"
                      placeholder="0"
                      placeholderTextColor={COLORS.textDisabled}
                    />
                  </View>
                ) : null}
              </View>
            );
          })}
          {selected.length > 1 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>₹ {total.toLocaleString('en-IN')}</Text>
            </View>
          )}
        </View>

        {/* Note */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Note (optional)</Text>
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
          <Text style={styles.cardTitle}>Receipt (optional)</Text>

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
              <TouchableOpacity
                style={styles.pickerBtn}
                onPress={() => handlePickImage('camera')}
              >
                <MaterialCommunityIcons name="camera-outline" size={22} color={COLORS.primary} />
                <Text style={styles.pickerBtnText}>Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.pickerBtn}
                onPress={() => handlePickImage('gallery')}
              >
                <MaterialCommunityIcons name="image-outline" size={22} color={COLORS.primary} />
                <Text style={styles.pickerBtnText}>Gallery</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Save */}
        <TouchableOpacity
          style={[styles.saveBtn, (saving || uploading) && styles.btnDisabled]}
          onPress={handleSave}
          disabled={saving || uploading}
        >
          <Text style={styles.saveBtnText}>
            {selected.length > 1
              ? `Save ${selected.length} Expenses • ₹ ${total.toLocaleString('en-IN')}`
              : 'Save Expense'}
          </Text>
        </TouchableOpacity>

      </ScrollView>

      <Loading visible={saving} message="Saving..." />
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
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    paddingVertical: 6,
  },
  catRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  catToggle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  catIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  catLabel: {
    fontSize: SIZES.fontMD,
    fontWeight: '500',
    color: COLORS.textSecondary,
  },
  catLabelOn: {
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  catAmount: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 130,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: SIZES.radiusMD,
    paddingHorizontal: SIZES.paddingSM,
    backgroundColor: COLORS.background,
  },
  catCurrency: {
    fontSize: SIZES.fontMD,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginRight: 4,
  },
  catAmountInput: {
    flex: 1,
    fontSize: SIZES.fontLG,
    fontWeight: '700',
    color: COLORS.textPrimary,
    paddingVertical: SIZES.paddingSM,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginTop: SIZES.paddingSM,
    paddingTop: SIZES.paddingSM,
  },
  totalLabel: {
    fontSize: SIZES.fontMD,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  totalValue: {
    fontSize: SIZES.fontLG,
    fontWeight: '800',
    color: COLORS.primary,
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
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.radiusMD,
    paddingVertical: SIZES.paddingMD,
    alignItems: 'center',
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

export default AddExpenseScreen;
