import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AttendanceRecord, AttendanceSummary, AttendanceStatus } from '../../types/attendance.types';

interface AttendanceState {
  todayRecord: AttendanceRecord | null;
  status: AttendanceStatus;
  history: AttendanceRecord[];
  summary: AttendanceSummary | null;
  offlineQueue: Array<{ latitude: number; longitude: number; timestamp: string; offlineId: string }>;
  loading: boolean;
  error: string | null;
}

const initialState: AttendanceState = {
  todayRecord: null,
  status: { hasPunchedIn: false, hasPunchedOut: false },
  history: [],
  summary: null,
  offlineQueue: [],
  loading: false,
  error: null,
};

const attendanceSlice = createSlice({
  name: 'attendance',
  initialState,
  reducers: {
    setTodayRecord: (state, action: PayloadAction<AttendanceRecord | null>) => {
      state.todayRecord = action.payload;
      if (action.payload) {
        state.status.hasPunchedIn = !!action.payload.punchInTime;
        state.status.hasPunchedOut = !!action.payload.punchOutTime;
      }
    },
    setAttendanceStatus: (state, action: PayloadAction<AttendanceStatus>) => {
      state.status = action.payload;
    },
    setHistory: (state, action: PayloadAction<AttendanceRecord[]>) => {
      state.history = action.payload;
    },
    setSummary: (state, action: PayloadAction<AttendanceSummary>) => {
      state.summary = action.payload;
    },
    addOfflineRecord: (state, action: PayloadAction<AttendanceState['offlineQueue'][0]>) => {
      state.offlineQueue.push(action.payload);
    },
    clearOfflineQueue: (state) => {
      state.offlineQueue = [];
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
  setTodayRecord,
  setAttendanceStatus,
  setHistory,
  setSummary,
  addOfflineRecord,
  clearOfflineQueue,
  setLoading,
  setError,
} = attendanceSlice.actions;

export default attendanceSlice.reducer;
