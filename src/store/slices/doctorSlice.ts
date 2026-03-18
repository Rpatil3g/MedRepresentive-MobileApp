import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Doctor } from '../../types/doctor.types';

interface DoctorState {
  doctors: Doctor[];
  selectedDoctor: Doctor | null;
  loading: boolean;
  error: string | null;
  searchQuery: string;
  filters: {
    specialty?: string;
    category?: string;
    city?: string;
    territoryId?: string;
  };
  pagination: {
    currentPage: number;
    totalPages: number;
    totalCount: number;
  };
}

const initialState: DoctorState = {
  doctors: [],
  selectedDoctor: null,
  loading: false,
  error: null,
  searchQuery: '',
  filters: {},
  pagination: {
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
  },
};

const doctorSlice = createSlice({
  name: 'doctor',
  initialState,
  reducers: {
    setDoctors: (state, action: PayloadAction<Doctor[]>) => {
      state.doctors = action.payload;
    },
    addDoctor: (state, action: PayloadAction<Doctor>) => {
      state.doctors.unshift(action.payload);
    },
    updateDoctor: (state, action: PayloadAction<Doctor>) => {
      const index = state.doctors.findIndex(d => d.id === action.payload.id);
      if (index !== -1) {
        state.doctors[index] = action.payload;
      }
    },
    setSelectedDoctor: (state, action: PayloadAction<Doctor | null>) => {
      state.selectedDoctor = action.payload;
    },
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },
    setFilters: (state, action: PayloadAction<typeof initialState.filters>) => {
      state.filters = action.payload;
    },
    setPagination: (state, action: PayloadAction<typeof initialState.pagination>) => {
      state.pagination = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    clearDoctors: (state) => {
      state.doctors = [];
      state.pagination = initialState.pagination;
    },
  },
});

export const {
  setDoctors,
  addDoctor,
  updateDoctor,
  setSelectedDoctor,
  setSearchQuery,
  setFilters,
  setPagination,
  setLoading,
  setError,
  clearDoctors,
} = doctorSlice.actions;

export default doctorSlice.reducer;
