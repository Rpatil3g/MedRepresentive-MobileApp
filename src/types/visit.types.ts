export interface VisitSampleRequest {
  productId: string;
  quantity: number;
  batchNumber?: string;
  expiryDate?: string;
}

export interface VisitPhotoRequest {
  photoUrl: string;
  photoType?: string;
  caption?: string;
}

export interface VisitSampleResponse {
  id: string;
  productId: string;
  productName: string;
  packSize?: string;
  quantity: number;
  batchNumber?: string;
  expiryDate?: string;
}

export interface VisitPhotoResponse {
  id: string;
  photoUrl: string;
  photoType?: string;
  caption?: string;
  uploadedAt: string;
}

// Matches backend VisitResponseDto
export interface Visit {
  id: string;
  mrId: string;
  mrName: string;
  mrEmployeeId: string;

  // Visit Target (flat fields — no nested doctor object)
  doctorId?: string;
  doctorName?: string;
  doctorSpecialty?: string;
  chemistId?: string;
  chemistName?: string;
  chemistShopName?: string;

  // Visit Details
  visitDateTime: string;
  checkInTime?: string;
  checkOutTime?: string;
  visitLatitude?: number;
  visitLongitude?: number;
  distanceFromTargetMeters?: number;
  isGeofenceBreach: boolean;
  isPlannedVisit: boolean;
  visitType?: string;
  callType?: string;
  callOutcome?: string;
  visitDurationMinutes: number;
  visitDurationFormatted: string;
  status: 'Checked-In' | 'Checked-Out' | 'Completed' | 'Cancelled';

  // Interaction Details
  productsDiscussed: string[];
  issuesDiscussed?: string;
  feedback?: string;
  competitorInfo?: string;
  nextActionPlan?: string;

  // Presentation
  presentationTimeSeconds: number;
  presentationTimeFormatted: string;
  visualsShown: string[];
  giftsGiven?: string;

  // Order Information
  isOrderBooked: boolean;
  orderValue?: number;

  // Samples & Photos
  samples: VisitSampleResponse[];
  photos: VisitPhotoResponse[];

  // Metadata
  isSynced: boolean;
  createdAt: string;
}

// Matches backend CreateVisitDto
export interface CreateVisitRequest {
  doctorId?: string;
  chemistId?: string;
  visitDateTime: string;
  checkInTime?: string;
  latitude?: number;
  longitude?: number;
  isPlannedVisit: boolean;
  visitType?: string;
  callType?: string;
  callOutcome?: string;
  productsDiscussed?: string;
  issuesDiscussed?: string;
  feedback?: string;
  competitorInfo?: string;
  nextActionPlan?: string;
  presentationTimeSeconds?: number;
  visualsShown?: string;
  giftsGiven?: string;
  isOrderBooked: boolean;
  orderValue?: number;
  samples?: VisitSampleRequest[];
  photos?: VisitPhotoRequest[];
  offlineId?: string;
}

// Matches backend CheckInVisitDto
export interface CheckInVisitRequest {
  doctorId?: string;
  chemistId?: string;
  checkInTime: string;
  latitude: number;
  longitude: number;
  isPlannedVisit: boolean;
  visitType?: string;
  offlineId?: string;
}

// Matches backend CheckOutVisitDto
export interface CheckOutVisitRequest {
  visitId: string;
  checkOutTime: string;
  productsDiscussed?: string;
  issuesDiscussed?: string;
  feedback?: string;
  competitorInfo?: string;
  nextActionPlan?: string;
  presentationTimeSeconds?: number;
  visualsShown?: string;
  giftsGiven?: string;
  isOrderBooked?: boolean;
  orderValue?: number;
  samples?: VisitSampleRequest[];
  photos?: VisitPhotoRequest[];
}

// Matches backend UpdateVisitDto
export interface UpdateVisitRequest {
  checkOutTime?: string;
  visitDurationMinutes?: number;
  productsDiscussed?: string;
  issuesDiscussed?: string;
  feedback?: string;
  competitorInfo?: string;
  nextActionPlan?: string;
  presentationTimeSeconds?: number;
  visualsShown?: string;
  giftsGiven?: string;
  isOrderBooked?: boolean;
  orderValue?: number;
  samples?: VisitSampleRequest[];
  photos?: VisitPhotoRequest[];
}

export interface VisitListRequest {
  pageNumber?: number;
  pageSize?: number;
  fromDate?: string;
  toDate?: string;
  visitType?: string;
  status?: string;
  searchTerm?: string;
}

// Matches backend SampleInventoryDto
export interface SampleInventoryItem {
  productId: string;
  productName: string;
  packSize?: string;
  closingBalance: number;
  openingBalance: number;
  received: number;
  distributedQuantity: number;
}

// Matches backend SyncOfflineVisitsResultDto
export interface SyncOfflineVisitsResult {
  totalRecords: number;
  successCount: number;
  failureCount: number;
  errors: string[];
  syncedVisitIds: string[];
}
