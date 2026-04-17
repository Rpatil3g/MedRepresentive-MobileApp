// Matches backend DCRResponseDto
export interface DailyCallReport {
  id: string;
  mrId: string;
  mrName: string;
  mrEmployeeId: string;
  reportDate: string;
  workType?: string;
  totalVisits: number;
  doctorVisits: number;
  chemistVisits: number;
  distanceTraveledKm?: number;
  startLocation?: string;
  endLocation?: string;
  remarks?: string;
  travelExpense?: number;
  daExpense?: number;
  otherExpense?: number;
  status: 'Draft' | 'Submitted' | 'Approved' | 'Rejected';
  submittedAt?: string;
  approvedBy?: string;
  approverName?: string;
  approvedAt?: string;
  approvalComments?: string;
  createdAt: string;
  updatedAt: string;
}

// Matches backend CreateDCRDto
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
  travelExpense?: number;
  daExpense?: number;
  otherExpense?: number;
}

export interface DCRListRequest {
  pageNumber?: number;
  pageSize?: number;
  fromDate?: string;
  toDate?: string;
  status?: string;
  workType?: string;
  searchQuery?: string;
}

// Matches backend DayDCRDto
export interface DCRCalendarDay {
  date: string;
  dayOfWeek: string;
  isWeekend: boolean;
  hasDCR: boolean;       // was incorrectly named hasReport before
  dcrId?: string;
  status?: 'Draft' | 'Submitted' | 'Approved' | 'Rejected';
  totalVisits?: number;
  workType?: string;
}

// Matches backend MonthlyDCRCalendarDto
export interface MonthlyDCRCalendar {
  month: number;
  year: number;
  monthName: string;
  days: DCRCalendarDay[];
}

// Matches backend DCRSummaryDto
export interface DCRSummary {
  totalReports: number;
  submittedReports: number;
  approvedReports: number;
  rejectedReports: number;
  draftReports: number;
  totalVisits: number;
  totalDoctorVisits: number;
  totalChemistVisits: number;
  totalDistanceTraveledKm: number;  // was incorrectly named totalDistanceKm before
  averageVisitsPerDay: number;
  approvalRate: number;
}
