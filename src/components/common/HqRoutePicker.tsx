import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Modal,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import axiosInstance from '../../services/api/axiosInstance';
import { API_CONFIG } from '../../config/api.config';
import { useAppSelector } from '../../store/hooks';
import { COLORS, SIZES } from '../../constants';

interface Option { id: string; name: string; }

export interface HqRouteValue {
  hqId?: string;
  routeId?: string;
}

interface HqRoutePickerProps {
  value: HqRouteValue;
  onChange: (value: HqRouteValue) => void;
  routeError?: string;
}

// ─── Single-select field that opens a centred option list ────────────────────
const SelectField: React.FC<{
  label: string;
  placeholder: string;
  icon: string;
  options: Option[];
  selectedId?: string;
  loading?: boolean;
  disabled?: boolean;
  error?: string;
  onSelect: (o: Option) => void;
}> = ({ label, placeholder, icon, options, selectedId, loading, disabled, error, onSelect }) => {
  const [open, setOpen] = useState(false);
  const selectedName = options.find(o => o.id === selectedId)?.name;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={[styles.trigger, !!error && styles.triggerError, disabled && styles.triggerDisabled]}
        onPress={() => setOpen(true)}
        disabled={disabled || loading}
        activeOpacity={0.8}
      >
        <MaterialCommunityIcons
          name={icon}
          size={SIZES.iconMD}
          color={error ? COLORS.error : COLORS.textSecondary}
          style={styles.icon}
        />
        <Text style={[styles.triggerText, !selectedName && styles.placeholder]} numberOfLines={1}>
          {loading ? 'Loading...' : selectedName ?? placeholder}
        </Text>
        {loading
          ? <ActivityIndicator size="small" color={COLORS.primary} />
          : <MaterialCommunityIcons name="chevron-down" size={20} color={COLORS.textSecondary} />}
      </TouchableOpacity>
      {!!error && <Text style={styles.error}>{error}</Text>}

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableWithoutFeedback onPress={() => setOpen(false)}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback>
              <View style={styles.sheet}>
                <Text style={styles.sheetTitle}>{label.replace(' *', '')}</Text>
                <FlatList
                  data={options}
                  keyExtractor={o => o.id}
                  ListEmptyComponent={<Text style={styles.empty}>No options available</Text>}
                  renderItem={({ item }) => {
                    const active = item.id === selectedId;
                    return (
                      <TouchableOpacity
                        style={[styles.item, active && styles.itemActive]}
                        onPress={() => { onSelect(item); setOpen(false); }}
                      >
                        <Text style={[styles.itemText, active && styles.itemTextActive]}>{item.name}</Text>
                        {active && <MaterialCommunityIcons name="check" size={18} color={COLORS.primary} />}
                      </TouchableOpacity>
                    );
                  }}
                />
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

// ─── HQ → Route cascading picker, used on Add Doctor / Add Chemist forms ──────
// HQ defaults to the MR's own headquarters; Route list is filtered by the chosen HQ.
const HqRoutePicker: React.FC<HqRoutePickerProps> = ({ value, onChange, routeError }) => {
  const { mrProfile } = useAppSelector(state => state.user);
  const { user } = useAppSelector(state => state.auth);
  const defaultHqId = mrProfile?.headquartersId ?? user?.headquartersId;

  const [hqOpts, setHqOpts] = useState<Option[]>([]);
  const [routeOpts, setRouteOpts] = useState<Option[]>([]);
  const [loadingHQ, setLoadingHQ] = useState(false);
  const [loadingRoutes, setLoadingRoutes] = useState(false);

  useEffect(() => {
    const loadHQ = async () => {
      try {
        setLoadingHQ(true);
        const res = await axiosInstance.get(API_CONFIG.ENDPOINTS.HEADQUARTERS);
        const list: any[] = res.data?.data ?? res.data ?? [];
        setHqOpts(list.map(h => ({ id: h.id, name: h.hqName ?? h.hQName ?? h.name ?? '' })));
      } catch { /* silently fail */ } finally { setLoadingHQ(false); }
    };
    loadHQ();
    if (!value.hqId && defaultHqId) {
      onChange({ hqId: defaultHqId, routeId: undefined });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!value.hqId) { setRouteOpts([]); return; }
    const loadRoutes = async (hqId: string) => {
      try {
        setLoadingRoutes(true);
        const res = await axiosInstance.get(API_CONFIG.ENDPOINTS.ROUTES, {
          params: { headquartersId: hqId, pageSize: 100, isActive: true },
        });
        const list: any[] = res.data?.items ?? res.data?.data ?? res.data ?? [];
        setRouteOpts(list.map(r => ({ id: r.id, name: r.routeName })));
      } catch { setRouteOpts([]); } finally { setLoadingRoutes(false); }
    };
    loadRoutes(value.hqId);
  }, [value.hqId]);

  return (
    <>
      <SelectField
        label="HQ / Location *"
        placeholder="Select HQ / Location"
        icon="office-building-marker"
        options={hqOpts}
        selectedId={value.hqId}
        loading={loadingHQ}
        onSelect={o => {
          if (o.id !== value.hqId) { onChange({ hqId: o.id, routeId: undefined }); }
        }}
      />
      <SelectField
        label="Route / Area *"
        placeholder={value.hqId ? 'Select Route / Area' : 'Select HQ first'}
        icon="map-marker-path"
        options={routeOpts}
        selectedId={value.routeId}
        loading={loadingRoutes}
        disabled={!value.hqId}
        error={routeError}
        onSelect={o => onChange({ hqId: value.hqId, routeId: o.id })}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: SIZES.paddingMD,
  },
  label: {
    fontSize: SIZES.fontMD,
    fontWeight: '500',
    color: COLORS.textPrimary,
    marginBottom: SIZES.paddingSM,
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    height: SIZES.buttonMD,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radiusMD,
    backgroundColor: COLORS.background,
    paddingHorizontal: SIZES.paddingMD,
  },
  triggerError: {
    borderColor: COLORS.error,
  },
  triggerDisabled: {
    backgroundColor: COLORS.backgroundGray,
  },
  icon: {
    marginRight: SIZES.paddingSM,
  },
  triggerText: {
    flex: 1,
    fontSize: SIZES.fontMD,
    color: COLORS.textPrimary,
  },
  placeholder: {
    color: COLORS.textDisabled,
  },
  error: {
    fontSize: SIZES.fontSM,
    color: COLORS.error,
    marginTop: SIZES.paddingXS,
    marginLeft: SIZES.paddingXS,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: SIZES.paddingLG,
  },
  sheet: {
    maxHeight: '70%',
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radiusLG,
    paddingVertical: SIZES.paddingSM,
  },
  sheetTitle: {
    fontSize: SIZES.fontLG,
    fontWeight: '600',
    color: COLORS.textPrimary,
    paddingHorizontal: SIZES.paddingMD,
    paddingVertical: SIZES.paddingSM,
  },
  empty: {
    padding: SIZES.paddingMD,
    textAlign: 'center',
    color: COLORS.textSecondary,
    fontSize: SIZES.fontSM,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SIZES.paddingMD,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  itemActive: {
    backgroundColor: COLORS.primaryLight,
  },
  itemText: {
    flex: 1,
    fontSize: SIZES.fontMD,
    color: COLORS.textPrimary,
  },
  itemTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
});

export default HqRoutePicker;
