import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  TextInput,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS, SIZES } from '../../constants';

interface SelectFieldProps {
  label?: string;
  value?: string;
  options: string[];
  onSelect: (value: string) => void;
  placeholder?: string;
  icon?: string;
  error?: string;
  /** Title of the picker sheet; defaults to the label. */
  title?: string;
}

/** Looks like Input, opens a searchable list. Search box appears once there are more than 8 options. */
const SelectField: React.FC<SelectFieldProps> = ({
  label,
  value,
  options,
  onSelect,
  placeholder = 'Select',
  icon,
  error,
  title,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter(o => o.toLowerCase().includes(q)) : options;
  }, [options, query]);

  const close = () => {
    setOpen(false);
    setQuery('');
  };

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}

      <TouchableOpacity
        style={[styles.field, error && styles.fieldError]}
        onPress={() => setOpen(true)}
        activeOpacity={0.7}
      >
        {icon && (
          <MaterialCommunityIcons
            name={icon}
            size={SIZES.iconMD}
            color={error ? COLORS.error : COLORS.textSecondary}
            style={styles.icon}
          />
        )}
        <Text style={[styles.value, !value && styles.placeholder]} numberOfLines={1}>
          {value || placeholder}
        </Text>
        <MaterialCommunityIcons name="chevron-down" size={20} color={COLORS.textSecondary} />
      </TouchableOpacity>

      {!!error && <Text style={styles.error}>{error}</Text>}

      <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={close}>
          <TouchableOpacity style={styles.sheet} activeOpacity={1}>
            <Text style={styles.sheetTitle}>{title ?? label?.replace(/\s*\*$/, '') ?? 'Select'}</Text>

            {options.length > 8 && (
              <View style={styles.searchRow}>
                <MaterialCommunityIcons name="magnify" size={18} color={COLORS.textSecondary} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search..."
                  placeholderTextColor={COLORS.textDisabled}
                  value={query}
                  onChangeText={setQuery}
                  autoComplete="off"
                />
              </View>
            )}

            <FlatList
              data={filtered}
              keyExtractor={item => item}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.option, item === value && styles.optionActive]}
                  onPress={() => {
                    onSelect(item);
                    close();
                  }}
                >
                  <Text style={[styles.optionText, item === value && styles.optionTextActive]}>{item}</Text>
                  {item === value && <MaterialCommunityIcons name="check" size={18} color={COLORS.primary} />}
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={styles.empty}>No matches</Text>}
            />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
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
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radiusMD,
    backgroundColor: COLORS.background,
    paddingHorizontal: SIZES.paddingMD,
    height: SIZES.buttonMD + 2,
  },
  fieldError: {
    borderColor: COLORS.error,
  },
  icon: {
    marginRight: SIZES.paddingSM,
  },
  value: {
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
    backgroundColor: COLORS.overlay,
    justifyContent: 'center',
    padding: SIZES.paddingLG,
  },
  sheet: {
    backgroundColor: COLORS.background,
    borderRadius: SIZES.radiusLG,
    paddingVertical: SIZES.paddingMD,
    maxHeight: '75%',
  },
  sheetTitle: {
    fontSize: SIZES.fontLG,
    fontWeight: '700',
    color: COLORS.textPrimary,
    paddingHorizontal: SIZES.paddingMD,
    marginBottom: SIZES.paddingSM,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginHorizontal: SIZES.paddingMD,
    marginBottom: SIZES.paddingSM,
    paddingHorizontal: SIZES.paddingSM,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radiusSM,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 8,
    fontSize: SIZES.fontMD,
    color: COLORS.textPrimary,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.paddingMD,
    paddingVertical: 13,
  },
  optionActive: {
    backgroundColor: COLORS.primaryLight,
  },
  optionText: {
    fontSize: SIZES.fontMD,
    color: COLORS.textPrimary,
  },
  optionTextActive: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  empty: {
    textAlign: 'center',
    color: COLORS.textSecondary,
    paddingVertical: SIZES.paddingLG,
  },
});

export default SelectField;
