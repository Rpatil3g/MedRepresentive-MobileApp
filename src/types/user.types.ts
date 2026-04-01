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
  territoryAssignments: TerritoryAssignment[];
}

export interface TerritoryAssignment {
  id: string;
  mrId: string;
  territoryId: string;
  territory: Territory;
  assignedDate: string;
  isActive: boolean;
}

export interface Territory {
  id: string;
  code: string;
  name: string;
  region?: string;
  state?: string;
  city?: string;
  description?: string;
}
