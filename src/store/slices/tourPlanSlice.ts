import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  TourPlanResponse,
  MonthlyPlanCalendar,
  DraftDayEntry,
  PlanStatus,
} from '../../types/tourPlan.types';

interface TourPlanState {
  // The saved plan fetched from server for the viewed month
  currentPlan: TourPlanResponse | null;
  // Calendar data (all days of the month with plan details)
  calendar: MonthlyPlanCalendar | null;
  // Local draft being built before saving
  draftEntries: Record<string, DraftDayEntry>; // keyed by 'YYYY-MM-DD'
  // Which month/year is being viewed
  viewMonth: number;
  viewYear: number;
  loading: boolean;
  saving: boolean;
  error: string | null;
}

const now = new Date();

const initialState: TourPlanState = {
  currentPlan: null,
  calendar: null,
  draftEntries: {},
  viewMonth: now.getMonth() + 1,
  viewYear: now.getFullYear(),
  loading: false,
  saving: false,
  error: null,
};

const tourPlanSlice = createSlice({
  name: 'tourPlan',
  initialState,
  reducers: {
    setViewMonth: (state, action: PayloadAction<{ month: number; year: number }>) => {
      state.viewMonth = action.payload.month;
      state.viewYear = action.payload.year;
      // Clear data when navigating to a different month
      state.currentPlan = null;
      state.calendar = null;
      state.draftEntries = {};
    },
    setCurrentPlan: (state, action: PayloadAction<TourPlanResponse | null>) => {
      state.currentPlan = action.payload;
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
    loadDraftFromPlan: (state, action: PayloadAction<TourPlanResponse>) => {
      // Populate local draft entries from a saved DRAFT plan
      const entries: Record<string, DraftDayEntry> = {};
      for (const d of action.payload.details) {
        const dateKey = d.planDate.split('T')[0];
        entries[dateKey] = {
          date: dateKey,
          activityType: d.activityType,
          routeId: d.routeId,
          routeName: d.routeName,
          territoryId: d.territoryId,
          territoryName: d.territoryName,
          plannedDoctorIds: d.plannedDoctorIds,
          focusProductIds: d.focusProductIds,
          estimatedCalls: d.estimatedCalls,
          notes: d.notes,
          leaveType: d.leaveType,
        };
      }
      state.draftEntries = entries;
    },
    clearDraft: (state) => {
      state.draftEntries = {};
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
  setCurrentPlan,
  setCalendar,
  upsertDraftEntry,
  removeDraftEntry,
  loadDraftFromPlan,
  clearDraft,
  setLoading,
  setSaving,
  setError,
} = tourPlanSlice.actions;

export default tourPlanSlice.reducer;
