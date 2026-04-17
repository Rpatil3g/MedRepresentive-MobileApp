export interface Chemist {
  id: string;
  chemistName: string;
  pharmacyName?: string;
  routeId?: string;
  routeName?: string;
  territoryId?: string;
  territoryName?: string;
  territoryCode?: string;
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
  totalVisits?: number;
  lastVisitDate?: string;
  createdAt: string;
}
