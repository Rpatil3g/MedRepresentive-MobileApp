import axiosInstance from './axiosInstance';
import { API_CONFIG } from '../../config/api.config';
import {
  PunchInRequest,
  PunchOutRequest,
  AttendanceRecord,
  AttendanceSummary,
  AttendanceStatus,
  AttendanceListRequest,
  PunchOutPreview,
  AttendanceCalendar,
} from '../../types/attendance.types';

const BASE = API_CONFIG.ENDPOINTS.ATTENDANCE;

const attendanceApi = {
  punchIn: async (data: PunchInRequest): Promise<AttendanceRecord> => {
    const response = await axiosInstance.post(`${BASE}/punch-in`, data);
    return response.data;
  },

  punchOut: async (data: PunchOutRequest): Promise<AttendanceRecord> => {
    const response = await axiosInstance.post(`${BASE}/punch-out`, data);
    return response.data;
  },

  getTodayAttendance: async (): Promise<AttendanceRecord | null> => {
    const response = await axiosInstance.get(`${BASE}/today`);
    return response.data;
  },

  getAttendanceStatus: async (): Promise<AttendanceStatus> => {
    const response = await axiosInstance.get(`${BASE}/status`);
    return response.data;
  },

  /** Hours worked so far and the day status punching out now would record */
  getPunchOutPreview: async (): Promise<PunchOutPreview> => {
    const response = await axiosInstance.get(`${BASE}/punch-out-preview`);
    return response.data;
  },

  getAttendanceByDate: async (date: string): Promise<AttendanceRecord | null> => {
    const response = await axiosInstance.get(`${BASE}/by-date`, { params: { date } });
    return response.data;
  },

  getAttendanceList: async (params: AttendanceListRequest) => {
    const response = await axiosInstance.get(BASE, { params });
    return response.data;
  },

  /** A month with every day classified (present, absent, leave, holiday…) and the month's totals */
  getAttendanceCalendar: async (year: number, month: number): Promise<AttendanceCalendar> => {
    const response = await axiosInstance.get(`${BASE}/calendar`, { params: { year, month } });
    return response.data;
  },

  getAttendanceSummary: async (fromDate: string, toDate: string): Promise<AttendanceSummary> => {
    const response = await axiosInstance.get(`${BASE}/summary`, { params: { fromDate, toDate } });
    return response.data;
  },

  syncOffline: async (records: PunchInRequest[]): Promise<{ synced: number; records: AttendanceRecord[] }> => {
    const response = await axiosInstance.post(`${BASE}/sync-offline`, records);
    return response.data;
  },
};

export default attendanceApi;
