import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SIZES } from '../../constants';

const DCRDetailScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>DCR Detail - Coming Soon</Text>
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

export default DCRDetailScreen;
