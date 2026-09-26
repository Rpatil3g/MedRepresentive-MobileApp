import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  TourPlanResponse,
  MonthlyPlanCalendar,
  DraftDayEntry,
} from '../../types/tourPlan.types';

interface TourPlanState {
  currentPlan: TourPlanResponse | null;
  calendar: MonthlyPlanCalendar | null;
  draftEntries: Record<string, DraftDayEntry>; // keyed by 'YYYY-MM-DD'
  viewMonth: number;
  viewYear: number;
  lastEditedDate: string | null; // set after saving a day plan so the calendar can scroll to it
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
  lastEditedDate: null,
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
      const entries: Record<string, DraftDayEntry> = {};
      for (const d of action.payload.details) {
        const dateKey = d.planDate.split('T')[0];
        const existing = state.draftEntries[dateKey];
        entries[dateKey] = {
          date: dateKey,
          activityType: d.activityType,
          // Fall back to locally-cached values when the server has no HQ for the day
          hqId: d.headquartersId ?? existing?.hqId,
          hqName: d.headquartersName ?? existing?.hqName,
          routeId: d.routeId,
          routeName: d.routeName,
          plannedDoctorIds: d.plannedDoctorIds,
          plannedDoctorNames: d.plannedContactNames?.length ? d.plannedContactNames : existing?.plannedDoctorNames,
          focusProductIds: d.focusProductIds,
          focusProductNames: existing?.focusProductNames,
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
  setCurrentPlan,
  setCalendar,
  upsertDraftEntry,
  removeDraftEntry,
  loadDraftFromPlan,
  clearDraft,
  setLastEditedDate,
  setLoading,
  setSaving,
  setError,
} = tourPlanSlice.actions;

export default tourPlanSlice.reducer;
