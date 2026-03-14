import { API_BASE_URL, API_PREFIX, API_TIMEOUT } from '@env';

export const API_CONFIG = {
  BASE_URL: API_BASE_URL || 'https://localhost:7177',
  PREFIX: API_PREFIX || '/api',
  TIMEOUT: parseInt(API_TIMEOUT || '30000', 10),
  
  // API Endpoints
  ENDPOINTS: {
    // Auth
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    REFRESH_TOKEN: '/auth/refresh-token',
    CHANGE_PASSWORD: '/auth/change-password',
    CURRENT_USER: '/auth/current-user',
    
    // Doctors
    DOCTORS: '/doctors',
    DOCTORS_SEARCH: '/doctors/search',
    DOCTORS_NEARBY: '/doctors/nearby',
    DOCTORS_BY_TERRITORY: '/doctors/territory',
    
    // Visits
    VISITS: '/visits',
    VISITS_CHECK_IN: '/visits/check-in',
    VISITS_CHECK_OUT: '/visits/check-out',
    VISITS_TODAY: '/visits/today',
    VISITS_SYNC_OFFLINE: '/visits/sync-offline',
    
    // DCR
    DCR: '/dcr',
    DCR_MY_DCRS: '/dcr/my-dcrs',
    DCR_BY_DATE: '/dcr/date',
    DCR_CALENDAR: '/dcr/calendar',
    DCR_SUBMIT: '/dcr/{id}/submit',
    DCR_SUMMARY: '/dcr/summary',
    DCR_PERFORMANCE: '/dcr/performance',
    
    // Tasks
    TASKS: '/tasks',
    TASKS_MY_TASKS: '/tasks/my-tasks',
    TASKS_SUMMARY: '/tasks/summary',
    TASKS_OVERDUE: '/tasks/overdue',
    TASKS_DUE_TODAY: '/tasks/due-today',
    TASKS_COMPLETE: '/tasks/{id}/complete',
    
    // Profile
    MEDICAL_REPS: '/medicalreps',
    MEDICAL_REPS_BY_USER: '/medicalreps/user',
    MEDICAL_REPS_TERRITORIES: '/medicalreps/{mrId}/territories',
    
    // Reports
    REPORTS_MR_DASHBOARD: '/reports/mr-dashboard',
  },
};
