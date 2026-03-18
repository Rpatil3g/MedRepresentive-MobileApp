import * as Yup from 'yup';

export const loginSchema = Yup.object().shape({
  email: Yup.string().email('Please enter a valid email').required('Email is required'),
  password: Yup.string()
    .min(6, 'Password must be at least 6 characters')
    .required('Password is required'),
});

export const changePasswordSchema = Yup.object().shape({
  currentPassword: Yup.string().required('Current password is required'),
  newPassword: Yup.string()
    .min(6, 'Password must be at least 6 characters')
    .required('New password is required'),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('newPassword')], 'Passwords must match')
    .required('Please confirm your password'),
});

export const doctorSchema = Yup.object().shape({
  doctorName: Yup.string().required('Doctor name is required'),
  specialty: Yup.string().required('Specialty is required'),
  mobileNumber: Yup.string()
    .matches(/^[0-9]{10}$/, 'Please enter a valid 10-digit mobile number')
    .required('Mobile number is required'),
  email: Yup.string().email('Please enter a valid email'),
  clinicName: Yup.string(),
  address: Yup.string(),
});

