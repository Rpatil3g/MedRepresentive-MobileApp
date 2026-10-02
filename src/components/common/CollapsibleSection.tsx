import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS, SIZES } from '../../constants';

interface CollapsibleSectionProps {
  title: string;
  /** Shown under the title while collapsed, e.g. which fields are inside. */
  hint?: string;
  initiallyOpen?: boolean;
  children: React.ReactNode;
}

/** Tap-to-expand block for optional form fields, so the first screen shows only what's needed. */
const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({ title, hint, initiallyOpen = false, children }) => {
  const [open, setOpen] = useState(initiallyOpen);

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.header} onPress={() => setOpen(o => !o)} activeOpacity={0.7}>
        <View style={styles.headerText}>
          <Text style={styles.title}>{title}</Text>
          {!open && hint ? <Text style={styles.hint} numberOfLines={1}>{hint}</Text> : null}
        </View>
        <MaterialCommunityIcons name={open ? 'chevron-up' : 'chevron-down'} size={22} color={COLORS.textSecondary} />
      </TouchableOpacity>
      {open && <View style={styles.body}>{children}</View>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radiusMD,
    marginTop: SIZES.paddingSM,
    marginBottom: SIZES.paddingMD,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.paddingMD,
    paddingVertical: 12,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: SIZES.fontMD,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  hint: {
    fontSize: SIZES.fontXS,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  body: {
    paddingHorizontal: SIZES.paddingMD,
    paddingBottom: SIZES.paddingSM,
  },
});

export default CollapsibleSection;
