import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  TourPlanResponse,
  MonthlyPlanCalendar,
  DraftDayEntry,
  PlanPeriod,
  PlanningSettings,
  contactsOfDetail,
} from '../../types/tourPlan.types';

interface TourPlanState {
  /** Every plan with days in the viewed month — one monthly plan, or several weekly ones */
  plans: TourPlanResponse[];
  /** The weeks (or month) to plan in the viewed month, with status and submit-by date */
  periods: PlanPeriod[];
  /** Customer's planning setup (weekly or monthly); null until loaded */
  settings: PlanningSettings | null;
  calendar: MonthlyPlanCalendar | null;
  /** Days of plans that can still be edited (Draft / Rejected), keyed by 'YYYY-MM-DD' */
  draftEntries: Record<string, DraftDayEntry>;
  viewMonth: number;
  viewYear: number;
  lastEditedDate: string | null; // set after saving a day plan so the calendar can scroll to it
  loading: boolean;
  saving: boolean;
  error: string | null;
}

const now = new Date();

const initialState: TourPlanState = {
  plans: [],
  periods: [],
  settings: null,
  calendar: null,
  draftEntries: {},
  viewMonth: now.getMonth() + 1,
  viewYear: now.getFullYear(),
  lastEditedDate: null,
  loading: false,
  saving: false,
  error: null,
};

const isEditable = (plan: TourPlanResponse) =>
  plan.approvalStatus === 'DRAFT' || plan.approvalStatus === 'REJECTED';

/** Draft entries for every day of the editable plans, keeping locally cached display values */
const buildDrafts = (
  plans: TourPlanResponse[],
  existing: Record<string, DraftDayEntry>,
): Record<string, DraftDayEntry> => {
  const entries: Record<string, DraftDayEntry> = {};
  for (const plan of plans.filter(isEditable)) {
    for (const d of plan.details) {
      const key = d.planDate.split('T')[0];
      const cached = existing[key];
      entries[key] = {
        date: key,
        activityType: d.activityType,
        // Fall back to locally-cached values when the server has no HQ for the day
        hqId: d.headquartersId ?? cached?.hqId,
        hqName: d.headquartersName ?? cached?.hqName,
        routeId: d.routeId,
        routeName: d.routeName,
        plannedContacts: contactsOfDetail(d),
        focusProductIds: d.focusProductIds,
        focusProductNames: cached?.focusProductNames,
        estimatedCalls: d.estimatedCalls,
        notes: d.notes,
        leaveType: d.leaveType,
      };
    }
  }
  return entries;
};

const tourPlanSlice = createSlice({
  name: 'tourPlan',
  initialState,
  reducers: {
    setViewMonth: (state, action: PayloadAction<{ month: number; year: number }>) => {
      state.viewMonth = action.payload.month;
      state.viewYear = action.payload.year;
      // Clear data when navigating to a different month
      state.plans = [];
      state.periods = [];
      state.calendar = null;
      state.draftEntries = {};
    },
    setSettings: (state, action: PayloadAction<PlanningSettings | null>) => {
      state.settings = action.payload;
    },
    /** Replace the month's plans (and rebuild the editable drafts from them) */
    setPlans: (state, action: PayloadAction<TourPlanResponse[]>) => {
      state.plans = action.payload;
      state.draftEntries = buildDrafts(action.payload, state.draftEntries);
    },
    /** Add or replace one plan, e.g. after saving a day or submitting a week */
    upsertPlan: (state, action: PayloadAction<TourPlanResponse>) => {
      const others = state.plans.filter(p => p.id !== action.payload.id);
      state.plans = [...others, action.payload].sort((a, b) => a.periodStart.localeCompare(b.periodStart));
      state.draftEntries = buildDrafts(state.plans, state.draftEntries);
    },
    setPeriods: (state, action: PayloadAction<PlanPeriod[]>) => {
      state.periods = action.payload;
    },
    setCalendar: (state, action: PayloadAction<MonthlyPlanCalendar | null>) => {
      state.calendar = action.payload;
    },
    upsertDraftEntry: (state, action: PayloadAction<DraftDayEntry>) => {
      state.draftEntries[action.payload.date] = action.payload;
    },
    removeDraftEntry: (state, action: PayloadAction<string>) => {
      delete state.draftEntries[action.payload];
    },
    clearDraft: (state) => {
      state.draftEntries = {};
    },
    setLastEditedDate: (state, action: PayloadAction<string | null>) => {
      state.lastEditedDate = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setSaving: (state, action: PayloadAction<boolean>) => {
      state.saving = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
});

export const {
  setViewMonth,
  setSettings,
  setPlans,
  upsertPlan,
  setPeriods,
  setCalendar,
  upsertDraftEntry,
  removeDraftEntry,
  clearDraft,
  setLastEditedDate,
  setLoading,
  setSaving,
  setError,
} = tourPlanSlice.actions;

export default tourPlanSlice.reducer;
