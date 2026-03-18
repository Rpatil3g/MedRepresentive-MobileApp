import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { DailyCallReport, DCRCalendarDay, DCRSummary } from '../../types/dcr.types';

interface DCRState {
  dcrs: DailyCallReport[];
  selectedDCR: DailyCallReport | null;
  calendarData: DCRCalendarDay[];
  summary: DCRSummary | null;
  loading: boolean;
  error: string | null;
}

const initialState: DCRState = {
  dcrs: [],
  selectedDCR: null,
  calendarData: [],
  summary: null,
  loading: false,
  error: null,
};

const dcrSlice = createSlice({
  name: 'dcr',
  initialState,
  reducers: {
    setDCRs: (state, action: PayloadAction<DailyCallReport[]>) => {
      state.dcrs = action.payload;
    },
    addDCR: (state, action: PayloadAction<DailyCallReport>) => {
      state.dcrs.unshift(action.payload);
    },
    updateDCR: (state, action: PayloadAction<DailyCallReport>) => {
      const index = state.dcrs.findIndex(d => d.id === action.payload.id);
      if (index !== -1) {
        state.dcrs[index] = action.payload;
      }
    },
    removeDCR: (state, action: PayloadAction<string>) => {
      state.dcrs = state.dcrs.filter(d => d.id !== action.payload);
    },
    setSelectedDCR: (state, action: PayloadAction<DailyCallReport | null>) => {
      state.selectedDCR = action.payload;
    },
    setCalendarData: (state, action: PayloadAction<DCRCalendarDay[]>) => {
      state.calendarData = action.payload;
    },
    setSummary: (state, action: PayloadAction<DCRSummary>) => {
      state.summary = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
});

export const {
  setDCRs,
  addDCR,
  updateDCR,
  removeDCR,
  setSelectedDCR,
  setCalendarData,
  setSummary,
  setLoading,
  setError,
} = dcrSlice.actions;

export default dcrSlice.reducer;
