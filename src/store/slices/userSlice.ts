import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { MedicalRepProfile } from '../../types/user.types';

interface UserState {
  mrProfile: MedicalRepProfile | null;
  loading: boolean;
  error: string | null;
}

const initialState: UserState = {
  mrProfile: null,
  loading: false,
  error: null,
};

const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setMRProfile: (state, action: PayloadAction<MedicalRepProfile>) => {
      state.mrProfile = action.payload;
    },
    updateMRProfile: (state, action: PayloadAction<Partial<MedicalRepProfile>>) => {
      if (state.mrProfile) {
        state.mrProfile = { ...state.mrProfile, ...action.payload };
      }
    },
    clearMRProfile: (state) => {
      state.mrProfile = null;
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
  setMRProfile,
  updateMRProfile,
  clearMRProfile,
  setLoading,
  setError,
} = userSlice.actions;

export default userSlice.reducer;
