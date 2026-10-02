import { ApprovalStatus } from './doctor.types';

export interface Chemist {
  id: string;
  chemistName: string;
  pharmacyName?: string;
  routeId?: string;
  routeName?: string;
  licenseNumber?: string;
  category?: string;
  mobileNumber?: string;
  alternateMobile?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  latitude?: number;
  longitude?: number;
  monthlyPotential?: number;
  notes?: string;
  isActive: boolean;
  approvalStatus?: ApprovalStatus;
  rejectionReason?: string;
  totalVisits?: number;
  lastVisitDate?: string;
  createdAt: string;
}

export interface CreateChemistRequest {
  chemistName?: string;  // owner name — optional when adding
  pharmacyName: string;
  routeId?: string;
  licenseNumber?: string;
  category?: string;
  mobileNumber?: string;
  alternateMobile?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  latitude?: number;
  longitude?: number;
  monthlyPotential?: number;
  notes?: string;
}
