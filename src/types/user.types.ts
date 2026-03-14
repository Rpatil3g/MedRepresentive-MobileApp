export interface MedicalRepProfile {
  id: string;
  userId: string;
  employeeId: string;
  designation?: string;
  department?: string;
  dateOfJoining?: string;
  managerId?: string;
  managerName?: string;
  user: UserProfile;
  territories: TerritoryAssignment[];
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
}
