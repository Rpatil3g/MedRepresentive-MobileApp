import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet, Modal } from 'react-native';
import { COLORS, SIZES } from '../../constants';

export interface LoadingProps {
  visible: boolean;
  message?: string;
}

const Loading: React.FC<LoadingProps> = ({ visible, message }) => {
  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.container}>
        <View style={styles.content}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          {message && <Text style={styles.message}>{message}</Text>}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.overlay,
  },
  content: {
    backgroundColor: COLORS.background,
    padding: SIZES.paddingXL,
    borderRadius: SIZES.radiusLG,
    alignItems: 'center',
    minWidth: 150,
  },
  message: {
    marginTop: SIZES.paddingMD,
    fontSize: SIZES.fontMD,
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
});

export default Loading;

