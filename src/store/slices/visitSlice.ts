import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Visit } from '../../types/visit.types';

interface VisitState {
  visits: Visit[];
  todayVisits: Visit[];
  activeVisit: Visit | null; // Currently checked-in visit
  selectedVisit: Visit | null;
  offlineVisits: Visit[];
  loading: boolean;
  error: string | null;
  syncStatus: {
    isSyncing: boolean;
    lastSyncAt: string | null;
    pendingCount: number;
  };
}

const initialState: VisitState = {
  visits: [],
  todayVisits: [],
  activeVisit: null,
  selectedVisit: null,
  offlineVisits: [],
  loading: false,
  error: null,
  syncStatus: {
    isSyncing: false,
    lastSyncAt: null,
    pendingCount: 0,
  },
};

const visitSlice = createSlice({
  name: 'visit',
  initialState,
  reducers: {
    setVisits: (state, action: PayloadAction<Visit[]>) => {
      state.visits = action.payload;
    },
    setTodayVisits: (state, action: PayloadAction<Visit[]>) => {
      state.todayVisits = action.payload;
    },
    addVisit: (state, action: PayloadAction<Visit>) => {
      state.visits.unshift(action.payload);
      state.todayVisits.unshift(action.payload);
    },
    updateVisit: (state, action: PayloadAction<Visit>) => {
      const index = state.visits.findIndex(v => v.id === action.payload.id);
      if (index !== -1) {
        state.visits[index] = action.payload;
      }
      const todayIndex = state.todayVisits.findIndex(v => v.id === action.payload.id);
      if (todayIndex !== -1) {
        state.todayVisits[todayIndex] = action.payload;
      }
      if (state.activeVisit?.id === action.payload.id) {
        state.activeVisit = action.payload;
      }
    },
    setActiveVisit: (state, action: PayloadAction<Visit | null>) => {
      state.activeVisit = action.payload;
    },
    setSelectedVisit: (state, action: PayloadAction<Visit | null>) => {
      state.selectedVisit = action.payload;
    },
    addOfflineVisit: (state, action: PayloadAction<Visit>) => {
      state.offlineVisits.push(action.payload);
      state.syncStatus.pendingCount = state.offlineVisits.length;
    },
    clearOfflineVisits: (state) => {
      state.offlineVisits = [];
      state.syncStatus.pendingCount = 0;
    },
    setSyncStatus: (state, action: PayloadAction<Partial<typeof initialState.syncStatus>>) => {
      state.syncStatus = { ...state.syncStatus, ...action.payload };
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    removeVisit: (state, action: PayloadAction<string>) => {
      state.visits = state.visits.filter(v => v.id !== action.payload);
      state.todayVisits = state.todayVisits.filter(v => v.id !== action.payload);
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
});

export const {
  setVisits,
  setTodayVisits,
  addVisit,
  updateVisit,
  removeVisit,
  setActiveVisit,
  setSelectedVisit,
  addOfflineVisit,
  clearOfflineVisits,
  setSyncStatus,
  setLoading,
  setError,
} = visitSlice.actions;

export default visitSlice.reducer;
