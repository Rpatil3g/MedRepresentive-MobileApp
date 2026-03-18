import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { COLORS, SIZES } from '../../constants';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  icon,
  style,
  textStyle,
}) => {
  const buttonStyles = [
    styles.button,
    styles[`button_${variant}`],
    styles[`button_${size}`],
    disabled && styles.button_disabled,
    style,
  ];

  const textStyles = [
    styles.text,
    styles[`text_${variant}`],
    styles[`text_${size}`],
    disabled && styles.text_disabled,
    textStyle,
  ];

  return (
    <TouchableOpacity
      style={buttonStyles}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'outline' ? COLORS.primary : COLORS.textWhite}
        />
      ) : (
        <>
          {icon && <>{icon}</>}
          <Text style={textStyles}>{title}</Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: SIZES.radiusMD,
    paddingHorizontal: SIZES.paddingLG,
    gap: SIZES.paddingSM,
  },

  button_primary: {
    backgroundColor: COLORS.primary,
  },
  button_secondary: {
    backgroundColor: COLORS.secondary,
  },
  button_outline: {
    backgroundColor: COLORS.transparent,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  button_danger: {
    backgroundColor: COLORS.error,
  },

  button_small: {
    height: SIZES.buttonSM,
  },
  button_medium: {
    height: SIZES.buttonMD,
  },
  button_large: {
    height: SIZES.buttonLG,
  },

  button_disabled: {
    backgroundColor: COLORS.backgroundGray,
    borderColor: COLORS.border,
  },

  text: {
    fontWeight: '600',
  },
  text_primary: {
    color: COLORS.textWhite,
  },
  text_secondary: {
    color: COLORS.textWhite,
  },
  text_outline: {
    color: COLORS.primary,
  },
  text_danger: {
    color: COLORS.textWhite,
  },
  text_small: {
    fontSize: SIZES.fontSM,
  },
  text_medium: {
    fontSize: SIZES.fontMD,
  },
  text_large: {
    fontSize: SIZES.fontLG,
  },
  text_disabled: {
    color: COLORS.textDisabled,
  },
});

export default Button;

