import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SIZES } from '../../constants';

const DCRCalendarScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>DCR Calendar - Coming Soon</Text>
      <Text style={styles.subtext}>Monthly calendar view will be implemented here</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  text: {
    fontSize: SIZES.fontLG,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  subtext: {
    fontSize: SIZES.fontMD,
    color: COLORS.textSecondary,
    marginTop: SIZES.paddingSM,
  },
});

export default DCRCalendarScreen;
