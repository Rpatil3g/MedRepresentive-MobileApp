import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TextInputProps,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS, SIZES } from '../../constants';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  icon?: string;
  secureTextEntry?: boolean;
  containerStyle?: ViewStyle;
}

const Input: React.FC<InputProps> = ({
  label,
  error,
  icon,
  secureTextEntry,
  containerStyle,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}

      <View
        style={[
          styles.inputContainer,
          isFocused && styles.inputContainer_focused,
          error && styles.inputContainer_error,
        ]}
      >
        {icon && (
          <MaterialCommunityIcons
            name={icon}
            size={SIZES.iconMD}
            color={error ? COLORS.error : isFocused ? COLORS.primary : COLORS.textSecondary}
            style={styles.icon}
          />
        )}

        <TextInput
          style={styles.input}
          placeholderTextColor={COLORS.textDisabled}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          secureTextEntry={secureTextEntry && !isPasswordVisible}
          {...props}
        />

        {secureTextEntry && (
          <TouchableOpacity
            onPress={() => setIsPasswordVisible(!isPasswordVisible)}
            style={styles.eyeIcon}
          >
            <MaterialCommunityIcons
              name={isPasswordVisible ? 'eye-off' : 'eye'}
              size={SIZES.iconMD}
              color={COLORS.textSecondary}
            />
          </TouchableOpacity>
        )}
      </View>

      {!!error && <Text style={styles.error}>{error}</Text>}
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
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.radiusMD,
    backgroundColor: COLORS.background,
    paddingHorizontal: SIZES.paddingMD,
  },
  inputContainer_focused: {
    borderColor: COLORS.primary,
    borderWidth: 2,
  },
  inputContainer_error: {
    borderColor: COLORS.error,
  },
  icon: {
    marginRight: SIZES.paddingSM,
  },
  input: {
    flex: 1,
    height: SIZES.buttonMD,
    fontSize: SIZES.fontMD,
    color: COLORS.textPrimary,
  },
  eyeIcon: {
    padding: SIZES.paddingSM,
  },
  error: {
    fontSize: SIZES.fontSM,
    color: COLORS.error,
    marginTop: SIZES.paddingXS,
    marginLeft: SIZES.paddingXS,
  },
});

export default Input;

