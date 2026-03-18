import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { Button, Input, Loading } from '../../components/common';
import { COLORS, SIZES } from '../../constants';
import { loginSchema } from '../../utils/validation';
import { useAuth, isDeviceMismatchError } from '../../hooks/useAuth';

interface LoginFormData {
  email: string;
  password: string;
}

const LoginScreen: React.FC = () => {
  const { login, loading } = useAuth();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: yupResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    const result = await login(data.email, data.password);

    if (!result.success) {
      const errorMessage = result.error || 'Please check your credentials';

      if (isDeviceMismatchError(errorMessage)) {
        // Spec: display a clear "Contact Admin to Reset Device" error
        Alert.alert(
          'Device Not Authorized',
          'Your account is linked to a different device.\n\nPlease contact your administrator to reset the device binding.',
          [{ text: 'OK', style: 'default' }],
          { cancelable: false }
        );
      } else {
        Alert.alert('Login Failed', errorMessage);
      }
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
        <View style={styles.logoContainer}>
          <View style={styles.logoPlaceholder}>
            <Text style={styles.logoText}>GoodPharma</Text>
          </View>
          <Text style={styles.subtitle}>Medical Representative Portal</Text>
        </View>

        <View style={styles.formContainer}>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.description}>Sign in to continue with your account</Text>

          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Email"
                placeholder="Enter your email"
                icon="email"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.email?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <Input
                label="Password"
                placeholder="Enter your password"
                icon="lock"
                secureTextEntry
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                error={errors.password?.message}
              />
            )}
          />

          <Button
            title="Sign In"
            onPress={handleSubmit(onSubmit)}
            loading={loading}
            style={styles.loginButton}
          />

          <Text style={styles.version}>Version 1.0.0</Text>
        </View>
      </ScrollView>

      <Loading visible={loading} message="Signing in..." />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: SIZES.paddingLG,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: SIZES.paddingXL * 2,
    marginBottom: SIZES.paddingXL,
  },
  logoPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SIZES.paddingMD,
  },
  logoText: {
    fontSize: SIZES.font2XL,
    fontWeight: 'bold',
    color: COLORS.textWhite,
  },
  subtitle: {
    fontSize: SIZES.fontMD,
    color: COLORS.textSecondary,
  },
  formContainer: {
    flex: 1,
  },
  title: {
    fontSize: SIZES.font3XL,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: SIZES.paddingSM,
  },
  description: {
    fontSize: SIZES.fontMD,
    color: COLORS.textSecondary,
    marginBottom: SIZES.paddingXL,
  },
  loginButton: {
    marginTop: SIZES.paddingLG,
  },
  version: {
    textAlign: 'center',
    color: COLORS.textDisabled,
    fontSize: SIZES.fontSM,
    marginTop: SIZES.paddingXL,
  },
});

export default LoginScreen;
