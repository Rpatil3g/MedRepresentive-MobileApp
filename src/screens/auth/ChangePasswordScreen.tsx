import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SIZES } from '../../constants';

const ChangePasswordScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Change Password Screen - Coming in Phase 3</Text>
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
  },
});

export default ChangePasswordScreen;
