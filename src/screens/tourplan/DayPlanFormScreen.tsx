import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  TouchableWithoutFeedback,
  TextInput,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  upsertDraftEntry,
  removeDraftEntry,
  setLastEditedDate,
  upsertPlan,
} from '../../store/slices/tourPlanSlice';
import axiosInstance from '../../services/api/axiosInstance';
import tourPlanApi from '../../services/api/tourPlanApi';
import { API_CONFIG } from '../../config/api.config';
import { COLORS, SIZES } from '../../constants';
import { DOCTOR_TITLE_REGEX, formatDoctorName } from '../../utils/helpers';
import {
  ActivityType,
  DraftDayEntry,
  LeaveType,
  PlannedContact,
  TourPlanDetailInput,
  contactLabel,
  idsByKind,
} from '../../types/tourPlan.types';
import { TourPlanStackParamList } from '../../types/navigation.types';

type RouteProps = RouteProp<TourPlanStackParamList, 'DayPlanForm'>;
interface Option {
  id: string;
  name: string;
  kind?: 'doctor' | 'chemist' | 'stockist';
  lastVisitDate?: string;
  /** Secondary line in search results, e.g. "Not planned this month · Last visit 12 Sep" */
  hint?: string;
  /** Doctor/chemist not planned on any day of this month yet */
  highlight?: boolean;
}

