export interface MedicalRepProfile {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  mobileNumber?: string;
  employeeId: string;
  employeeCode?: string;
  designation?: string;
  department?: string;
  dateOfJoining?: string;
  dateOfBirth?: string;
  gender?: string;
  managerId?: string;
  managerName?: string;
  headquartersId?: string;
  headquartersName?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  isActive: boolean;
  isDeviceLocked?: boolean;
  lastLoginAt?: string;
  createdAt?: string;
}


