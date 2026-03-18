export interface PunchInRequest {
  timestamp: string; // ISO string
  latitude: number;
  longitude: number;
  address?: string;
  imageUrl?: string;
  batteryLevel?: number;
  offlineId?: string;
}

export interface PunchOutRequest {
  timestamp: string; // ISO string
  latitude: number;
  longitude: number;
  address?: string;
  remarks?: string;
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  userName: string;
  date: string;

  punchInTime?: string;
  punchInLatitude?: number;
  punchInLongitude?: number;
  punchInAddress?: string;
  isPunchInOutOfHQ: boolean;
  punchInDistanceFromHQ?: number;
  batteryLevel?: number;

  punchOutTime?: string;
  punchOutLatitude?: number;
  punchOutLongitude?: number;
  punchOutAddress?: string;

  workDurationMinutes?: number;
  workDurationFormatted?: string;
  isLate: boolean;
  isHalfDay: boolean;
  remarks?: string;
}

export interface AttendanceSummary {
  totalDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  halfDays: number;
  averageWorkHours: number;
}

export interface AttendanceStatus {
  hasPunchedIn: boolean;
  hasPunchedOut: boolean;
}

export interface AttendanceListRequest {
  fromDate: string;
  toDate: string;
  userId?: string;
  pageNumber?: number;
  pageSize?: number;
}
