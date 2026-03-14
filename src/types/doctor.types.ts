export interface Doctor {
  id: string;
  doctorName: string;
  qualification?: string;
  specialty?: string;
  category?: string;
  registrationNumber?: string;
  mobileNumber?: string;
  email?: string;
  clinicName?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  geoLocation?: GeoLocation;
  averagePatientPerDay?: number;
  bestTimeToVisit?: string;
  notes?: string;
  routeId?: string;
  territoryId?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GeoLocation {
  latitude: number;
  longitude: number;
}

export interface CreateDoctorRequest {
  doctorName: string;
  qualification?: string;
  specialty?: string;
  category?: string;
  registrationNumber?: string;
  mobileNumber?: string;
  email?: string;
  clinicName?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  latitude?: number;
  longitude?: number;
  averagePatientPerDay?: number;
  bestTimeToVisit?: string;
  notes?: string;
  territoryId?: string;
}

export interface DoctorListRequest {
  pageNumber?: number;
  pageSize?: number;
  searchQuery?: string;
  specialty?: string;
  category?: string;
  city?: string;
  territoryId?: string;
  isActive?: boolean;
}
