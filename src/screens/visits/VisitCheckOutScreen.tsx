import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Button, Card, Loading } from '../../components/common';
import { useAppDispatch } from '../../store/hooks';
import { updateVisit, setActiveVisit } from '../../store/slices/visitSlice';
import { visitApi } from '../../services/api';
import { SampleInventoryItem, CheckOutVisitRequest, VisitSampleRequest } from '../../types/visit.types';
import { VisitStackParamList } from '../../types/navigation.types';
import { COLORS, SIZES } from '../../constants';

type VisitCheckOutRouteProp = RouteProp<VisitStackParamList, 'VisitCheckOut'>;

interface SampleEntry {
  productId: string;
  productName: string;
  quantity: string;
  availableStock: number;
}

const VisitCheckOutScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<VisitCheckOutRouteProp>();
  const dispatch = useAppDispatch();
  const { visitId } = route.params;

  const [inventory, setInventory] = useState<SampleInventoryItem[]>([]);
  const [loadingInventory, setLoadingInventory] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);

  // Form state
  const [productsDiscussed, setProductsDiscussed] = useState('');
  const [selectedVisuals, setSelectedVisuals] = useState<string[]>([]);
  const [sampleEntries, setSampleEntries] = useState<SampleEntry[]>([]);
  const [giftsGiven, setGiftsGiven] = useState('');
  const [feedback, setFeedback] = useState('');
  const [nextActionPlan, setNextActionPlan] = useState('');
  const [isOrderBooked, setIsOrderBooked] = useState(false);
  const [orderValue, setOrderValue] = useState('');

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      const data = await visitApi.getSampleInventory();
      setInventory(data);
    } catch (error) {
      console.error('Failed to fetch inventory:', error);
    } finally {
      setLoadingInventory(false);
    }
  };

  const toggleVisual = useCallback((productName: string) => {
    setSelectedVisuals(prev =>
      prev.includes(productName)
        ? prev.filter(v => v !== productName)
        : [...prev, productName]
    );
  }, []);

  const addSampleEntry = useCallback(() => {
    const availableProducts = inventory.filter(
      item => item.closingBalance > 0 && !sampleEntries.find(e => e.productId === item.productId)
    );
    if (availableProducts.length === 0) {
      Alert.alert('No Stock', 'No products available to add.');
      return;
    }
    const first = availableProducts[0];
    setSampleEntries(prev => [
      ...prev,
      { productId: first.productId, productName: first.productName, quantity: '1', availableStock: first.closingBalance },
    ]);
  }, [inventory, sampleEntries]);

  const updateSampleProduct = useCallback((index: number, productId: string) => {
    const item = inventory.find(i => i.productId === productId);
    if (!item) return;
    setSampleEntries(prev =>
      prev.map((e, i) =>
        i === index ? { productId: item.productId, productName: item.productName, quantity: '1', availableStock: item.closingBalance } : e
      )
    );
  }, [inventory]);

  const updateSampleQuantity = useCallback((index: number, value: string) => {
    setSampleEntries(prev =>
      prev.map((e, i) => (i === index ? { ...e, quantity: value } : e))
    );
  }, []);

  const removeSample = useCallback((index: number) => {
    setSampleEntries(prev => prev.filter((_, i) => i !== index));
  }, []);

  const validateSamples = (): string | null => {
    for (const entry of sampleEntries) {
      const qty = parseInt(entry.quantity, 10);
      if (isNaN(qty) || qty <= 0) return `Enter a valid quantity for ${entry.productName}`;
      if (qty > entry.availableStock) return `Insufficient stock for ${entry.productName}. Available: ${entry.availableStock}`;
    }
    return null;
  };

  const handleCheckOut = async () => {
    const sampleError = validateSamples();
    if (sampleError) {
      Alert.alert('Validation Error', sampleError);
      return;
    }

    try {
      setCheckingOut(true);

      const samples: VisitSampleRequest[] = sampleEntries.map(e => ({
        productId: e.productId,
        quantity: parseInt(e.quantity, 10),
      }));

      const checkOutData: CheckOutVisitRequest = {
        visitId,
        checkOutTime: new Date().toISOString(),
        productsDiscussed: productsDiscussed || undefined,
        visualsShown: selectedVisuals.length > 0 ? selectedVisuals.join(',') : undefined,
        giftsGiven: giftsGiven || undefined,
        feedback: feedback || undefined,
        nextActionPlan: nextActionPlan || undefined,
        isOrderBooked,
        orderValue: isOrderBooked && orderValue ? parseFloat(orderValue) : undefined,
        samples,
      };

      const updatedVisit = await visitApi.checkOut(checkOutData);
      dispatch(updateVisit(updatedVisit));
      dispatch(setActiveVisit(null));

      Alert.alert('Success', 'Check-out successful!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      const msg = error?.response?.data?.message || 'Failed to check-out. Please try again.';
      Alert.alert('Error', msg);
    } finally {
      setCheckingOut(false);
    }
  };

  const availableForVisuals = inventory.filter(i => i.closingBalance >= 0);
  const availableForSamples = inventory.filter(
    i => i.closingBalance > 0 && !sampleEntries.find(e => e.productId === i.productId)
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Products Discussed */}
      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Products Discussed</Text>
        <TextInput
          style={styles.textArea}
          placeholder="e.g., Amoxiclav, Pantoprazole..."
          placeholderTextColor={COLORS.textDisabled}
          multiline
          numberOfLines={2}
          value={productsDiscussed}
          onChangeText={setProductsDiscussed}
        />
      </Card>

      {/* Visual Aids */}
      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Visual Aids Shown</Text>
        {loadingInventory ? (
          <Text style={styles.loadingText}>Loading products...</Text>
        ) : availableForVisuals.length === 0 ? (
          <Text style={styles.emptyText}>No products in inventory</Text>
        ) : (
          <View style={styles.chipGrid}>
            {availableForVisuals.map(item => {
              const selected = selectedVisuals.includes(item.productName);
              return (
                <TouchableOpacity
                  key={item.productId}
                  style={[styles.chip, selected && styles.chipSelected]}
                  onPress={() => toggleVisual(item.productName)}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                    {item.productName}
                  </Text>
                  {selected && (
                    <MaterialCommunityIcons name="check" size={14} color={COLORS.textWhite} style={styles.chipIcon} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </Card>

      {/* Samples Given */}
      <Card style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Samples Given</Text>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={addSampleEntry}
            disabled={availableForSamples.length === 0 && sampleEntries.length === 0}
          >
            <MaterialCommunityIcons name="plus-circle" size={22} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        {sampleEntries.length === 0 ? (
          <Text style={styles.emptyText}>No samples added. Tap + to add.</Text>
        ) : (
          sampleEntries.map((entry, index) => (
            <View key={index} style={styles.sampleRow}>
              {/* Product Picker (horizontal scroll) */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.productScroll}>
                {inventory.filter(i => i.closingBalance > 0 || i.productId === entry.productId).map(item => (
                  <TouchableOpacity
                    key={item.productId}
                    style={[
                      styles.productChip,
                      entry.productId === item.productId && styles.productChipSelected,
                    ]}
                    onPress={() => updateSampleProduct(index, item.productId)}
                  >
                    <Text style={[
                      styles.productChipText,
                      entry.productId === item.productId && styles.productChipTextSelected,
                    ]}>
                      {item.productName}
                    </Text>
                    <Text style={styles.stockText}>({item.closingBalance})</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={styles.qtyRow}>
                <Text style={styles.qtyLabel}>Qty:</Text>
                <TextInput
                  style={styles.qtyInput}
                  keyboardType="number-pad"
                  value={entry.quantity}
                  onChangeText={v => updateSampleQuantity(index, v)}
                  maxLength={4}
                />
                <Text style={styles.stockAvailable}>/ {entry.availableStock}</Text>
                <TouchableOpacity onPress={() => removeSample(index)} style={styles.removeBtn}>
                  <MaterialCommunityIcons name="trash-can-outline" size={20} color={COLORS.error} />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </Card>

      {/* Gifts Given */}
      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Gifts Given</Text>
        <TextInput
          style={styles.textArea}
          placeholder="e.g., Pen, Notepad, Calendar..."
          placeholderTextColor={COLORS.textDisabled}
          multiline
          numberOfLines={2}
          value={giftsGiven}
          onChangeText={setGiftsGiven}
        />
      </Card>

      {/* Feedback & Action */}
      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Doctor Feedback</Text>
        <TextInput
          style={styles.textArea}
          placeholder="Any feedback or comments from doctor"
          placeholderTextColor={COLORS.textDisabled}
          multiline
          numberOfLines={3}
          value={feedback}
          onChangeText={setFeedback}
        />

        <Text style={[styles.sectionTitle, styles.fieldMarginTop]}>Next Action Plan</Text>
        <TextInput
          style={styles.textArea}
          placeholder="Follow-up actions planned"
          placeholderTextColor={COLORS.textDisabled}
          multiline
          numberOfLines={2}
          value={nextActionPlan}
          onChangeText={setNextActionPlan}
        />
      </Card>

      {/* Order */}
      <Card style={styles.section}>
        <TouchableOpacity
          style={styles.toggleRow}
          onPress={() => setIsOrderBooked(prev => !prev)}
        >
          <MaterialCommunityIcons
            name={isOrderBooked ? 'checkbox-marked' : 'checkbox-blank-outline'}
            size={24}
            color={isOrderBooked ? COLORS.primary : COLORS.textSecondary}
          />
          <Text style={styles.toggleLabel}>Order Booked</Text>
        </TouchableOpacity>

        {isOrderBooked && (
          <TextInput
            style={styles.input}
            placeholder="Order value (₹)"
            placeholderTextColor={COLORS.textDisabled}
            keyboardType="decimal-pad"
            value={orderValue}
            onChangeText={setOrderValue}
          />
        )}
      </Card>

      <Button
        title="Confirm Check-Out"
        onPress={handleCheckOut}
        loading={checkingOut}
        style={styles.checkOutBtn}
        icon="logout"
      />

      <Loading visible={checkingOut} message="Checking out..." />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.backgroundGray },
  content: { padding: SIZES.paddingMD, paddingBottom: 40 },
  section: { marginBottom: SIZES.paddingMD },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SIZES.paddingSM,
  },
  sectionTitle: {
    fontSize: SIZES.fontMD,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: SIZES.paddingSM,
  },
  fieldMarginTop: { marginTop: SIZES.paddingMD },
  loadingText: { fontSize: SIZES.fontSM, color: COLORS.textSecondary },
  emptyText: { fontSize: SIZES.fontSM, color: COLORS.textDisabled, fontStyle: 'italic' },
  textArea: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radiusMD,
    padding: SIZES.paddingSM,
    fontSize: SIZES.fontMD,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.background,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radiusMD,
    padding: SIZES.paddingSM,
    fontSize: SIZES.fontMD,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.background,
    marginTop: SIZES.paddingSM,
  },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.paddingMD,
    paddingVertical: SIZES.paddingXS,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  chipSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontSize: SIZES.fontSM, color: COLORS.textSecondary },
  chipTextSelected: { color: COLORS.textWhite, fontWeight: '600' },
  chipIcon: { marginLeft: 4 },
  addBtn: { padding: 4 },
  sampleRow: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radiusMD,
    padding: SIZES.paddingSM,
    marginBottom: SIZES.paddingSM,
    backgroundColor: COLORS.background,
  },
  productScroll: { marginBottom: SIZES.paddingXS },
  productChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.paddingSM,
    paddingVertical: 4,
    marginRight: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.backgroundGray,
  },
  productChipSelected: { backgroundColor: COLORS.primaryLight + '30', borderColor: COLORS.primary },
  productChipText: { fontSize: SIZES.fontXS, color: COLORS.textSecondary },
  productChipTextSelected: { color: COLORS.primary, fontWeight: '600' },
  stockText: { fontSize: SIZES.fontXS, color: COLORS.textDisabled, marginLeft: 2 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  qtyLabel: { fontSize: SIZES.fontSM, color: COLORS.textSecondary, marginRight: 8 },
  qtyInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radiusSM,
    paddingHorizontal: SIZES.paddingSM,
    paddingVertical: 4,
    width: 60,
    fontSize: SIZES.fontMD,
    color: COLORS.textPrimary,
    textAlign: 'center',
    backgroundColor: COLORS.background,
  },
  stockAvailable: { fontSize: SIZES.fontXS, color: COLORS.textDisabled, marginLeft: 6, flex: 1 },
  removeBtn: { padding: 4 },
  toggleRow: { flexDirection: 'row', alignItems: 'center' },
  toggleLabel: { fontSize: SIZES.fontMD, color: COLORS.textPrimary, marginLeft: SIZES.paddingSM },
  checkOutBtn: { marginTop: SIZES.paddingMD },
});

export default VisitCheckOutScreen;
