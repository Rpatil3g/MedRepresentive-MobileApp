import React, { useState } from 'react';
import {
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { Button, Input } from '../../components/common';
import { COLORS, SIZES } from '../../constants';
import { changePasswordSchema } from '../../utils/validation';
import authApi from '../../services/api/authApi';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { clearMustChangePassword } from '../../store/slices/authSlice';

interface ChangePasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const ChangePasswordScreen: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const mustChangePassword = useAppSelector((state) => state.auth.user?.mustChangePassword);
  const [loading, setLoading] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordFormData>({
    resolver: yupResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: ChangePasswordFormData) => {
    setLoading(true);
    try {
      await authApi.changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
        confirmPassword: data.confirmPassword,
      });
      reset();
      if (mustChangePassword) {
        dispatch(clearMustChangePassword());
      } else {
        Alert.alert(
          'Password Changed',
          'Your password has been updated successfully.',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        'Failed to change password. Please try again.';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {mustChangePassword && (
          <View style={styles.warningBanner}>
            <Text style={styles.warningText}>
              Your password has been reset by an administrator. You must set a new password before continuing.
            </Text>
          </View>
        )}
        <Text style={styles.description}>
          Enter your current password and choose a new one.
        </Text>

        <Controller
          control={control}
          name="currentPassword"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Current Password"
              placeholder="Enter current password"
              icon="lock-outline"
              secureTextEntry
              onChangeText={onChange}
              onBlur={onBlur}
              value={value}
              error={errors.currentPassword?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="newPassword"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="New Password"
              placeholder="Enter new password"
              icon="lock"
              secureTextEntry
              onChangeText={onChange}
              onBlur={onBlur}
              value={value}
              error={errors.newPassword?.message}
            />
          )}
        />

        <Controller
          control={control}
          name="confirmPassword"
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Confirm New Password"
              placeholder="Re-enter new password"
              icon="lock-check"
              secureTextEntry
              onChangeText={onChange}
              onBlur={onBlur}
              value={value}
              error={errors.confirmPassword?.message}
            />
          )}
        />

        <Button
          title="Change Password"
          onPress={handleSubmit(onSubmit)}
          loading={loading}
          style={styles.button}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundGray,
  },
  scrollContent: {
    padding: SIZES.paddingLG,
    flexGrow: 1,
  },
  warningBanner: {
    backgroundColor: '#FFF3CD',
    borderLeftWidth: 4,
    borderLeftColor: '#FFA000',
    borderRadius: 6,
    padding: SIZES.paddingMD,
    marginBottom: SIZES.paddingLG,
  },
  warningText: {
    fontSize: SIZES.fontSM,
    color: '#7A5800',
    lineHeight: 20,
  },
  description: {
    fontSize: SIZES.fontMD,
    color: COLORS.textSecondary,
    marginBottom: SIZES.paddingLG,
  },
  button: {
    marginTop: SIZES.paddingMD,
  },
});

export default ChangePasswordScreen;
