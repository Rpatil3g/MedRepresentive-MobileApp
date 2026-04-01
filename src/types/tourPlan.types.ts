export type ActivityType = 'FIELD_WORK' | 'MEETING' | 'TRAINING' | 'LEAVE' | 'HOLIDAY';
export type LeaveType = 'SICK' | 'CASUAL' | 'EARNED';
export type PlanStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED';

// ─── Request DTOs ────────────────────────────────────────────────────────────

export interface TourPlanDetailInput {
  planDate: string;       // ISO date string  'YYYY-MM-DD'
  routeId?: string;
  territoryId?: string;
  activityType: ActivityType;
  leaveType?: LeaveType;
  leaveReason?: string;
  plannedDoctorIds?: string[];
  focusProductIds?: string[];
  estimatedCalls?: number;
  notes?: string;
}

export interface CreateTourPlanRequest {
  month: number;
  year: number;
  details: TourPlanDetailInput[];
}

// ─── Response DTOs ───────────────────────────────────────────────────────────

export interface TourPlanDetailResponse {
  id: string;
  planDate: string;
  routeId?: string;
  routeName?: string;
  territoryId?: string;
  territoryName?: string;
  activityType: ActivityType;
  leaveType?: LeaveType;
  leaveReason?: string;
  estimatedCalls: number;
  notes?: string;
  plannedDoctorIds: string[];
  focusProductIds: string[];
}

export interface TourPlanResponse {
  id: string;
  userId: string;
  userName: string;
  month: number;
  year: number;
  monthName: string;
  approvalStatus: PlanStatus;
  approverId?: string;
  approverName?: string;
  approvedAt?: string;
  approverRemarks?: string;
  submittedAt?: string;
  totalWorkingDays: number;
  plannedDays: number;
  details: TourPlanDetailResponse[];
  createdAt: string;
}

// ─── Calendar view types ─────────────────────────────────────────────────────

export interface DayPlan {
  date: string;
  dayOfWeek: string;
  isWeekend: boolean;
  isHoliday: boolean;
  activityType?: ActivityType;
  routeId?: string;
  routeName?: string;
  estimatedCalls: number;
  isPlanned: boolean;
}

export interface MonthlyPlanCalendar {
  month: number;
  year: number;
  monthName: string;
  days: DayPlan[];
}

// ─── Summary ─────────────────────────────────────────────────────────────────

export interface TourPlanSummary {
  totalPlans: number;
  pendingApproval: number;
  approved: number;
  rejected: number;
  draftPlans: number;
  approvalRate: number;
}

// ─── Local draft state (in-memory while building the plan) ───────────────────

export interface DraftDayEntry {
  date: string;
  activityType: ActivityType;
  routeId?: string;
  routeName?: string;
  territoryId?: string;
  territoryName?: string;
  plannedDoctorIds?: string[];
  plannedDoctorNames?: string[];  // display names for pills
  focusProductIds?: string[];
  focusProductNames?: string[];   // display names for pills
  estimatedCalls: number;
  notes?: string;
  leaveType?: LeaveType;
}
