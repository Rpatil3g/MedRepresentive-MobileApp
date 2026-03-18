import axiosInstance from './axiosInstance';
import { API_CONFIG } from '../../config/api.config';
import {
  CreateTourPlanRequest,
  TourPlanResponse,
  MonthlyPlanCalendar,
  TourPlanSummary,
} from '../../types/tourPlan.types';

const BASE = API_CONFIG.ENDPOINTS.TOUR_PLANS;

const tourPlanApi = {
  /** Create or update a draft for the given month/year */
  createOrUpdate: async (data: CreateTourPlanRequest): Promise<TourPlanResponse> => {
    const response = await axiosInstance.post(BASE, data);
    return response.data;
  },

  /** Submit a draft plan for manager approval */
  submit: async (planId: string): Promise<TourPlanResponse> => {
    const response = await axiosInstance.post(`${BASE}/${planId}/submit`);
    return response.data;
  },

  /** Delete a draft plan */
  delete: async (planId: string): Promise<void> => {
    await axiosInstance.delete(`${BASE}/${planId}`);
  },

  /** Get the user's plan for a specific month/year (null if none exists) */
  getMyPlanByMonth: async (month: number, year: number): Promise<TourPlanResponse | null> => {
    const response = await axiosInstance.get(`${BASE}/my-plan`, { params: { month, year } });
    return response.data;
  },

  /** Get monthly calendar view showing planned/unplanned days */
  getMonthlyCalendar: async (month: number, year: number): Promise<MonthlyPlanCalendar> => {
    const response = await axiosInstance.get(`${BASE}/calendar`, { params: { month, year } });
    return response.data;
  },

  /** Get yearly summary */
  getMySummary: async (year?: number): Promise<TourPlanSummary> => {
    const response = await axiosInstance.get(`${BASE}/my-summary`, { params: year ? { year } : undefined });
    return response.data;
  },

  /** Check if the plan can still be edited */
  canEdit: async (month: number, year: number): Promise<boolean> => {
    const response = await axiosInstance.get(`${BASE}/can-edit`, { params: { month, year } });
    return response.data.canEdit;
  },

  /** Get a plan by ID */
  getById: async (planId: string): Promise<TourPlanResponse> => {
    const response = await axiosInstance.get(`${BASE}/${planId}`);
    return response.data;
  },
};

export default tourPlanApi;
