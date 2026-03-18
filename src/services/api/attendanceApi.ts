import axiosInstance from './axiosInstance';
import { API_CONFIG } from '../../config/api.config';
import {
  PunchInRequest,
  PunchOutRequest,
  AttendanceRecord,
  AttendanceSummary,
  AttendanceStatus,
  AttendanceListRequest,
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

  getAttendanceByDate: async (date: string): Promise<AttendanceRecord | null> => {
    const response = await axiosInstance.get(`${BASE}/by-date`, { params: { date } });
    return response.data;
  },

  getAttendanceList: async (params: AttendanceListRequest) => {
    const response = await axiosInstance.get(BASE, { params });
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
