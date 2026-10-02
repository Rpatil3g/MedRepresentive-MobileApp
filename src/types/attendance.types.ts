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
  /** Set once the day is closed; null while still punched in */
  dayStatus?: DayStatus | null;
  /** MR didn't punch out — the day was closed automatically at their last activity */
  isAutoPunchOut?: boolean;
  remarks?: string;
}

export type DayStatus = 'Present' | 'Half Day' | 'Absent';

export interface AttendanceSummary {
  totalDays: number;
  /** Days that aren't weekly offs, holidays or planned leave */
  workingDays: number;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  halfDays: number;
  leaveDays: number;
  holidayDays: number;
  punchOutMissedDays: number;
  /** Absent days on which visits were still logged */
  punchInMissedDays: number;
  averageWorkHours: number;
}

/**
 * Status of one calendar day. Present / Half Day / Absent come from hours worked (or a missed
 * working day); On Duty = today, still punched in; Not Marked = today, not punched in yet.
 */
export type AttendanceDayStatus =
  | 'Present'
  | 'Half Day'
  | 'Absent'
  | 'On Duty'
  | 'Leave'
  | 'Holiday'
  | 'Weekly Off'
  | 'Not Marked'
  | 'Upcoming';

export interface AttendanceDay {
  date: string;
  status: AttendanceDayStatus;
  holidayName?: string | null;
  isLate: boolean;
  isAutoPunchOut: boolean;
  /** Absent day on which visits were still logged — punch-in probably forgotten */
  hasVisitsWithoutPunchIn: boolean;
  punchInTime?: string | null;
  punchOutTime?: string | null;
  punchInAddress?: string | null;
  punchOutAddress?: string | null;
  workDurationMinutes?: number | null;
}

export interface AttendanceCalendar {
  year: number;
  month: number;
  summary: AttendanceSummary;
  days: AttendanceDay[];
}

export interface AttendanceStatus {
  hasPunchedIn: boolean;
  hasPunchedOut: boolean;
  /** Today was closed automatically because the MR didn't punch out */
  isAutoPunchOut?: boolean;
  /** When to remind an MR who is still punched in to punch out (UTC ISO) */
  punchOutReminderAtUtc?: string;
}

/** What punching out now would record — shown before the MR confirms */
export interface PunchOutPreview {
  workedMinutes: number;
  dayStatus: DayStatus;
  fullDayMinHours: number;
  halfDayMinHours: number;
}

export interface AttendanceListRequest {
  fromDate: string;
  toDate: string;
  userId?: string;
  pageNumber?: number;
  pageSize?: number;
}