// Planned contacts are stored with plain names; the picker shows them labelled ("Dr. X", "Y (Chemist)")
const contactToOption = (c: PlannedContact): Option => ({ id: c.id, name: contactLabel(c), kind: c.kind });
const optionToContact = (o: Option): PlannedContact => ({
  id: o.id,
  kind: o.kind ?? 'doctor',
  name: o.name.replace(/ \((Chemist|Stockist)\)$/, '').replace(DOCTOR_TITLE_REGEX, '').trim(),
});

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

  const resolvedName = options.find(o => o.id === selected?.id)?.name ?? selected?.name;

  return (
    <View>
      <TouchableOpacity ref={triggerRef as any} style={f.input} onPress={handleOpen} activeOpacity={0.8}>
        <Text style={[f.inputText, !resolvedName && f.placeholder]}>
          {loading ? 'Loading...' : (resolvedName || placeholder)}
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
  showAllOnEmpty?: boolean;
  maxResults?: number;
}> = ({ searchPlaceholder, pillBg, pillColor, selected, onSearch, onAdd, onRemove, showAllOnEmpty, maxResults = 8 }) => {
  const [query,   setQuery]   = useState('');
  const [results, setResults] = useState<Option[]>([]);
  const [busy,    setBusy]    = useState(false);
  const [focused, setFocused] = useState(false);

  const bg  = pillBg    ?? C.primaryLight;
  const txt = pillColor ?? C.primary;

  const doSearch = useCallback(async (text: string) => {
    setQuery(text);
    setFocused(true);
    if (!text.trim()) {
      if (showAllOnEmpty) {
        try {
          setBusy(true);
          const data = await onSearch('');
          setResults(data.filter(r => !selected.find(s => s.id === r.id)));
        } catch { setResults([]); }
        finally  { setBusy(false); }
      } else {
        setResults([]);
      }
      return;
    }
    try {
      setBusy(true);
      const data = await onSearch(text);
      setResults(data.filter(r => !selected.find(s => s.id === r.id)));
    } catch { setResults([]); }
    finally  { setBusy(false); }
  }, [onSearch, selected, showAllOnEmpty]);

  // When the source list changes (e.g. route switched), re-run the current search so
  // options from the previous route can't still be picked from the open list.
  useEffect(() => {
    let cancelled = false;
    if (!query.trim() && !showAllOnEmpty) {
      setResults([]);
      return;
    }
    onSearch(query)
      .then(data => { if (!cancelled) setResults(data.filter(r => !selected.find(s => s.id === r.id))); })
      .catch(() => { if (!cancelled) setResults([]); });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onSearch]);

  const handleFocus = async () => {
    setFocused(true);
    if (!query.trim() && showAllOnEmpty) {
      try {
        setBusy(true);
        const data = await onSearch('');
        setResults(data.filter(r => !selected.find(s => s.id === r.id)));
      } catch { setResults([]); }
      finally  { setBusy(false); }
    }
  };

  const pick = (o: Option) => {
    onAdd(o);
    setQuery('');
    setResults([]);
    setFocused(false);
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

      <View style={f.searchBox}>
        <MaterialCommunityIcons name="magnify" size={18} color={C.textMuted} style={f.searchIcon} />
        <TextInput
          style={f.searchInput}
          placeholder={searchPlaceholder}
          placeholderTextColor={C.textMuted}
          value={query}
          onChangeText={doSearch}
          onFocus={handleFocus}
          onBlur={() => setFocused(false)}
        />
        {busy && <ActivityIndicator size="small" color={C.primary} />}
      </View>

      {/* Inline results — no Modal so keyboard stays up while user types */}
      {focused && results.length > 0 && (
        <ScrollView style={f.inlineResults} nestedScrollEnabled keyboardShouldPersistTaps="handled">
          {results.slice(0, maxResults).map(r => (
            <TouchableOpacity
              key={r.id}
              style={[f.menuItem, r.highlight && f.menuItemHighlight]}
              onPress={() => pick(r)}
            >
              <View style={f.menuItemBody}>
                <Text style={[f.menuItemName, r.highlight && f.menuItemTextHighlight]}>{r.name}</Text>
                {r.hint ? (
                  <Text style={[f.menuItemHint, r.highlight && f.menuItemHintHighlight]}>{r.hint}</Text>
                ) : null}
              </View>
              <MaterialCommunityIcons name="plus-circle-outline" size={18} color={C.primary} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
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
  const navigation   = useNavigation();
  const route        = useRoute<RouteProps>();
  const dispatch     = useAppDispatch();
  const draftEntries = useAppSelector((s: any) => s.tourPlan.draftEntries);
  const mrProfile    = useAppSelector(s => s.user.mrProfile);
  const authUser     = useAppSelector(s => s.auth.user);
  const { date: initDate, existingEntry, month: planMonth, year: planYear, readOnly } = route.params;

  // Most recent prior-day draft entry — used to pre-fill new (not existing) day forms
  const scrollRef = useRef<ScrollView>(null);

  const autoFill = useRef<DraftDayEntry | null>(
    !existingEntry
      ? (Object.values(draftEntries) as DraftDayEntry[])
          .filter(e => e.date < initDate)
          .sort((a, b) => b.date.localeCompare(a.date))[0] ?? null
      : null,
  ).current;

  const [date,         setDate]         = useState(initDate);
  const [showCal,      setShowCal]      = useState(false);
  const [activityType, setActivityType] = useState<ActivityType>(
    existingEntry?.activityType ?? autoFill?.activityType ?? 'FIELD_WORK',
  );
  const [leaveType,    setLeaveType]    = useState<LeaveType | undefined>(
    existingEntry?.leaveType ?? autoFill?.leaveType,
  );
  const [notes,        setNotes]        = useState(existingEntry?.notes ?? '');
  const [saving,       setSaving]       = useState(false);

  // An MR works from a single HQ (set by admin on their profile), so it is fixed on the plan.
  // The dropdown is only a fallback for an MR who has no HQ assigned yet.
  const profileHqId = mrProfile?.headquartersId ?? authUser?.headquartersId;
  const profileHq: Option | undefined = profileHqId
    ? { id: profileHqId, name: mrProfile?.headquartersName ?? authUser?.headquartersName ?? '' }
    : undefined;
  const seed = existingEntry ?? autoFill;
  // A saved route only carries over if it belongs to the HQ being used
  const seedMatchesHq = !profileHq || !seed?.hqId || seed.hqId === profileHq.id;

  // HQ / Location — fetched from /headquarters API (fallback dropdown only)
  const [hqOpts,     setHqOpts]     = useState<Option[]>([]);
  const [loadingHQ,  setLoadingHQ]  = useState(false);
  const [hq,         setHq]         = useState<Option | undefined>(
    profileHq
    ?? (seed?.hqId ? { id: seed.hqId, name: seed.hqName ?? '' } : undefined),
  );

  // Routes — filtered by selected HQ
  const [routeOpts,     setRouteOpts]     = useState<Option[]>([]);
  const [loadingRoutes, setLoadingRoutes] = useState(false);
  const [selRoute,      setSelRoute]      = useState<Option | undefined>(
    seed?.routeId && seedMatchesHq ? { id: seed.routeId, name: seed.routeName ?? '' } : undefined,
  );

  // Contact pool — doctors + chemists (by route) + stockists (by HQ), pre-loaded
  const [contactPool,     setContactPool]     = useState<Option[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const contactsRequestRef = useRef(0);
  // Widen doctors/chemists from the selected route to the whole HQ (incl. those with no route yet)
  const [showAllInHQ,     setShowAllInHQ]     = useState(false);

  // Selected contacts (doctors / chemists / stockists)
  const [doctors, setDoctors] = useState<Option[]>(
    (existingEntry?.plannedContacts ?? []).map(contactToOption),
  );

  // Campaign products — pre-loaded once
  const [campaignProducts, setCampaignProducts] = useState<Option[]>([]);

  // Selected products
  const [products, setProducts] = useState<Option[]>(
    (existingEntry?.focusProductIds ?? []).map((id, i) => ({
      id, name: existingEntry?.focusProductNames?.[i] ?? id,
    })),
  );

  const isFieldWork = activityType === 'FIELD_WORK';

  // ── Loaders ──────────────────────────────────────────────────────────────────

  const loadHQ = async () => {
    try {
      setLoadingHQ(true);
      const res = await axiosInstance.get(API_CONFIG.ENDPOINTS.HEADQUARTERS);
      const list: any[] = res.data ?? [];
      setHqOpts(list.map(h => ({ id: h.id, name: h.hqName ?? h.hQName ?? h.name ?? '' })));
    } catch { /* silently fail */ } finally { setLoadingHQ(false); }
  };

  const loadRoutes = async (hqId: string) => {
    try {
      setLoadingRoutes(true);
      const res = await axiosInstance.get(API_CONFIG.ENDPOINTS.ROUTES, {
        params: { headquartersId: hqId, pageSize: 100, isActive: true },
      });
      const list: any[] = res.data?.items ?? res.data ?? [];
      setRouteOpts(list.map(r => ({ id: r.id, name: r.routeName })));
    } catch { /* silently fail */ } finally { setLoadingRoutes(false); }
  };

  // Fetches doctors + chemists (by route, or HQ-wide when no route / allInHQ) and stockists (by HQ)
  const loadContacts = async (hqId: string, routeId?: string, allInHQ = false) => {
    // Only the latest request may update the pool — a slow response for a previous route is dropped
    const requestId = ++contactsRequestRef.current;
    try {
      setLoadingContacts(true);
      const hqWideParams = {
        params: { headquartersId: hqId, includeUnassigned: true, isActive: true, pageSize: 200 },
      };
      const byRoute = !!routeId && !allInHQ;
      const settled = await Promise.allSettled([
        byRoute
          ? axiosInstance.get(`${API_CONFIG.ENDPOINTS.DOCTORS}/by-route/${routeId}`)
          : axiosInstance.get(API_CONFIG.ENDPOINTS.DOCTORS, hqWideParams),
        byRoute
          ? axiosInstance.get(`${API_CONFIG.ENDPOINTS.CHEMISTS}/by-route/${routeId}`)
          : axiosInstance.get(API_CONFIG.ENDPOINTS.CHEMISTS, hqWideParams),
        axiosInstance.get(API_CONFIG.ENDPOINTS.STOCKISTS, {
          params: { headquartersId: hqId, pageSize: 200, isActive: true },
        }),
      ]);
      const listOf = (body: any): any[] =>
        body?.items ?? body?.data?.items ?? body?.data ?? (Array.isArray(body) ? body : []);

      const pool: Option[] = [];
      const [docRes, chemRes, stkRes] = settled;

      if (docRes.status === 'fulfilled') {
        listOf(docRes.value.data).forEach((d: any) =>
          pool.push({ id: d.id, name: formatDoctorName(d.doctorName ?? d.name), kind: 'doctor', lastVisitDate: d.lastVisitDate }),
        );
      }
      if (chemRes.status === 'fulfilled') {
        listOf(chemRes.value.data).forEach((c: any) =>
          pool.push({
            id: c.id,
            name: `${c.chemistName ?? c.pharmacyName ?? c.name} (Chemist)`,
            kind: 'chemist',
            lastVisitDate: c.lastVisitDate,
          }),
        );
      }
      if (stkRes.status === 'fulfilled') {
        (stkRes.value.data?.items ?? stkRes.value.data?.data ?? stkRes.value.data ?? []).forEach((s: any) =>
          pool.push({ id: s.id, name: `${s.stockistName ?? s.name} (Stockist)`, kind: 'stockist' }),
        );
      }
      if (requestId !== contactsRequestRef.current) return;
      setContactPool(pool);
    } catch { /* silently fail */ } finally {
      if (requestId === contactsRequestRef.current) setLoadingContacts(false);
    }
  };

  const loadCampaignProducts = async () => {
    try {
      const res = await axiosInstance.get(API_CONFIG.ENDPOINTS.PRODUCTS_CAMPAIGN);
      const list: any[] = res.data?.data ?? res.data ?? [];
      setCampaignProducts(list.map((p: any) => ({ id: p.id, name: p.productName ?? p.name ?? '' })));
    } catch { /* silently fail */ }
  };

  // Once contactPool loads, resolve display names for any pills that still show raw UUIDs
  useEffect(() => {
    if (contactPool.length === 0 || doctors.length === 0) return;
    setDoctors(prev => prev.map(d => {
      const match = contactPool.find(c => c.id === d.id);
      return match ?? d;
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactPool]);

  // Once campaignProducts loads, resolve display names for product pills that show raw UUIDs
  useEffect(() => {
    if (campaignProducts.length === 0 || products.length === 0) return;
    setProducts(prev => prev.map(p => {
      const match = campaignProducts.find(c => c.id === p.id);
      return match ?? p;
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignProducts]);

  // On entering field-work mode, fetch HQ list + campaign products.
  // If editing an existing entry or auto-filling from a prior day, also restore routes and contact pool.
  useEffect(() => {
    if (!isFieldWork) return;
    if (!profileHq) { loadHQ(); }
    loadCampaignProducts();
    if (hq) {
      loadRoutes(hq.id);
      loadContacts(hq.id, selRoute?.id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFieldWork]);

  // ── Change handlers ───────────────────────────────────────────────────────────

  const handleHQChange = (o: Option) => {
    setHq(o);
    setSelRoute(undefined);
    setRouteOpts([]);
    setContactPool([]);
    setDoctors([]);
    setShowAllInHQ(false);
    loadRoutes(o.id);
    loadContacts(o.id);
  };

  const handleRouteChange = (o: Option) => {
    setSelRoute(o);
    setContactPool([]);
    setDoctors([]);
    setShowAllInHQ(false);
    if (hq) { loadContacts(hq.id, o.id); }
  };

  // Keeps already-picked contacts; only widens/narrows what the search offers
  const toggleShowAllInHQ = () => {
    const next = !showAllInHQ;
    setShowAllInHQ(next);
    if (hq) { loadContacts(hq.id, selRoute?.id, next); }
  };

  // ── Search callbacks (filter pre-loaded pools) ────────────────────────────────

  // Days of this month (other than the one being edited) each contact is already planned on
  const plannedDaysByContact = useMemo(() => {
    const map = new Map<string, number[]>();
    (Object.values(draftEntries) as DraftDayEntry[]).forEach(e => {
      if (e.date === date || e.activityType !== 'FIELD_WORK') return;
      (e.plannedContacts ?? []).forEach(({ id }) => {
        map.set(id, [...(map.get(id) ?? []), parseInt(e.date.slice(8, 10), 10)]);
      });
    });
    map.forEach(days => days.sort((a, b) => a - b));
    return map;
  }, [draftEntries, date]);

  // Pool annotated with coverage; doctors/chemists not planned yet this month come first
  const coveragePool = useMemo(() => {
    const selectedIds = new Set(doctors.map(d => d.id));
    const fmtVisit = (iso?: string) => {
      if (!iso) return 'Never visited';
      const d = new Date(iso);
      return `Last visit ${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)}`;
    };
    const annotated = contactPool.map(c => {
      if (c.kind === 'stockist') return c;
      const days = plannedDaysByContact.get(c.id);
      const planned = days
        ? `Planned on ${days.slice(0, 4).join(', ')}${days.length > 4 ? '…' : ''}`
        : 'Not planned this month';
      return { ...c, highlight: !days && !selectedIds.has(c.id), hint: `${planned} · ${fmtVisit(c.lastVisitDate)}` };
    });
    return annotated.sort((a, b) => Number(!!b.highlight) - Number(!!a.highlight));
  }, [contactPool, plannedDaysByContact, doctors]);

  const routeCoverage = useMemo(() => {
    const onRoute = coveragePool.filter(c => c.kind === 'doctor' || c.kind === 'chemist');
    const unplanned = onRoute.filter(c => !plannedDaysByContact.has(c.id) && !doctors.some(d => d.id === c.id));
    return { total: onRoute.length, unplanned: unplanned.length };
  }, [coveragePool, plannedDaysByContact, doctors]);

  const searchContacts = useCallback(async (q: string): Promise<Option[]> => {
    if (!q.trim()) return coveragePool;
    const lower = q.toLowerCase();
    return coveragePool.filter(c => c.name.toLowerCase().includes(lower));
  }, [coveragePool]);

  const searchProducts = useCallback(async (q: string): Promise<Option[]> => {
    if (!q.trim()) return campaignProducts;
    const lower = q.toLowerCase();
    return campaignProducts.filter(p => p.name.toLowerCase().includes(lower));
  }, [campaignProducts]);

  const handleSave = async () => {
    if (isFieldWork && !hq) {
      Alert.alert('HQ / Location Required', 'Please select an HQ / location for field work days.');
      return;
    }
    if (activityType === 'LEAVE' && !leaveType) {
      Alert.alert('Leave Type Required', 'Please select a leave type.');
      return;
    }
    if (isFieldWork && doctors.length > 0) {
      if (loadingContacts) {
        Alert.alert('Please Wait', 'Doctors and chemists for this route are still loading.');
        return;
      }
      const available = new Set(contactPool.map(c => c.id));
      const stray = doctors.filter(d => !available.has(d.id));
      if (stray.length > 0) {
        Alert.alert(
          'Contacts Not on This Route',
          `${stray.map(d => d.name).join(', ')} ${stray.length === 1 ? 'is' : 'are'} not on the selected route. ` +
          'Remove them, pick another route, or tick "Show all doctors & chemists in this HQ".',
        );
        return;
      }
    }

    const entry: DraftDayEntry = {
      date,
      activityType,
      hqId:               isFieldWork ? hq?.id        : undefined,
      hqName:             isFieldWork ? hq?.name       : undefined,
      routeId:            isFieldWork ? selRoute?.id   : undefined,
      routeName:          isFieldWork ? selRoute?.name : undefined,
      plannedContacts:    isFieldWork ? doctors.map(optionToContact) : [],
      focusProductIds:    isFieldWork ? products.map(p => p.id)   : [],
      focusProductNames:  isFieldWork ? products.map(p => p.name) : [],
      estimatedCalls:     isFieldWork ? doctors.length : 0,
      notes:              notes.trim() || undefined,
      leaveType:          activityType === 'LEAVE' ? leaveType : undefined,
    };

    // Send only this day: the server upserts by date (other days are never lost) and files it
    // under the plan for its own week or month
    const details: TourPlanDetailInput[] = [{
      planDate:         entry.date,
      activityType:     entry.activityType,
      headquartersId:   entry.hqId,
      routeId:          entry.routeId,
      estimatedCalls:   entry.estimatedCalls,
      notes:            entry.notes,
      leaveType:        entry.leaveType,
      // Doctors, chemists and stockists each go to their own list
      ...idsByKind(entry.plannedContacts),
      focusProductIds:  entry.focusProductIds ?? [],
    }];

    try {
      setSaving(true);
      dispatch(upsertDraftEntry(entry));
      const saved = await tourPlanApi.createOrUpdate({ month: planMonth, year: planYear, details });
      dispatch(upsertPlan(saved));
      dispatch(setLastEditedDate(date));
      navigation.goBack();
    } catch (err: any) {
      Alert.alert('Save Failed', err?.response?.data?.message ?? 'Could not save the plan. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleClear = () => {
    Alert.alert('Clear Day', 'Remove the plan for this day?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          dispatch(removeDraftEntry(date));
          try { await tourPlanApi.clearDetail(date); } catch { /* silently ignore — local state already cleared */ }
          navigation.goBack();
        },
      },
    ]);
  };

  return (
    <KeyboardAvoidingView
      style={s.page}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView ref={scrollRef} contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

        {/* ── Single white card wrapping the entire form (like sample UI) ── */}
        <View style={s.card}>

          {readOnly && (
            <View style={s.readOnlyBanner}>
              <MaterialCommunityIcons name="lock-outline" size={15} color="#92400e" />
              <Text style={s.readOnlyText}>This plan is locked and cannot be edited.</Text>
            </View>
          )}

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
                {profileHq ? (
                  <View style={[f.input, f.inputLocked]}>
                    <Text style={f.inputText}>{hq?.name || 'Your HQ'}</Text>
                    <MaterialCommunityIcons name="lock-outline" size={16} color={C.textMuted} />
                  </View>
                ) : (
                  <Dropdown
                    placeholder="-- Select HQ / Location --"
                    selected={hq}
                    options={hqOpts}
                    loading={loadingHQ}
                    onSelect={handleHQChange}
                  />
                )}
              </Field>

              <Field label="Route / Area Plan">
                <Dropdown
                  placeholder={hq ? '-- Select Route --' : '-- Select HQ first --'}
                  selected={selRoute}
                  options={routeOpts}
                  loading={loadingRoutes}
                  onSelect={handleRouteChange}
                />
              </Field>

              <Field label="Doctor / Chemist / Stockist Plan" required>
                <MultiSelect
                  searchPlaceholder={
                    loadingContacts
                      ? 'Loading contacts...'
                      : hq
                        ? 'Search doctors, chemists, stockists...'
                        : 'Select HQ first to load contacts'
                  }
                  selected={doctors}
                  onSearch={searchContacts}
                  onAdd={o => setDoctors(prev => [...prev, o])}
                  onRemove={id => setDoctors(prev => prev.filter(d => d.id !== id))}
                  showAllOnEmpty
                  maxResults={50}
                />
                {!!selRoute && !showAllInHQ && !loadingContacts && routeCoverage.total > 0 && (
                  <View style={[s.coverage, routeCoverage.unplanned === 0 && s.coverageDone]}>
                    <MaterialCommunityIcons
                      name={routeCoverage.unplanned === 0 ? 'check-circle-outline' : 'alert-circle-outline'}
                      size={16}
                      color={routeCoverage.unplanned === 0 ? '#047857' : '#b45309'}
                    />
                    <Text style={[s.coverageText, routeCoverage.unplanned === 0 && s.coverageTextDone]}>
                      {routeCoverage.unplanned === 0
                        ? 'Every doctor & chemist on this route is planned this month'
                        : `${routeCoverage.unplanned} of ${routeCoverage.total} on this route not planned yet this month — highlighted in the list`}
                    </Text>
                  </View>
                )}
                {!!selRoute && !readOnly && (
                  <TouchableOpacity style={s.toggleRow} onPress={toggleShowAllInHQ} activeOpacity={0.7}>
                    <MaterialCommunityIcons
                      name={showAllInHQ ? 'checkbox-marked' : 'checkbox-blank-outline'}
                      size={20}
                      color={showAllInHQ ? C.primary : C.textMuted}
                    />
                    <Text style={s.toggleText}>Show all doctors & chemists in this HQ</Text>
                  </TouchableOpacity>
                )}
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
                  showAllOnEmpty
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
              onFocus={() => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100)}
            />
          </Field>

          {!readOnly && (
            <>
              <TouchableOpacity style={s.btnPrimary} onPress={handleSave} activeOpacity={0.85} disabled={saving}>
                {saving
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={s.btnPrimaryText}>Save Plan</Text>
                }
              </TouchableOpacity>

              {existingEntry && (
                <TouchableOpacity style={s.btnOutline} onPress={handleClear} activeOpacity={0.85}>
                  <Text style={s.btnOutlineText}>Clear Day</Text>
                </TouchableOpacity>
              )}
            </>
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
    </KeyboardAvoidingView>
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

  // Full-screen transparent overlay behind floating dropdown menus (Dropdown component only)
  modalOverlay: { flex: 1 },

  // Inline search results (MultiSelect) — rendered in document flow so keyboard stays up
  inlineResults: {
    marginTop: 4,
    maxHeight: 320,
    backgroundColor: C.cardBg,
    borderWidth: 1, borderColor: C.border,
    borderRadius: SIZES.radiusMD,
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 3,
  },

  // Generic input / dropdown trigger
  input: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: C.inputBg,
    borderWidth: 1, borderColor: C.border,
    borderRadius: SIZES.radiusMD,
    paddingHorizontal: SIZES.paddingMD, paddingVertical: 12,
  },
  inputText:   { flex: 1, fontSize: SIZES.fontMD, color: C.textDark },
  inputLocked: { opacity: 0.8 },
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
  menuItemBody:     { flex: 1, marginRight: 8 },
  // No flex here: inside the column body, flex: 1 collapses the name to zero height when a hint is shown
  menuItemName:     { fontSize: SIZES.fontMD, color: C.textDark },
  menuItemHighlight:      { backgroundColor: '#fffbeb', borderLeftWidth: 3, borderLeftColor: '#f59e0b' },
  menuItemTextHighlight:  { fontWeight: '600' },
  menuItemHint:           { fontSize: SIZES.fontXS, color: C.textMuted, marginTop: 2 },
  menuItemHintHighlight:  { color: '#b45309' },
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
  toggleRow:  { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  coverage:         { flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 8, padding: 8, borderRadius: SIZES.radiusMD, backgroundColor: '#fffbeb' },
  coverageDone:     { backgroundColor: '#ecfdf5' },
  coverageText:     { flex: 1, fontSize: SIZES.fontSM, color: '#b45309' },
  coverageTextDone: { color: '#047857' },
  toggleText: { fontSize: SIZES.fontSM, color: C.textMuted },
  scroll: { padding: SIZES.paddingMD, paddingBottom: 120 },

  // White card — mirrors sample UI `.card`
  card: {
    backgroundColor: C.cardBg,
    borderRadius: SIZES.radiusLG,
    padding: 20,
    borderWidth: 1, borderColor: C.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2,
  },

  readOnlyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fef3c7',
    borderWidth: 1,
    borderColor: '#fcd34d',
    borderRadius: SIZES.radiusMD,
    padding: SIZES.paddingSM,
    marginBottom: 16,
  },
  readOnlyText: {
    fontSize: SIZES.fontSM,
    color: '#92400e',
    flex: 1,
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
