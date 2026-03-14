import { Doctor } from './doctor.types';

export interface Visit {
  id: string;
  mrId: string;
  doctorId?: string;
  chemistId?: string;
  visitType: 'Doctor' | 'Chemist';
  checkInTime: string;
  checkInLocation?: GeoLocation;
  checkOutTime?: string;
  checkOutLocation?: GeoLocation;
  distanceFromTargetMeters?: number;
  isGeofenceBreach: boolean;
  isPlannedVisit: boolean;
  durationMinutes?: number;
  purposeOfVisit?: string;
  productsDiscussed?: string;
  samplesGiven?: string;
  feedback?: string;
  nextActionPlan?: string;
  status: 'Checked-In' | 'Checked-Out' | 'Cancelled';
  isSynced: boolean;
  offlineId?: string;
  createdAt: string;
  updatedAt: string;
  doctor?: Doctor;
}

export interface CheckInVisitRequest {
  doctorId?: string;
  chemistId?: string;
  visitType: 'Doctor' | 'Chemist';
  latitude: number;
  longitude: number;
  isPlannedVisit: boolean;
  purposeOfVisit?: string;
}

export interface CheckOutVisitRequest {
  visitId: string;
  latitude: number;
  longitude: number;
  productsDiscussed?: string;
  samplesGiven?: string;
  feedback?: string;
  nextActionPlan?: string;
}

export interface VisitListRequest {
  pageNumber?: number;
  pageSize?: number;
  fromDate?: string;
  toDate?: string;
  visitType?: 'Doctor' | 'Chemist';
  status?: string;
}

export interface GeoLocation {
  latitude: number;
  longitude: number;
}
