import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS, SIZES } from '../../constants';

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({ message, onRetry }) => {
  return (
    <View style={styles.container}>
      <MaterialCommunityIcons name="alert-circle" size={SIZES.iconXL} color={COLORS.error} />
      <Text style={styles.message}>{message}</Text>
      {onRetry && (
        <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SIZES.paddingXL,
  },
  message: {
    fontSize: SIZES.fontMD,
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginTop: SIZES.paddingMD,
    marginBottom: SIZES.paddingLG,
  },
  retryButton: {
    paddingHorizontal: SIZES.paddingLG,
    paddingVertical: SIZES.paddingMD,
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.radiusMD,
  },
  retryText: {
    color: COLORS.textWhite,
    fontSize: SIZES.fontMD,
    fontWeight: '600',
  },
});

export default ErrorMessage;

