import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { logout } from './authSlice';

/** Things the manager sent back that the MR still has to fix — shown as red dots on the tab bar. */
export interface RejectedCounts {
  tourPlans: number;
  dcrs: number;
  expenses: number;
}

const initialState: RejectedCounts = { tourPlans: 0, dcrs: 0, expenses: 0 };

const alertsSlice = createSlice({
  name: 'alerts',
  initialState,
  reducers: {
    setRejectedCounts: (_state, action: PayloadAction<RejectedCounts>) => action.payload,
    clearRejectedCounts: () => initialState,
  },
  // Don't show the previous user's dots to the next person who logs in on this phone
  extraReducers: builder => {
    builder.addCase(logout, () => initialState);
  },
});

export const { setRejectedCounts, clearRejectedCounts } = alertsSlice.actions;
export default alertsSlice.reducer;
