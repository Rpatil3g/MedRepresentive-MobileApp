import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Button, Loading } from '../../components/common';
import { visitApi, productApi, lookupApi } from '../../services/api';
import { Visit } from '../../types/visit.types';
import { Product } from '../../types/product.types';
import { VisitStackParamList } from '../../types/navigation.types';
import { COLORS, SIZES } from '../../constants';
import { formatDate, formatTime } from '../../utils/dateUtils';
import { showAlert } from '../../utils/helpers';

type VisitEditRouteProp = RouteProp<VisitStackParamList, 'VisitEdit'>;

interface SampleItem {
  productId: string;
  productName: string;
  quantity: number;
}

const FALLBACK_CALL_TYPES    = ['Routine', 'Follow Up', 'Campaign', 'Cold Call'];
const FALLBACK_VISIT_OUTCOMES = ['Met', 'Not Available', 'Busy / Refused', 'On Leave'];

// ── Reusable Picker Modal ────────────────────────────────────────────────────

interface PickerModalProps {
  visible: boolean;
  title: string;
  options: string[];
  selected: string;
  onSelect: (value: string) => void;
  onClose: () => void;
}

const PickerModal: React.FC<PickerModalProps> = ({
  visible, title, options, selected, onSelect, onClose,
}) => (
  <Modal visible={visible} transparent animationType="fade">
    <TouchableOpacity style={styles.modalOverlay} onPress={onClose} activeOpacity={1}>
      <TouchableOpacity style={styles.pickerCard} activeOpacity={1}>
        <Text style={styles.pickerTitle}>{title}</Text>
        {options.map(opt => (
          <TouchableOpacity
            key={opt}
            style={[styles.pickerRow, opt === selected && styles.pickerRowActive]}
            onPress={() => onSelect(opt)}
          >
            <Text style={[styles.pickerRowText, opt === selected && styles.pickerRowTextActive]}>
              {opt}
            </Text>
            {opt === selected && (
              <MaterialCommunityIcons name="check" size={18} color={COLORS.primary} />
            )}
          </TouchableOpacity>
        ))}
      </TouchableOpacity>
    </TouchableOpacity>
  </Modal>
);

const SectionLabel: React.FC<{ label: string }> = ({ label }) => (
  <Text style={styles.label}>{label}</Text>
);

// ── Main Screen ──────────────────────────────────────────────────────────────

const VisitEditScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<VisitEditRouteProp>();
  const { visitId } = route.params;

  const [visit, setVisit] = useState<Visit | null>(null);
  const [loadingVisit, setLoadingVisit] = useState(true);
  const [saving, setSaving] = useState(false);

  // Lookup options
  const [callTypes, setCallTypes]       = useState<string[]>(FALLBACK_CALL_TYPES);
  const [visitOutcomes, setVisitOutcomes] = useState<string[]>(FALLBACK_VISIT_OUTCOMES);

  // Editable form state
  const [callType, setCallType]         = useState('Routine');
  const [visitOutcome, setVisitOutcome] = useState('Met');
  const [samples, setSamples]           = useState<SampleItem[]>([]);
  const [isOrderBooked, setIsOrderBooked] = useState(false);
  const [orderValue, setOrderValue]     = useState('');
  const [remarks, setRemarks]           = useState('');

  // Picker modals
  const [showCallTypePicker, setShowCallTypePicker]   = useState(false);
  const [showOutcomePicker, setShowOutcomePicker]     = useState(false);

  // Product search
  const [productQuery, setProductQuery]       = useState('');
  const [productResults, setProductResults]   = useState<Product[]>([]);
  const [showProductDrop, setShowProductDrop] = useState(false);
  const [searchingProduct, setSearchingProduct] = useState(false);

  useEffect(() => {
    loadVisit();
    loadLookupOptions();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visitId]);

  const loadVisit = async () => {
    try {
      const data = await visitApi.getVisitById(visitId);
      setVisit(data);
      // Pre-populate editable fields
      if (data.callType)    setCallType(data.callType);
      if (data.callOutcome) setVisitOutcome(data.callOutcome);
      if (data.nextActionPlan) setRemarks(data.nextActionPlan);
      setIsOrderBooked(data.isOrderBooked ?? false);
      if (data.orderValue != null) setOrderValue(String(data.orderValue));
      if (data.samples?.length) {
        setSamples(data.samples.map(s => ({
          productId: s.productId,
          productName: s.productName,
          quantity: s.quantity,
        })));
      }
    } catch {
      showAlert('Error', 'Failed to load visit details.');
      navigation.goBack();
    } finally {
      setLoadingVisit(false);
    }
  };

  const loadLookupOptions = async () => {
    try {
      const data = await lookupApi.getMultipleCategories(['CallType', 'VisitOutcome']);
      if (data.CallType?.length)    setCallTypes(data.CallType);
      if (data.VisitOutcome?.length) setVisitOutcomes(data.VisitOutcome);
    } catch {
      // fallback values already in state
    }
  };

  // ── Product search ───────────────────────────────────────────────────────
  const searchProducts = async (query: string) => {
    setProductQuery(query);
    if (query.length < 2) { setProductResults([]); setShowProductDrop(false); return; }
    setSearchingProduct(true);
    setShowProductDrop(true);
    try {
      const res = await productApi.searchProducts(query);
      setProductResults(res || []);
    } catch {
      // ignore
    } finally {
      setSearchingProduct(false);
    }
  };

  const addSample = (p: Product) => {
    if (!samples.find(s => s.productId === p.id)) {
      setSamples(prev => [...prev, { productId: p.id, productName: p.productName, quantity: 1 }]);
    }
    setShowProductDrop(false);
    setProductQuery('');
    setProductResults([]);
  };

  // ── Save ─────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    try {
      await visitApi.updateVisit(visitId, {
        callType,
        callOutcome: visitOutcome,
        nextActionPlan: remarks.trim() || undefined,
        isOrderBooked,
        orderValue: isOrderBooked && orderValue ? parseFloat(orderValue) : undefined,
        samples: samples.map(s => ({ productId: s.productId, quantity: s.quantity })),
      });
      showAlert('Saved', 'Visit updated successfully.', () =>
        (navigation as any).navigate('DCR', { screen: 'CreateDCR' })
      );
    } catch (err: any) {
      showAlert('Error', err.response?.data?.message || 'Failed to update visit.');
    } finally {
      setSaving(false);
    }
  };

  if (loadingVisit || !visit) {
    return <Loading visible message="Loading visit..." />;
  }

  const partyName = visit.doctorName || visit.chemistShopName || visit.chemistName || 'Unknown';
  const partyMeta = [
    visit.doctorSpecialty,
    visit.visitType,
  ].filter(Boolean).join(' • ');

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Locked Info Banner ── */}
        <View style={styles.lockedCard}>
          <View style={styles.lockedHeader}>
            <MaterialCommunityIcons name="lock-outline" size={14} color={COLORS.textSecondary} />
            <Text style={styles.lockedHeaderText}>VISIT DETAILS — LOCKED</Text>
          </View>

          <View style={styles.lockedRow}>
            <MaterialCommunityIcons name={visit.visitType === 'Doctor' ? 'doctor' : 'store-outline'} size={20} color={COLORS.primary} />
            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text style={styles.lockedName}>{partyName}</Text>
              {partyMeta ? <Text style={styles.lockedMeta}>{partyMeta}</Text> : null}
            </View>
          </View>

          <View style={styles.lockedDivider} />

          <View style={styles.lockedRow}>
            <MaterialCommunityIcons name="clock-outline" size={18} color={COLORS.textSecondary} />
            <Text style={styles.lockedValue}>
              {formatDate(visit.visitDateTime, 'dd MMM yyyy')}
              {'  '}
              {visit.checkInTime ? formatTime(visit.checkInTime) : '—'}
              {visit.checkOutTime ? ` → ${formatTime(visit.checkOutTime)}` : ''}
            </Text>
          </View>

          {visit.visitDurationMinutes > 0 && (
            <View style={[styles.lockedRow, { marginTop: 4 }]}>
              <MaterialCommunityIcons name="timer-outline" size={18} color={COLORS.textSecondary} />
              <Text style={styles.lockedValue}>{visit.visitDurationMinutes} min duration</Text>
            </View>
          )}
        </View>

        {/* ── Editable Fields ── */}
        <View style={styles.card}>

          {/* Call Type + Visit Outcome */}
          <View style={styles.twoCol}>
            <View style={{ flex: 1 }}>
              <SectionLabel label="Call Type" />
              <TouchableOpacity style={styles.selectRow} onPress={() => setShowCallTypePicker(true)}>
                <Text style={styles.selectText} numberOfLines={1}>{callType}</Text>
                <MaterialCommunityIcons name="chevron-down" size={18} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={{ width: 12 }} />
            <View style={{ flex: 1 }}>
              <SectionLabel label="Visit Outcome" />
              <TouchableOpacity style={styles.selectRow} onPress={() => setShowOutcomePicker(true)}>
                <Text style={styles.selectText} numberOfLines={1}>{visitOutcome}</Text>
                <MaterialCommunityIcons name="chevron-down" size={18} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Samples */}
          <View style={styles.group}>
            <SectionLabel label="Samples Given" />
            <View style={styles.inputRow}>
              <MaterialCommunityIcons name="magnify" size={20} color={COLORS.textSecondary} />
              <TextInput
                style={styles.innerInput}
                placeholder="Search product to add..."
                placeholderTextColor={COLORS.textSecondary}
                value={productQuery}
                onChangeText={searchProducts}
              />
              {searchingProduct && <ActivityIndicator size="small" color={COLORS.primary} />}
            </View>

            {showProductDrop && productResults.length > 0 && (
              <View style={styles.dropdown}>
                {productResults.slice(0, 5).map(p => (
                  <TouchableOpacity key={p.id} style={styles.dropdownItem} onPress={() => addSample(p)}>
                    <Text style={styles.dropdownItemText}>{p.productName}</Text>
                    {p.packSize ? <Text style={styles.dropdownItemSub}>{p.packSize}</Text> : null}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {samples.length > 0 && (
              <View style={styles.samplesList}>
                {samples.map((s, idx) => (
                  <View
                    key={s.productId}
                    style={[styles.sampleRow, idx < samples.length - 1 && styles.sampleRowBorder]}
                  >
                    <Text style={styles.sampleName} numberOfLines={1}>{s.productName}</Text>
                    <View style={styles.sampleControls}>
                      <TextInput
                        style={styles.qtyInput}
                        keyboardType="numeric"
                        value={String(s.quantity)}
                        onChangeText={v =>
                          setSamples(samples.map(x =>
                            x.productId === s.productId ? { ...x, quantity: parseInt(v) || 1 } : x
                          ))
                        }
                      />
                      <TouchableOpacity onPress={() => setSamples(samples.filter(x => x.productId !== s.productId))}>
                        <MaterialCommunityIcons name="delete-outline" size={20} color={COLORS.error} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Order Booked */}
          <View style={styles.group}>
            <SectionLabel label="Is Order Booked?" />
            <View style={styles.radioRow}>
              <TouchableOpacity style={styles.radioOpt} onPress={() => setIsOrderBooked(true)}>
                <MaterialCommunityIcons
                  name={isOrderBooked ? 'radiobox-marked' : 'radiobox-blank'}
                  size={22}
                  color={isOrderBooked ? COLORS.primary : COLORS.textSecondary}
                />
                <Text style={styles.radioLabel}>Yes</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.radioOpt} onPress={() => setIsOrderBooked(false)}>
                <MaterialCommunityIcons
                  name={!isOrderBooked ? 'radiobox-marked' : 'radiobox-blank'}
                  size={22}
                  color={!isOrderBooked ? COLORS.primary : COLORS.textSecondary}
                />
                <Text style={styles.radioLabel}>No</Text>
              </TouchableOpacity>
            </View>
          </View>

          {isOrderBooked && (
            <View style={styles.group}>
              <SectionLabel label="Order Value (₹)" />
              <View style={styles.inputRow}>
                <Text style={[styles.inputText, { color: COLORS.textSecondary }]}>₹</Text>
                <TextInput
                  style={[styles.innerInput, { marginLeft: 4 }]}
                  placeholder="Enter total amount..."
                  placeholderTextColor={COLORS.textSecondary}
                  keyboardType="decimal-pad"
                  value={orderValue}
                  onChangeText={setOrderValue}
                />
              </View>
            </View>
          )}

          {/* Remarks */}
          <View style={styles.group}>
            <SectionLabel label="Remarks / Next Steps" />
            <TextInput
              style={styles.textarea}
              placeholder="Add any specific requests or feedback..."
              placeholderTextColor={COLORS.textSecondary}
              multiline
              numberOfLines={3}
              value={remarks}
              onChangeText={setRemarks}
              textAlignVertical="top"
            />
          </View>

          <Button title="Save Changes" onPress={handleSave} loading={saving} style={styles.saveBtn} />
        </View>
      </ScrollView>

      {/* Picker Modals */}
      <PickerModal
        visible={showCallTypePicker}
        title="Call Type"
        options={callTypes}
        selected={callType}
        onSelect={v => { setCallType(v); setShowCallTypePicker(false); }}
        onClose={() => setShowCallTypePicker(false)}
      />
      <PickerModal
        visible={showOutcomePicker}
        title="Visit Outcome"
        options={visitOutcomes}
        selected={visitOutcome}
        onSelect={v => { setVisitOutcome(v); setShowOutcomePicker(false); }}
        onClose={() => setShowOutcomePicker(false)}
      />

      <Loading visible={saving} message="Saving changes..." />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.backgroundGray,
  },
  content: {
    padding: SIZES.paddingMD,
    paddingBottom: SIZES.paddingXL,
  },

  // Locked info banner
  lockedCard: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusLG,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SIZES.paddingMD,
    marginBottom: SIZES.paddingMD,
  },
  lockedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: SIZES.paddingSM,
  },
  lockedHeaderText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textSecondary,
    letterSpacing: 0.8,
  },
  lockedRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lockedName: {
    fontSize: SIZES.fontMD,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  lockedMeta: {
    fontSize: SIZES.fontXS,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  lockedValue: {
    fontSize: SIZES.fontSM,
    color: COLORS.textSecondary,
    marginLeft: 8,
  },
  lockedDivider: {
    height: 1,
    backgroundColor: COLORS.divider,
    marginVertical: SIZES.paddingSM,
  },

  // Editable card
  card: {
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radiusLG,
    padding: SIZES.paddingMD,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  group: {
    marginBottom: SIZES.paddingMD,
  },
  label: {
    fontSize: SIZES.fontXS,
    fontWeight: '600',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  twoCol: {
    flexDirection: 'row',
    marginBottom: SIZES.paddingMD,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundGray,
    borderRadius: SIZES.radiusSM,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SIZES.paddingMD,
    paddingVertical: 11,
    gap: 10,
  },
  inputText: {
    fontSize: SIZES.fontMD,
    color: COLORS.textPrimary,
  },
  innerInput: {
    flex: 1,
    fontSize: SIZES.fontMD,
    color: COLORS.textPrimary,
    padding: 0,
  },
  selectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.backgroundGray,
    borderRadius: SIZES.radiusSM,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SIZES.paddingMD,
    paddingVertical: 12,
  },
  selectText: {
    fontSize: SIZES.fontMD,
    color: COLORS.textPrimary,
    flex: 1,
  },

  // Dropdown
  dropdown: {
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radiusSM,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 4,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    zIndex: 10,
  },
  dropdownItem: {
    paddingHorizontal: SIZES.paddingMD,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  dropdownItemText: {
    fontSize: SIZES.fontSM,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  dropdownItemSub: {
    fontSize: SIZES.fontXS,
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  // Samples
  samplesList: {
    marginTop: 8,
    backgroundColor: COLORS.backgroundGray,
    borderRadius: SIZES.radiusSM,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  sampleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 7,
  },
  sampleRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
    borderStyle: 'dashed',
  },
  sampleName: {
    flex: 1,
    fontSize: SIZES.fontSM,
    fontWeight: '500',
    color: COLORS.textPrimary,
    marginRight: 8,
  },
  sampleControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  qtyInput: {
    width: 48,
    height: 30,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 4,
    textAlign: 'center',
    fontSize: SIZES.fontSM,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.background,
    padding: 0,
  },

  // Radio
  radioRow: {
    flexDirection: 'row',
    gap: 24,
  },
  radioOpt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  radioLabel: {
    fontSize: SIZES.fontMD,
    color: COLORS.textPrimary,
  },

  // Textarea
  textarea: {
    backgroundColor: COLORS.backgroundGray,
    borderRadius: SIZES.radiusSM,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SIZES.paddingMD,
    fontSize: SIZES.fontMD,
    color: COLORS.textPrimary,
    minHeight: 80,
  },
  saveBtn: {
    marginTop: SIZES.paddingSM,
  },

  // Picker modal
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerCard: {
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radiusLG,
    width: '85%',
    overflow: 'hidden',
  },
  pickerTitle: {
    fontSize: SIZES.fontLG,
    fontWeight: '700',
    color: COLORS.textPrimary,
    padding: SIZES.paddingMD,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.paddingMD,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  pickerRowActive: {
    backgroundColor: COLORS.primaryLight,
  },
  pickerRowText: {
    fontSize: SIZES.fontMD,
    color: COLORS.textPrimary,
  },
  pickerRowTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
});

export default VisitEditScreen;
