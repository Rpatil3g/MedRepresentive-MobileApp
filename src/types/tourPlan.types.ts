export type ActivityType = 'FIELD_WORK' | 'MEETING' | 'TRAINING' | 'LEAVE' | 'HOLIDAY';
export type LeaveType = 'SICK' | 'CASUAL' | 'EARNED';
export type PlanStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED';

export type ContactKind = 'doctor' | 'chemist' | 'stockist';

/** A doctor, chemist or stockist planned for a day. */
export interface PlannedContact {
  id: string;
  name: string;
  kind: ContactKind;
}

// ─── Request DTOs ────────────────────────────────────────────────────────────

export interface TourPlanDetailInput {
  planDate: string;       // ISO date string  'YYYY-MM-DD'
  routeId?: string;
  headquartersId?: string;
  activityType: ActivityType;
  leaveType?: LeaveType;
  leaveReason?: string;
  plannedDoctorIds?: string[];
  plannedChemistIds?: string[];
  plannedStockistIds?: string[];
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
  headquartersId?: string;
  headquartersName?: string;
  activityType: ActivityType;
  leaveType?: LeaveType;
  leaveReason?: string;
  estimatedCalls: number;
  notes?: string;
  plannedDoctorIds: string[];
  plannedChemistIds?: string[];
  plannedStockistIds?: string[];
  plannedContactNames: string[];
  /** Every planned contact with its type (backend sends Kind as "Doctor" / "Chemist" / "Stockist"). */
  plannedContacts?: Array<{ id: string; name: string; kind: string }>;
  focusProductIds: string[];
}

/**
 * Planned contacts of a server day, typed. Falls back to doctors-only pairing for
 * responses from an API that predates plannedContacts.
 */
export const contactsOfDetail = (d: TourPlanDetailResponse): PlannedContact[] =>
  d.plannedContacts?.length
    ? d.plannedContacts.map(c => ({ id: c.id, name: c.name, kind: c.kind.toLowerCase() as ContactKind }))
    : (d.plannedDoctorIds ?? []).map((id, i) => ({ id, name: d.plannedContactNames?.[i] ?? id, kind: 'doctor' }));

/** Splits typed contacts into the per-type ID lists the API expects. */
export const idsByKind = (contacts: PlannedContact[] = []) => ({
  plannedDoctorIds: contacts.filter(c => c.kind === 'doctor').map(c => c.id),
  plannedChemistIds: contacts.filter(c => c.kind === 'chemist').map(c => c.id),
  plannedStockistIds: contacts.filter(c => c.kind === 'stockist').map(c => c.id),
});

/** "Dr. Anil Mehta" / "City Medicals (Chemist)" / "Shree Distributors (Stockist)" */
export const contactLabel = (c: PlannedContact): string => {
  if (c.kind === 'chemist') return `${c.name} (Chemist)`;
  if (c.kind === 'stockist') return `${c.name} (Stockist)`;
  return /^dr\.?\s/i.test(c.name) ? c.name : `Dr. ${c.name}`;
};

export type PlanFrequency = 'Monthly' | 'Weekly';

export interface TourPlanResponse {
  id: string;
  userId: string;
  userName: string;
  month: number;
  year: number;
  monthName: string;
  /** The plan covers a calendar month, or one week for customers who approve plans weekly */
  periodType: PlanFrequency;
  periodStart: string;
  periodEnd: string;
  /** "September 2026" or "29 Sep – 05 Oct 2026" */
  periodLabel: string;
  /** Date the plan should be submitted by */
  submitBy: string;
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

/** A week (or month) the MR has to plan — with its plan, if one has been saved */
export interface PlanPeriod {
  periodType: PlanFrequency;
  periodStart: string;
  periodEnd: string;
  periodLabel: string;
  submitBy: string;
  planId?: string | null;
  approvalStatus?: PlanStatus | null;
  approverRemarks?: string | null;
  plannedDays: number;
  totalWorkingDays: number;
}

/** The customer's planning setup — decides between the weekly and monthly tour plan screens */
export interface PlanningSettings {
  frequency: PlanFrequency;
  /** e.g. "Monday" */
  weekStartDay: string;
  /** e.g. ["Sunday"] */
  weeklyOffDays: string[];
}

/** 'YYYY-MM-DD' of a server date ('2026-09-29T00:00:00') without any timezone shift */
export const dateKey = (value: string): string => value.slice(0, 10);

/** The plan whose period holds the date, if any */
export const planForDate = (plans: TourPlanResponse[], date: string): TourPlanResponse | undefined =>
  plans.find(p => dateKey(p.periodStart) <= date && dateKey(p.periodEnd) >= date);

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
  hqId?: string;
  hqName?: string;
  routeId?: string;
  routeName?: string;
  /** Doctors, chemists and stockists planned for the day, each with its type */
  plannedContacts?: PlannedContact[];
  focusProductIds?: string[];
  focusProductNames?: string[];   // display names for pills
  estimatedCalls: number;
  notes?: string;
  leaveType?: LeaveType;
}
