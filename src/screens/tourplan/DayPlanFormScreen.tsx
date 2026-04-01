import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TouchableWithoutFeedback,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Button } from '../../components/common';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { upsertDraftEntry, removeDraftEntry } from '../../store/slices/tourPlanSlice';
import axiosInstance from '../../services/api/axiosInstance';
import { API_CONFIG } from '../../config/api.config';
import { COLORS, SIZES } from '../../constants';
import { ActivityType, DraftDayEntry, LeaveType } from '../../types/tourPlan.types';
import { TourPlanStackParamList } from '../../types/navigation.types';

type RouteProps = RouteProp<TourPlanStackParamList, 'DayPlanForm'>;
interface Option { id: string; name: string; }

// ── Token colours matching the sample UI exactly ──────────────────────────────
const C = {
  pageBg:      COLORS.backgroundGray,  // #f8fafc — page background
  cardBg:      COLORS.background,      // #ffffff — card background
  inputBg:     COLORS.backgroundGray,  // #f8fafc — input/dropdown fill
  border:      COLORS.border,          // #e2e8f0
  primary:     COLORS.primary,         // #2563eb
  primaryLight: COLORS.primaryLight,   // #eff6ff
  textDark:    COLORS.textPrimary,     // #0f172a
  textMuted:   COLORS.textSecondary,   // #64748b
  danger:      COLORS.error,           // #ef4444
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];

function parseDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}
function fmtDisplay(iso: string) {
  const dt = parseDate(iso);
  return `${String(dt.getDate()).padStart(2,'0')}-${String(dt.getMonth()+1).padStart(2,'0')}-${dt.getFullYear()}`;
}
function toISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// ─── Calendar Modal ───────────────────────────────────────────────────────────
const CalendarModal: React.FC<{
  visible: boolean;
  currentISO: string;
  onSelect: (iso: string) => void;
  onClose: () => void;
}> = ({ visible, currentISO, onSelect, onClose }) => {
  const today     = new Date();
  const [view, setView] = useState(() => parseDate(currentISO));

  const year  = view.getFullYear();
  const month = view.getMonth();
  const selected = parseDate(currentISO);

  const firstDay     = new Date(year, month, 1).getDay();
  const daysInMonth  = new Date(year, month + 1, 0).getDate();
  const cells        = firstDay + daysInMonth;
  const rows         = Math.ceil(cells / 7);

  const prevMonth = () => setView(new Date(year, month - 1, 1));
  const nextMonth = () => setView(new Date(year, month + 1, 1));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={cal.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={cal.sheet}>
          {/* Header */}
          <View style={cal.header}>
            <TouchableOpacity onPress={prevMonth} style={cal.navBtn}>
              <MaterialCommunityIcons name="chevron-left" size={22} color={C.textDark} />
            </TouchableOpacity>
            <Text style={cal.monthTitle}>{MONTHS[month]} {year}</Text>
            <TouchableOpacity onPress={nextMonth} style={cal.navBtn}>
              <MaterialCommunityIcons name="chevron-right" size={22} color={C.textDark} />
            </TouchableOpacity>
          </View>

          {/* Day labels */}
          <View style={cal.row}>
            {DAYS.map(d => (
              <Text key={d} style={cal.dayLabel}>{d}</Text>
            ))}
          </View>

          {/* Date grid */}
          {Array.from({ length: rows }).map((_, ri) => (
            <View key={ri} style={cal.row}>
              {Array.from({ length: 7 }).map((__, ci) => {
                const cellIdx = ri * 7 + ci;
                const day     = cellIdx - firstDay + 1;
                const valid   = day >= 1 && day <= daysInMonth;
                const dt      = valid ? new Date(year, month, day) : null;
                const iso     = dt ? toISO(dt) : '';
                const isToday = dt && toISO(dt) === toISO(today);
                const isSel   = iso === currentISO;
                return (
                  <TouchableOpacity
                    key={ci}
                    style={[cal.cell, isSel && cal.cellSel, isToday && !isSel && cal.cellToday]}
                    disabled={!valid}
                    onPress={() => { if (iso) { onSelect(iso); onClose(); } }}
                  >
                    <Text style={[cal.cellText, isSel && cal.cellTextSel, !valid && cal.cellTextEmpty]}>
                      {valid ? day : ''}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}

          <TouchableOpacity style={cal.closeBtn} onPress={onClose}>
            <Text style={cal.closeBtnText}>Cancel</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

// ─── Dropdown (single-select) — collapses on outside tap via Modal backdrop ───
const Dropdown: React.FC<{
  placeholder: string;
  selected?: Option;
  options: Option[];
  loading?: boolean;
  onSelect: (o: Option) => void;
}> = ({ placeholder, selected, options, loading, onSelect }) => {
  const [open,    setOpen]    = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, width: 0 });
  const triggerRef            = useRef<View>(null);

  const handleOpen = () => {
    if (open) { setOpen(false); return; }
    triggerRef.current?.measure((_x, _y, width, height, pageX, pageY) => {
      setMenuPos({ top: pageY + height + 2, left: pageX, width });
      setOpen(true);
    });
  };

  const close = () => setOpen(false);

  return (
    <View>
      <TouchableOpacity ref={triggerRef as any} style={f.input} onPress={handleOpen} activeOpacity={0.8}>
        <Text style={[f.inputText, !selected && f.placeholder]}>
          {loading ? 'Loading...' : (selected?.name ?? placeholder)}
        </Text>
        <MaterialCommunityIcons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={18} color={C.textMuted}
        />
      </TouchableOpacity>

      {/* Transparent modal backdrop — tap anywhere outside to close */}
      <Modal visible={open} transparent animationType="none" onRequestClose={close}>
        <TouchableWithoutFeedback onPress={close}>
          <View style={f.modalOverlay}>
            {/* Stop the menu itself from propagating the tap to the overlay */}
            <TouchableWithoutFeedback>
              <View style={[f.menu, { position: 'absolute', top: menuPos.top, left: menuPos.left, width: menuPos.width }]}>
                {options.length === 0 ? (
                  <Text style={f.menuEmpty}>No options available</Text>
                ) : (
                  options.map(o => (
                    <TouchableOpacity
                      key={o.id}
                      style={[f.menuItem, o.id === selected?.id && f.menuItemActive]}
                      onPress={() => { onSelect(o); close(); }}
                    >
                      <Text style={[f.menuItemText, o.id === selected?.id && f.menuItemTextActive]}>
                        {o.name}
                      </Text>
                      {o.id === selected?.id && (
                        <MaterialCommunityIcons name="check" size={16} color={C.primary} />
                      )}
                    </TouchableOpacity>
                  ))
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

// ─── Multi-select with search + pills ────────────────────────────────────────
const MultiSelect: React.FC<{
  searchPlaceholder: string;
  pillBg?: string;
  pillColor?: string;
  selected: Option[];
  onSearch: (q: string) => Promise<Option[]>;
  onAdd: (o: Option) => void;
  onRemove: (id: string) => void;
}> = ({ searchPlaceholder, pillBg, pillColor, selected, onSearch, onAdd, onRemove }) => {
  const [query,    setQuery]    = useState('');
  const [results,  setResults]  = useState<Option[]>([]);
  const [busy,     setBusy]     = useState(false);
  const [open,     setOpen]     = useState(false);
  const [menuPos,  setMenuPos]  = useState({ top: 0, left: 0, width: 0 });
  const searchRef               = useRef<View>(null);

  const bg  = pillBg    ?? C.primaryLight;
  const txt = pillColor ?? C.primary;

  const doSearch = useCallback(async (text: string) => {
    setQuery(text);
    if (!text.trim()) { setResults([]); setOpen(false); return; }
    try {
      setBusy(true);
      const data = await onSearch(text);
      const filtered = data.filter(r => !selected.find(s => s.id === r.id));
      setResults(filtered);
      if (filtered.length > 0) {
        // Measure search box position for the floating results panel
        searchRef.current?.measure((_x, _y, width, height, pageX, pageY) => {
          setMenuPos({ top: pageY + height + 2, left: pageX, width });
          setOpen(true);
        });
      } else {
        setOpen(false);
      }
    } catch { setResults([]); setOpen(false); }
    finally  { setBusy(false); }
  }, [onSearch, selected]);

  const closeResults = () => { setOpen(false); };

  const pick = (o: Option) => {
    onAdd(o);
    setQuery(''); setResults([]); setOpen(false);
  };

  return (
    <View>
      {selected.length > 0 && (
        <View style={f.pills}>
          {selected.map(s => (
            <View key={s.id} style={[f.pill, { backgroundColor: bg }]}>
              <Text style={[f.pillText, { color: txt }]} numberOfLines={1}>{s.name}</Text>
              <TouchableOpacity onPress={() => onRemove(s.id)}>
                <MaterialCommunityIcons name="close" size={13} color={txt} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      <View ref={searchRef as any} style={f.searchBox}>
        <MaterialCommunityIcons name="magnify" size={18} color={C.textMuted} style={f.searchIcon} />
        <TextInput
          style={f.searchInput}
          placeholder={searchPlaceholder}
          placeholderTextColor={C.textMuted}
          value={query}
          onChangeText={doSearch}
        />
        {busy && <ActivityIndicator size="small" color={C.primary} />}
      </View>

      {/* Floating results — Modal backdrop collapses on outside tap */}
      <Modal visible={open} transparent animationType="none" onRequestClose={closeResults}>
        <TouchableWithoutFeedback onPress={closeResults}>
          <View style={f.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[f.menu, { position: 'absolute', top: menuPos.top, left: menuPos.left, width: menuPos.width }]}>
                {results.slice(0, 8).map(r => (
                  <TouchableOpacity key={r.id} style={f.menuItem} onPress={() => pick(r)}>
                    <Text style={f.menuItemText}>{r.name}</Text>
                    <MaterialCommunityIcons name="plus-circle-outline" size={18} color={C.primary} />
                  </TouchableOpacity>
                ))}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

// ─── Form field wrapper ───────────────────────────────────────────────────────
const Field: React.FC<{ label: string; required?: boolean; children: React.ReactNode }> = ({
  label, required, children,
}) => (
  <View style={f.group}>
    <Text style={f.label}>
      {label}
      {required && <Text style={f.req}> *</Text>}
    </Text>
    {children}
  </View>
);

// ─── Work type options ────────────────────────────────────────────────────────
const WORK_TYPES: { type: ActivityType; label: string }[] = [
  { type: 'FIELD_WORK', label: 'Field Work (FW)' },
  { type: 'MEETING',    label: 'Meeting / Office Work' },
  { type: 'TRAINING',   label: 'Training' },
  { type: 'LEAVE',      label: 'Leave' },
  { type: 'HOLIDAY',    label: 'Holiday' },
];

const LEAVE_OPTS: { type: LeaveType; label: string }[] = [
  { type: 'CASUAL', label: 'Casual Leave' },
  { type: 'SICK',   label: 'Sick Leave' },
  { type: 'EARNED', label: 'Paid Leave / Earned Leave' },
];

// ─── Main Screen ──────────────────────────────────────────────────────────────
const DayPlanFormScreen: React.FC = () => {
  const navigation = useNavigation();
  const route      = useRoute<RouteProps>();
  const dispatch   = useAppDispatch();
  const mrProfile  = useAppSelector(state => state.user.mrProfile);
  const { date: initDate, existingEntry } = route.params;

  const [date,           setDate]           = useState(initDate);
  const [showCal,        setShowCal]        = useState(false);
  const [activityType,   setActivityType]   = useState<ActivityType>(existingEntry?.activityType ?? 'FIELD_WORK');
  const [leaveType,      setLeaveType]      = useState<LeaveType | undefined>(existingEntry?.leaveType);
  const [notes,          setNotes]          = useState(existingEntry?.notes ?? '');

  // Territories — sourced directly from the MR profile already in Redux store.
  // The profile (fetched via /medicalreps/by-user) contains territoryAssignments
  // with territoryId + territoryName on each item.
  const territories: Option[] = (mrProfile?.territoryAssignments ?? []).map((a: any) => ({
    id:   a.territoryId   ?? a.territory?.id,
    name: a.territoryName ?? a.territory?.name ?? a.territoryCode,
  }));

  const [territory, setTerritory] = useState<Option | undefined>(
    existingEntry?.territoryId ? { id: existingEntry.territoryId, name: existingEntry.territoryName ?? '' } : undefined,
  );

  // Routes
  const [routeOpts,     setRouteOpts]     = useState<Option[]>([]);
  const [loadingRoutes, setLoadingRoutes] = useState(false);
  const [selRoute,       setSelRoute]       = useState<Option | undefined>(
    existingEntry?.routeId ? { id: existingEntry.routeId, name: existingEntry.routeName ?? '' } : undefined,
  );

  // Doctors / Chemists
  const [doctors, setDoctors] = useState<Option[]>(
    (existingEntry?.plannedDoctorIds ?? []).map((id, i) => ({
      id, name: existingEntry?.plannedDoctorNames?.[i] ?? id,
    })),
  );

  // Products
  const [products, setProducts] = useState<Option[]>(
    (existingEntry?.focusProductIds ?? []).map((id, i) => ({
      id, name: existingEntry?.focusProductNames?.[i] ?? id,
    })),
  );

  const isFieldWork = activityType === 'FIELD_WORK';

  useEffect(() => {
    if (isFieldWork) { loadRoutes(); }
  }, [isFieldWork]);

  const loadRoutes = async () => {
    try {
      setLoadingRoutes(true);
      const res  = await axiosInstance.get('/routes', { params: { pageSize: 100 } });
      const list: any[] = res.data?.items ?? res.data ?? [];
      setRouteOpts(list.map(r => ({ id: r.id, name: r.routeName })));
    } catch { /* silently fail */ } finally { setLoadingRoutes(false); }
  };

  const searchDoctors = async (q: string): Promise<Option[]> => {
    // API uses route param: GET /doctors/search/{searchTerm}
    const res  = await axiosInstance.get(`${API_CONFIG.ENDPOINTS.DOCTORS_SEARCH}/${encodeURIComponent(q)}`);
    const list: any[] = res.data?.data ?? res.data ?? [];
    return list.map((d: any) => ({ id: d.id, name: d.doctorName ?? d.name }));
  };

  const searchProducts = async (q: string): Promise<Option[]> => {
    const res  = await axiosInstance.get(API_CONFIG.ENDPOINTS.PRODUCTS_CAMPAIGN);
    const list: any[] = res.data?.data ?? res.data ?? [];
    return list
      .filter((p: any) => (p.productName ?? '').toLowerCase().includes(q.toLowerCase()))
      .map((p: any) => ({ id: p.id, name: p.productName }));
  };

  const handleSave = () => {
    if (isFieldWork && !territory) {
      Alert.alert('HQ / Location Required', 'Please select a territory for field work days.');
      return;
    }
    if (activityType === 'LEAVE' && !leaveType) {
      Alert.alert('Leave Type Required', 'Please select a leave type.');
      return;
    }

    const entry: DraftDayEntry = {
      date,
      activityType,
      routeId:            isFieldWork ? selRoute?.id    : undefined,
      routeName:          isFieldWork ? selRoute?.name  : undefined,
      territoryId:        isFieldWork ? territory?.id   : undefined,
      territoryName:      isFieldWork ? territory?.name : undefined,
      plannedDoctorIds:   isFieldWork ? doctors.map(d => d.id)   : [],
      plannedDoctorNames: isFieldWork ? doctors.map(d => d.name) : [],
      focusProductIds:    isFieldWork ? products.map(p => p.id)   : [],
      focusProductNames:  isFieldWork ? products.map(p => p.name) : [],
      estimatedCalls:     isFieldWork ? doctors.length : 0,
      notes:              notes.trim() || undefined,
      leaveType:          activityType === 'LEAVE' ? leaveType : undefined,
    };

    dispatch(upsertDraftEntry(entry));
    navigation.goBack();
  };

  const handleClear = () => {
    Alert.alert('Clear Day', 'Remove the plan for this day?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: () => { dispatch(removeDraftEntry(date)); navigation.goBack(); } },
    ]);
  };

  return (
    <View style={s.page}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

        {/* ── Single white card wrapping the entire form (like sample UI) ── */}
        <View style={s.card}>

          {/* Date */}
          <Field label="Select Date">
            <TouchableOpacity style={f.input} onPress={() => setShowCal(true)}>
              <MaterialCommunityIcons name="calendar-outline" size={18} color={C.textMuted} style={{ marginRight: 8 }} />
              <Text style={f.inputText}>{fmtDisplay(date)}</Text>
              <MaterialCommunityIcons name="calendar-edit" size={18} color={C.textMuted} />
            </TouchableOpacity>
          </Field>

          {/* Work Type */}
          <Field label="Work Type" required>
            <Dropdown
              placeholder="-- Select Work Type --"
              selected={WORK_TYPES.find(w => w.type === activityType)
                ? { id: activityType, name: WORK_TYPES.find(w => w.type === activityType)!.label }
                : undefined}
              options={WORK_TYPES.map(w => ({ id: w.type, name: w.label }))}
              onSelect={o => { setActivityType(o.id as ActivityType); setLeaveType(undefined); }}
            />
          </Field>

          {/* ── FIELD WORK fields ── */}
          {isFieldWork && (
            <>
              <Field label="HQ / Location" required>
                <Dropdown
                  placeholder="-- Select Town/Area --"
                  selected={territory}
                  options={territories}
                  onSelect={setTerritory}
                />
              </Field>

              <Field label="Route / Area Plan">
                <Dropdown
                  placeholder="-- Select Route --"
                  selected={selRoute}
                  options={routeOpts}
                  loading={loadingRoutes}
                  onSelect={setSelRoute}
                />
              </Field>

              <Field label="Doctor / Chemist Plan" required>
                <MultiSelect
                  searchPlaceholder="Search and select doctors..."
                  selected={doctors}
                  onSearch={searchDoctors}
                  onAdd={o => setDoctors(prev => [...prev, o])}
                  onRemove={id => setDoctors(prev => prev.filter(d => d.id !== id))}
                />
              </Field>

              <Field label="Product Focus">
                <MultiSelect
                  searchPlaceholder="Search campaign products..."
                  pillBg="#e0e7ff"
                  pillColor="#4338ca"
                  selected={products}
                  onSearch={searchProducts}
                  onAdd={o => setProducts(prev => [...prev, o])}
                  onRemove={id => setProducts(prev => prev.filter(p => p.id !== id))}
                />
              </Field>
            </>
          )}

          {/* ── LEAVE fields ── */}
          {activityType === 'LEAVE' && (
            <Field label="Leave Type" required>
              <Dropdown
                placeholder="-- Select Leave Type --"
                selected={leaveType ? { id: leaveType, name: LEAVE_OPTS.find(l => l.type === leaveType)?.label ?? leaveType } : undefined}
                options={LEAVE_OPTS.map(l => ({ id: l.type, name: l.label }))}
                onSelect={o => setLeaveType(o.id as LeaveType)}
              />
            </Field>
          )}

          {/* Remarks */}
          <Field label="Remarks">
            <TextInput
              style={f.textarea}
              placeholder="Optional notes..."
              placeholderTextColor={C.textMuted}
              multiline
              numberOfLines={3}
              value={notes}
              onChangeText={setNotes}
              textAlignVertical="top"
            />
          </Field>

          {/* Save button */}
          <TouchableOpacity style={s.btnPrimary} onPress={handleSave} activeOpacity={0.85}>
            <Text style={s.btnPrimaryText}>Save Plan</Text>
          </TouchableOpacity>

          {existingEntry && (
            <TouchableOpacity style={s.btnOutline} onPress={handleClear} activeOpacity={0.85}>
              <Text style={s.btnOutlineText}>Clear Day</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Calendar modal */}
      <CalendarModal
        visible={showCal}
        currentISO={date}
        onSelect={setDate}
        onClose={() => setShowCal(false)}
      />
    </View>
  );
};

// ─── Calendar modal styles ────────────────────────────────────────────────────
const cal = StyleSheet.create({
  overlay:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center' },
  sheet: {
    width: '90%', backgroundColor: C.cardBg,
    borderRadius: SIZES.radiusLG, padding: SIZES.paddingMD,
    shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 16, elevation: 8,
  },
  header:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SIZES.paddingMD },
  navBtn:        { padding: 6 },
  monthTitle:    { fontSize: SIZES.fontLG, fontWeight: '700', color: C.textDark },
  row:           { flexDirection: 'row' },
  dayLabel:      { flex: 1, textAlign: 'center', fontSize: SIZES.fontXS, fontWeight: '600', color: C.textMuted, paddingBottom: 6 },
  cell:          { flex: 1, aspectRatio: 1, justifyContent: 'center', alignItems: 'center', borderRadius: SIZES.radiusMD, margin: 1 },
  cellSel:       { backgroundColor: C.primary },
  cellToday:     { borderWidth: 1, borderColor: C.primary },
  cellText:      { fontSize: SIZES.fontSM, color: C.textDark, fontWeight: '500' },
  cellTextSel:   { color: '#fff', fontWeight: '700' },
  cellTextEmpty: { color: 'transparent' },
  closeBtn:      { marginTop: SIZES.paddingMD, alignItems: 'center', padding: SIZES.paddingSM },
  closeBtnText:  { color: C.textMuted, fontSize: SIZES.fontMD, fontWeight: '600' },
});

// ─── Form element styles (shared) ────────────────────────────────────────────
const f = StyleSheet.create({
  group: { marginBottom: 20 },
  label: { fontSize: 13.5, fontWeight: '600', color: C.textDark, marginBottom: 6 },
  req:   { color: C.danger },

  // Full-screen transparent overlay behind floating menus
  modalOverlay: { flex: 1 },

  // Generic input / dropdown trigger
  input: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.inputBg,
    borderWidth: 1, borderColor: C.border,
    borderRadius: SIZES.radiusMD,
    paddingHorizontal: SIZES.paddingMD, paddingVertical: 12,
  },
  inputText:   { flex: 1, fontSize: SIZES.fontMD, color: C.textDark },
  placeholder: { color: C.textMuted },

  // Dropdown menu
  menu: {
    marginTop: 4,
    backgroundColor: C.cardBg,
    borderWidth: 1, borderColor: C.border,
    borderRadius: SIZES.radiusMD,
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 3,
  },
  menuEmpty:        { padding: SIZES.paddingMD, color: C.textMuted, textAlign: 'center', fontSize: SIZES.fontSM },
  menuItem:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: SIZES.paddingMD, borderBottomWidth: 1, borderBottomColor: C.border },
  menuItemActive:   { backgroundColor: `${C.primary}0F` },
  menuItemText:     { fontSize: SIZES.fontMD, color: C.textDark, flex: 1 },
  menuItemTextActive: { color: C.primary, fontWeight: '600' },

  // Pills
  pills:    { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  pill:     { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 16 },
  pillText: { fontSize: SIZES.fontXS, fontWeight: '600', maxWidth: 130 },

  // Search
  searchBox:   { flexDirection: 'row', alignItems: 'center', backgroundColor: C.inputBg, borderWidth: 1, borderColor: C.border, borderRadius: SIZES.radiusMD, paddingHorizontal: SIZES.paddingMD },
  searchIcon:  { marginRight: 6 },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: SIZES.fontMD, color: C.textDark },

  // Textarea
  textarea: {
    backgroundColor: C.inputBg,
    borderWidth: 1, borderColor: C.border,
    borderRadius: SIZES.radiusMD,
    padding: SIZES.paddingMD,
    fontSize: SIZES.fontMD,
    color: C.textDark,
    minHeight: 80,
  },
});

// ─── Screen-level styles ──────────────────────────────────────────────────────
const s = StyleSheet.create({
  page:   { flex: 1, backgroundColor: C.pageBg },
  scroll: { padding: SIZES.paddingMD, paddingBottom: 40 },

  // White card — mirrors sample UI `.card`
  card: {
    backgroundColor: C.cardBg,
    borderRadius: SIZES.radiusLG,
    padding: 20,
    borderWidth: 1, borderColor: C.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2,
  },

  // Primary button — mirrors sample UI `.btn-primary`
  btnPrimary: {
    backgroundColor: C.primary,
    borderRadius: SIZES.radiusMD,
    paddingVertical: 16,
    alignItems: 'center', marginTop: 8,
    shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.39, shadowRadius: 8, elevation: 4,
  },
  btnPrimaryText: { color: '#fff', fontSize: SIZES.fontMD + 1, fontWeight: '700' },

  // Outline button
  btnOutline: {
    borderRadius: SIZES.radiusMD, borderWidth: 1.5, borderColor: C.border,
    paddingVertical: 14, alignItems: 'center', marginTop: 8,
  },
  btnOutlineText: { color: C.textMuted, fontSize: SIZES.fontMD, fontWeight: '600' },
});

export default DayPlanFormScreen;
