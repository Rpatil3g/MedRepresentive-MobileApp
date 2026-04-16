import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Geolocation from 'react-native-geolocation-service';
import { format } from 'date-fns';
import { Button, Loading } from '../../components/common';
import { useAppDispatch } from '../../store/hooks';
import { addVisit } from '../../store/slices/visitSlice';
import { visitApi, doctorApi, productApi, lookupApi } from '../../services/api';
import { Doctor } from '../../types/doctor.types';
import { Product } from '../../types/product.types';
import { VisitStackParamList } from '../../types/navigation.types';
import { COLORS, SIZES } from '../../constants';
import { requestLocationPermission, showAlert } from '../../utils/helpers';

type VisitCheckInRouteProp = RouteProp<VisitStackParamList, 'VisitCheckIn'>;

interface SampleItem {
  productId: string;
  productName: string;
  quantity: number;
}

interface PartyOption {
  id: string;
  name: string;
  details: string;
  geoLocation?: { latitude: number; longitude: number };
}

// Geo-fence threshold — warn the MR if they are farther than this from the clinic
const GEO_WARN_THRESHOLD_M = 500;

/** Haversine formula — returns distance between two coordinates in metres */
const haversineDistance = (
  lat1: number, lon1: number,
  lat2: number, lon2: number,
): number => {
  const R = 6371000;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// Fallback values used while the API response is loading or if it fails.
// These are NOT the source of truth — Master.LookupValues table is.
const FALLBACK_VISIT_TYPES  = ['Doctor / Clinic', 'Chemist / Pharmacy'];
const FALLBACK_CALL_TYPES   = ['Routine', 'Follow Up', 'Campaign', 'Cold Call'];
const FALLBACK_VISIT_OUTCOMES = ['Met', 'Not Available', 'Busy / Refused', 'On Leave'];

// ─── Reusable Picker Modal ───────────────────────────────────────────────────

interface PickerModalProps {
  visible: boolean;
  title: string;
  options: string[];
  selected: string;
  onSelect: (value: string) => void;
  onClose: () => void;
}

const PickerModal: React.FC<PickerModalProps> = ({
  visible,
  title,
  options,
  selected,
  onSelect,
  onClose,
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

// ─── Section Header ──────────────────────────────────────────────────────────

const SectionLabel: React.FC<{ label: string }> = ({ label }) => (
  <Text style={styles.label}>{label}</Text>
);

// ─── Main Screen ─────────────────────────────────────────────────────────────

const VisitCheckInScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute<VisitCheckInRouteProp>();
  const dispatch = useAppDispatch();

  const { doctorId, chemistId } = route.params || {};

  // ── Lookup options (fetched from API; fallbacks used until loaded)
  const [visitTypes, setVisitTypes]     = useState<string[]>(FALLBACK_VISIT_TYPES);
  const [callTypes, setCallTypes]       = useState<string[]>(FALLBACK_CALL_TYPES);
  const [visitOutcomes, setVisitOutcomes] = useState<string[]>(FALLBACK_VISIT_OUTCOMES);

  // ── Form state
  const [visitDateTime, setVisitDateTime] = useState(new Date());
  const [visitType, setVisitType] = useState(FALLBACK_VISIT_TYPES[0]);
  const [selectedParty, setSelectedParty] = useState<PartyOption | null>(null);
  const [callType, setCallType] = useState('Routine');
  const [visitOutcome, setVisitOutcome] = useState('Met');
  const [samples, setSamples] = useState<SampleItem[]>([]);
  const [isOrderBooked, setIsOrderBooked] = useState(false);
  const [orderValue, setOrderValue] = useState('');
  const [remarks, setRemarks] = useState('');

  // ── Location state
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [distanceMeters, setDistanceMeters] = useState<number | null>(null);

  // ── Loading
  const [saving, setSaving] = useState(false);

  // ── Picker modals
  const [showVisitTypePicker, setShowVisitTypePicker] = useState(false);
  const [showCallTypePicker, setShowCallTypePicker] = useState(false);
  const [showOutcomePicker, setShowOutcomePicker] = useState(false);

  // ── Date-time modal
  const [showDateModal, setShowDateModal] = useState(false);
  const [dateInput, setDateInput] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [timeInput, setTimeInput] = useState(format(new Date(), 'HH:mm'));

  // ── Party search modal
  const [showPartyModal, setShowPartyModal] = useState(false);
  const [partyQuery, setPartyQuery] = useState('');
  const [partyResults, setPartyResults] = useState<PartyOption[]>([]);
  const [searchingParty, setSearchingParty] = useState(false);

  // ── Product search
  const [productQuery, setProductQuery] = useState('');
  const [productResults, setProductResults] = useState<Product[]>([]);
  const [showProductDrop, setShowProductDrop] = useState(false);
  const [searchingProduct, setSearchingProduct] = useState(false);

  // ── Geo-fence: recompute distance whenever MR location or selected party changes
  useEffect(() => {
    if (location && selectedParty?.geoLocation) {
      const d = haversineDistance(
        location.latitude,
        location.longitude,
        selectedParty.geoLocation.latitude,
        selectedParty.geoLocation.longitude,
      );
      setDistanceMeters(d);
    } else {
      setDistanceMeters(null);
    }
  }, [location, selectedParty]);

  // ── Init
  useEffect(() => {
    getCurrentLocation();
    loadLookupOptions();
    if (doctorId) {
      loadPreselectedDoctor(doctorId);
    } else if (chemistId) {
      setVisitType('Chemist / Pharmacy');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadLookupOptions = async () => {
    try {
      const data = await lookupApi.getMultipleCategories([
        'VisitType',
        'CallType',
        'VisitOutcome',
      ]);
      if (data.VisitType?.length)   setVisitTypes(data.VisitType);
      if (data.CallType?.length)    setCallTypes(data.CallType);
      if (data.VisitOutcome?.length) setVisitOutcomes(data.VisitOutcome);

      // Ensure selected defaults exist in the new list
      setVisitType(v => data.VisitType?.includes(v) ? v : (data.VisitType?.[0] ?? v));
      setCallType(v => data.CallType?.includes(v) ? v : (data.CallType?.[0] ?? v));
      setVisitOutcome(v => data.VisitOutcome?.includes(v) ? v : (data.VisitOutcome?.[0] ?? v));
    } catch {
      // Network error — fallback values already in state, no action needed
    }
  };

  const loadPreselectedDoctor = async (id: string) => {
    try {
      const d = await doctorApi.getDoctorById(id);
      setSelectedParty({
        id: d.id,
        name: d.doctorName,
        details: [d.specialty, d.clinicName, d.address].filter(Boolean).join(' • '),
        geoLocation: d.geoLocation,
      });
    } catch (e) {
      console.error('loadPreselectedDoctor:', e);
    }
  };

  const getCurrentLocation = async () => {
    const ok = await requestLocationPermission();
    if (!ok) return;
    setGettingLocation(true);
    Geolocation.getCurrentPosition(
      pos => {
        setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        setGettingLocation(false);
      },
      () => setGettingLocation(false),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  };

  // ── Party search
  const searchParties = async (query: string) => {
    setPartyQuery(query);
    if (query.length < 2) { setPartyResults([]); return; }
    setSearchingParty(true);
    try {
      if (visitType === 'Doctor / Clinic') {
        const res = await doctorApi.searchDoctors(query);
        setPartyResults((res || []).map((d: Doctor) => ({
          id: d.id,
          name: d.doctorName,
          details: [d.specialty, d.clinicName, d.address].filter(Boolean).join(' • '),
          geoLocation: d.geoLocation,
        })));
      }
    } catch (e) {
      console.error('searchParties:', e);
    } finally {
      setSearchingParty(false);
    }
  };

  const selectParty = (party: PartyOption) => {
    setSelectedParty(party);
    setShowPartyModal(false);
    setPartyQuery('');
    setPartyResults([]);
  };

  // ── Product search
  const searchProducts = async (query: string) => {
    setProductQuery(query);
    if (query.length < 2) { setProductResults([]); setShowProductDrop(false); return; }
    setSearchingProduct(true);
    setShowProductDrop(true);
    try {
      const res = await productApi.searchProducts(query);
      setProductResults(res || []);
    } catch (e) {
      console.error('searchProducts:', e);
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

  // ── Date-time
  const applyDateTime = () => {
    try {
      const dt = new Date(`${dateInput}T${timeInput}:00`);
      if (!isNaN(dt.getTime())) setVisitDateTime(dt);
    } catch { /* ignore */ }
    setShowDateModal(false);
  };

  // ── Save
  const handleSave = async () => {
    if (!location) {
      showAlert('Location Required', 'Please wait for location to be captured');
      return;
    }
    if (!selectedParty) {
      showAlert('Party Required', 'Please select a doctor or chemist');
      return;
    }
    setSaving(true);
    try {
      const isDoctorType = visitType === 'Doctor / Clinic';
      const visit = await visitApi.createVisit({
        doctorId: isDoctorType ? selectedParty.id : undefined,
        chemistId: !isDoctorType ? selectedParty.id : undefined,
        visitDateTime: visitDateTime.toISOString(),
        latitude: location.latitude,
        longitude: location.longitude,
        isPlannedVisit: false,
        visitType: isDoctorType ? 'Doctor' : 'Chemist',
        callType,
        callOutcome: visitOutcome,
        isOrderBooked,
        orderValue: isOrderBooked && orderValue ? parseFloat(orderValue) : undefined,
        nextActionPlan: remarks,
        samples: samples.map(s => ({ productId: s.productId, quantity: s.quantity })),
      });
      dispatch(addVisit(visit));
      showAlert('Success', 'Visit logged successfully!', () => navigation.goBack());
    } catch (err: any) {
      showAlert('Error', err.response?.data?.message || 'Failed to save visit. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────

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
        <View style={styles.card}>

          {/* ── Visit Date & Time ── */}
          <View style={styles.group}>
            <SectionLabel label="Visit Date & Time" />
            <TouchableOpacity style={styles.inputRow} onPress={() => setShowDateModal(true)}>
              <MaterialCommunityIcons name="clock-outline" size={20} color={COLORS.textSecondary} />
              <Text style={[styles.inputText, { flex: 1 }]}>
                {format(visitDateTime, 'dd MMM yyyy, hh:mm a')}
              </Text>
              <MaterialCommunityIcons name="pencil-outline" size={16} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* ── Location ── */}
          <View style={styles.group}>
            <SectionLabel label="Location Check-in" />
            <View style={[styles.inputRow, location ? styles.inputRowSuccess : null]}>
              <MaterialCommunityIcons
                name="crosshairs-gps"
                size={20}
                color={location ? COLORS.success : COLORS.textSecondary}
              />
              {gettingLocation ? (
                <>
                  <ActivityIndicator size="small" color={COLORS.primary} style={{ marginHorizontal: 8 }} />
                  <Text style={[styles.inputText, { color: COLORS.textSecondary }]}>Fetching location...</Text>
                </>
              ) : location ? (
                <Text style={[styles.inputText, { color: COLORS.success, flex: 1, fontWeight: '500' }]} numberOfLines={1}>
                  {location.latitude.toFixed(4)}° N, {location.longitude.toFixed(4)}° E
                </Text>
              ) : (
                <TouchableOpacity style={{ flex: 1 }} onPress={getCurrentLocation}>
                  <Text style={[styles.inputText, { color: COLORS.error }]}>Tap to retry</Text>
                </TouchableOpacity>
              )}
            </View>
            {location && (
              <Text style={styles.hintSuccess}>
                <MaterialCommunityIcons name="check-circle" size={11} color={COLORS.success} /> Auto-fetched on load
              </Text>
            )}
          </View>

          {/* ── Visit Type ── */}
          <View style={styles.group}>
            <SectionLabel label="Visit Type" />
            <TouchableOpacity style={styles.selectRow} onPress={() => setShowVisitTypePicker(true)}>
              <Text style={styles.selectText}>{visitType}</Text>
              <MaterialCommunityIcons name="chevron-down" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* ── Select Party ── */}
          <View style={[styles.group, selectedParty ? styles.groupNoBottom : null]}>
            <SectionLabel label="Select Party" />
            <TouchableOpacity style={styles.selectRow} onPress={() => setShowPartyModal(true)}>
              <Text
                style={[styles.selectText, !selectedParty && { color: COLORS.textSecondary }]}
                numberOfLines={1}
              >
                {selectedParty ? selectedParty.name : '— Choose from Call Plan —'}
              </Text>
              <MaterialCommunityIcons name="magnify" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* ── Party Details (auto-populated) ── */}
          {selectedParty?.details ? (
            <View style={styles.partyDetailsBox}>
              <Text style={styles.partyDetailsText}>{selectedParty.details}</Text>
            </View>
          ) : null}

          {/* ── Geo-fence Warning ── */}
          {distanceMeters !== null && distanceMeters > GEO_WARN_THRESHOLD_M && (
            <View style={styles.distanceWarning}>
              <MaterialCommunityIcons name="map-marker-alert" size={18} color="#92400e" />
              <Text style={styles.distanceWarningText}>
                You are{' '}
                {distanceMeters >= 1000
                  ? `${(distanceMeters / 1000).toFixed(1)} km`
                  : `${Math.round(distanceMeters)} m`}{' '}
                away from this {visitType === 'Doctor / Clinic' ? 'clinic' : 'pharmacy'}. Visit will still be logged.
              </Text>
            </View>
          )}

          {/* ── Call Type + Visit Status (2-col) ── */}
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
              <SectionLabel label="Visit Status" />
              <TouchableOpacity style={styles.selectRow} onPress={() => setShowOutcomePicker(true)}>
                <Text style={styles.selectText} numberOfLines={1}>{visitOutcome}</Text>
                <MaterialCommunityIcons name="chevron-down" size={18} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Samples Given ── */}
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

            {/* Dropdown */}
            {showProductDrop && productResults.length > 0 && (
              <View style={styles.dropdown}>
                {productResults.slice(0, 5).map(p => (
                  <TouchableOpacity
                    key={p.id}
                    style={styles.dropdownItem}
                    onPress={() => addSample(p)}
                  >
                    <Text style={styles.dropdownItemText}>{p.productName}</Text>
                    {p.packSize ? (
                      <Text style={styles.dropdownItemSub}>{p.packSize}</Text>
                    ) : null}
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Selected samples list */}
            {samples.length > 0 && (
              <View style={styles.samplesList}>
                {samples.map((s, idx) => (
                  <View
                    key={s.productId}
                    style={[
                      styles.sampleRow,
                      idx < samples.length - 1 && styles.sampleRowBorder,
                    ]}
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

          {/* ── Is Order Booked? ── */}
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

          {/* ── Order Value (conditional) ── */}
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

          {/* ── Remarks / Next Steps ── */}
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

          {/* ── Save Button ── */}
          <Button
            title="Save Visit Details"
            onPress={handleSave}
            loading={saving}
            style={styles.saveBtn}
          />
        </View>
      </ScrollView>

      {/* ── Date-Time Modal ── */}
      <Modal visible={showDateModal} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setShowDateModal(false)} activeOpacity={1}>
          <TouchableOpacity style={styles.dateCard} activeOpacity={1}>
            <Text style={styles.pickerTitle}>Set Visit Date & Time</Text>
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalSubLabel}>Date (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.modalInput}
                  value={dateInput}
                  onChangeText={setDateInput}
                  placeholder="2025-01-01"
                  placeholderTextColor={COLORS.textSecondary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalSubLabel}>Time (HH:MM)</Text>
                <TextInput
                  style={styles.modalInput}
                  value={timeInput}
                  onChangeText={setTimeInput}
                  placeholder="09:30"
                  placeholderTextColor={COLORS.textSecondary}
                />
              </View>
            </View>
            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowDateModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirmBtn} onPress={applyDateTime}>
                <Text style={styles.modalConfirmText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ── Party Search Modal ── */}
      <Modal visible={showPartyModal} animationType="slide">
        <View style={styles.searchModalRoot}>
          <View style={styles.searchModalHeader}>
            <TouchableOpacity
              onPress={() => { setShowPartyModal(false); setPartyQuery(''); setPartyResults([]); }}
            >
              <MaterialCommunityIcons name="close" size={24} color={COLORS.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.searchModalTitle}>
              Select {visitType.split(' / ')[0]}
            </Text>
            <View style={{ width: 24 }} />
          </View>

          <View style={[styles.inputRow, { margin: SIZES.paddingMD }]}>
            <MaterialCommunityIcons name="magnify" size={20} color={COLORS.textSecondary} />
            <TextInput
              style={[styles.innerInput, { flex: 1 }]}
              placeholder={`Search ${visitType.split(' / ')[0].toLowerCase()}...`}
              placeholderTextColor={COLORS.textSecondary}
              value={partyQuery}
              onChangeText={searchParties}
              autoFocus
            />
            {searchingParty && <ActivityIndicator size="small" color={COLORS.primary} />}
          </View>

          <FlatList
            data={partyResults}
            keyExtractor={item => item.id}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.partyResultItem} onPress={() => selectParty(item)}>
                <MaterialCommunityIcons
                  name={visitType === 'Doctor / Clinic' ? 'doctor' : 'pharmacy'}
                  size={20}
                  color={COLORS.primary}
                />
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={styles.partyResultName}>{item.name}</Text>
                  {item.details ? (
                    <Text style={styles.partyResultDetails} numberOfLines={1}>{item.details}</Text>
                  ) : null}
                </View>
                <MaterialCommunityIcons name="chevron-right" size={18} color={COLORS.textSecondary} />
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <Text style={styles.emptyText}>
                {partyQuery.length < 2
                  ? 'Type at least 2 characters to search'
                  : searchingParty
                    ? ''
                    : 'No results found'}
              </Text>
            }
          />
        </View>
      </Modal>

      {/* ── Picker Modals ── */}
      <PickerModal
        visible={showVisitTypePicker}
        title="Visit Type"
        options={visitTypes}
        selected={visitType}
        onSelect={v => { setVisitType(v); setSelectedParty(null); setShowVisitTypePicker(false); }}
        onClose={() => setShowVisitTypePicker(false)}
      />
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
        title="Visit Status"
        options={visitOutcomes}
        selected={visitOutcome}
        onSelect={v => { setVisitOutcome(v); setShowOutcomePicker(false); }}
        onClose={() => setShowOutcomePicker(false)}
      />

      <Loading visible={saving} message="Saving visit..." />
    </KeyboardAvoidingView>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.backgroundGray,
  },
  content: {
    padding: SIZES.paddingMD,
    paddingBottom: SIZES.paddingXL,
  },
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

  // Form groups
  group: {
    marginBottom: SIZES.paddingMD,
  },
  groupNoBottom: {
    marginBottom: 4,
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

  // Input row (icon + text)
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
  inputRowSuccess: {
    backgroundColor: '#f0fdf4',
    borderColor: '#a7f3d0',
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
  hintSuccess: {
    fontSize: SIZES.fontXS,
    color: COLORS.success,
    marginTop: 4,
  },

  // Select row
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

  // Party auto-populated detail
  partyDetailsBox: {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusSM,
    paddingHorizontal: SIZES.paddingMD,
    paddingVertical: 8,
    marginBottom: SIZES.paddingMD,
  },
  partyDetailsText: {
    fontSize: SIZES.fontSM,
    color: COLORS.textSecondary,
  },

  // Geo-fence distance warning
  distanceWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fcd34d',
    borderRadius: SIZES.radiusSM,
    paddingHorizontal: SIZES.paddingMD,
    paddingVertical: 10,
    marginBottom: SIZES.paddingMD,
    gap: 8,
  },
  distanceWarningText: {
    flex: 1,
    fontSize: SIZES.fontSM,
    color: '#92400e',
    lineHeight: 18,
  },

  // Product search dropdown
  dropdown: {
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radiusSM,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
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

  // Samples list
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

  // Radio buttons
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

  // Save button
  saveBtn: {
    marginTop: SIZES.paddingSM,
  },

  // ── Modal shared ──
  modalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Picker modal
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

  // Date modal
  dateCard: {
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radiusLG,
    padding: SIZES.paddingMD,
    width: '90%',
  },
  modalSubLabel: {
    fontSize: SIZES.fontXS,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radiusSM,
    paddingHorizontal: SIZES.paddingSM,
    paddingVertical: 9,
    fontSize: SIZES.fontMD,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.backgroundGray,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: SIZES.radiusSM,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: SIZES.fontMD,
    color: COLORS.textSecondary,
    fontWeight: '500',
  },
  modalConfirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: SIZES.radiusSM,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  modalConfirmText: {
    fontSize: COLORS.textWhite === '#FFFFFF' ? SIZES.fontMD : SIZES.fontMD,
    color: COLORS.textWhite,
    fontWeight: '600',
  },

  // Party search modal
  searchModalRoot: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  searchModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.paddingMD,
    paddingVertical: SIZES.paddingMD,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  searchModalTitle: {
    fontSize: SIZES.fontLG,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  partyResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.paddingMD,
    paddingVertical: SIZES.paddingMD,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  partyResultName: {
    fontSize: SIZES.fontMD,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  partyResultDetails: {
    fontSize: SIZES.fontXS,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  emptyText: {
    textAlign: 'center',
    color: COLORS.textSecondary,
    fontSize: SIZES.fontMD,
    padding: SIZES.paddingLG,
  },
});

export default VisitCheckInScreen;
