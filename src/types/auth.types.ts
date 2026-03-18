export interface LoginRequest {
  email: string;
  password: string;
  deviceId?: string;
  deviceModel?: string;  // maps to DeviceModel on backend
  deviceOs?: string;     // maps to DeviceOS on backend  e.g. "android" | "ios"
}

export interface LoginResponse {
  token: string;
  refreshToken: string;
  expiresIn: number;
  user: UserProfile;
}

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  mobileNumber?: string;
  role: string;
  isActive: boolean;
  profileImageUrl?: string;
  lastLoginAt?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  token: string;
  refreshToken: string;
  expiresIn: number;
}
