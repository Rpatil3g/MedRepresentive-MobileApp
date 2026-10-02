import axiosInstance from './axiosInstance';
import { API_CONFIG } from '../../config/api.config';
import {
  CreateTourPlanRequest,
  TourPlanResponse,
  MonthlyPlanCalendar,
  TourPlanSummary,
  PlanPeriod,
  PlanningSettings,
} from '../../types/tourPlan.types';

const BASE = API_CONFIG.ENDPOINTS.TOUR_PLANS;

const tourPlanApi = {
  /** The customer's planning setup — weekly or monthly plans, week start, weekly offs */
  getSettings: async (): Promise<PlanningSettings> => {
    const response = await axiosInstance.get(`${BASE}/settings`);
    return response.data;
  },

  /** Every plan with days in the range (one monthly plan, or several weekly ones); dates 'YYYY-MM-DD' */
  getMyPlans: async (fromDate: string, toDate: string): Promise<TourPlanResponse[]> => {
    const response = await axiosInstance.get(`${BASE}/my-plans`, { params: { fromDate, toDate } });
    return response.data ?? [];
  },

  /** The weeks/months to plan in the range, each with its plan status and submit-by date */
  getPeriods: async (fromDate: string, toDate: string): Promise<PlanPeriod[]> => {
    const response = await axiosInstance.get(`${BASE}/periods`, { params: { fromDate, toDate } });
    return response.data ?? [];
  },

  /**
   * Save planned days. Each day goes into the plan for its own week/month (created as a draft
   * if needed); returns the plan of the first day sent.
   */
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

  /** Remove the plan for a single date from the current user's draft */
  clearDetail: async (date: string): Promise<void> => {
    await axiosInstance.delete(`${BASE}/my-plan/details/${date}`);
  },

  /** Get a plan by ID */
  getById: async (planId: string): Promise<TourPlanResponse> => {
    const response = await axiosInstance.get(`${BASE}/${planId}`);
    return response.data;
  },
};

export default tourPlanApi;
