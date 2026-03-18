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
  routeId?: string;
  routeName?: string;
  averagePatientPerDay?: number;
  bestTimeToVisit?: string;
  notes?: string;
  territoryId?: string;
  territoryName?: string;
  territoryCode?: string;
  latitude?: number;
  longitude?: number;
  geoLocation?: GeoLocation;
  isActive: boolean;
  totalVisits?: number;
  lastVisitDate?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface GeoLocation {
  latitude: number;
  longitude: number;
}

export interface CreateDoctorRequest {
  doctorName: string;
  routeId?: string;
  territoryId?: string;
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
}

export interface DoctorListRequest {
  routeId?: string;
  territoryId?: string;
  city?: string;
  state?: string;
  specialty?: string;
  category?: string;
  searchTerm?: string;
  isActive?: boolean;
  hasLocation?: boolean;
  pageNumber?: number;
  pageSize?: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

export interface PaginatedDoctorList {
  items: Doctor[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}
