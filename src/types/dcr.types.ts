export interface DailyCallReport {
  id: string;
  mrId: string;
  reportDate: string;
  workType?: string;
  totalVisits: number;
  doctorVisits: number;
  chemistVisits: number;
  distanceTraveledKm?: number;
  startLocation?: string;
  endLocation?: string;
  remarks?: string;
  status: 'Draft' | 'Submitted' | 'Approved' | 'Rejected';
  submittedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  approvalComments?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDCRRequest {
  reportDate: string;
  workType?: string;
  totalVisits: number;
  doctorVisits: number;
  chemistVisits: number;
  distanceTraveledKm?: number;
  startLocation?: string;
  endLocation?: string;
  remarks?: string;
}

export interface DCRListRequest {
  pageNumber?: number;
  pageSize?: number;
  fromDate?: string;
  toDate?: string;
  status?: string;
}

export interface DCRCalendarDay {
  date: string;
  hasReport: boolean;
  status?: 'Draft' | 'Submitted' | 'Approved' | 'Rejected';
  totalVisits?: number;
}

export interface DCRSummary {
  totalReports: number;
  submittedReports: number;
  approvedReports: number;
  rejectedReports: number;
  totalVisits: number;
  totalDoctorVisits: number;
  totalChemistVisits: number;
  totalDistanceKm: number;
  averageVisitsPerDay: number;
}
