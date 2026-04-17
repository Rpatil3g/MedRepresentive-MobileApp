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
    CURRENT_USER: '/auth/me',
    
    // Doctors
    DOCTORS: '/doctors',
    DOCTORS_SEARCH: '/doctors/search',
    DOCTORS_NEARBY: '/doctors/nearby',
    DOCTORS_BY_TERRITORY: '/doctors/by-territory',

    // Chemists
    CHEMISTS: '/chemists',
    CHEMISTS_SEARCH: '/chemists/search',

    // Territories
    TERRITORIES: '/territories',
    TERRITORIES_MY_TERRITORIES: '/territories/my-territories',
    
    // Visits
    VISITS: '/visits',
    VISITS_CHECK_IN: '/visits/check-in',
    VISITS_CHECK_OUT: '/visits/check-out',
    VISITS_TODAY: '/visits/today',
    VISITS_SYNC_OFFLINE: '/visits/sync-offline',
    VISITS_SAMPLE_INVENTORY: '/visits/sample-inventory',
    
    // DCR
    DCR: '/dcr',
    DCR_MY_DCRS: '/dcr/my-dcrs',
    DCR_BY_DATE: '/dcr/by-date',
    DCR_CALENDAR: '/dcr/calendar',
    DCR_SUBMIT: '/dcr/{id}/submit',
    DCR_SUMMARY: '/dcr/summary',
    DCR_PERFORMANCE: '/dcr/performance',
    
    // Tasks
    TASKS: '/tasks',
    TASKS_MY_TASKS: '/tasks/my-tasks',
    TASKS_MY_SUMMARY: '/tasks/my-summary',
    TASKS_SUMMARY: '/tasks/summary',
    TASKS_OVERDUE: '/tasks/overdue',
    TASKS_DUE_TODAY: '/tasks/due-today',
    TASKS_COMPLETE: '/tasks/{id}/complete',
    
    // Profile
    MEDICAL_REPS: '/medicalreps',
    MEDICAL_REPS_BY_USER: '/medicalreps/by-user',
    MEDICAL_REPS_TERRITORIES: '/medicalreps/{mrId}/territories',
    
    // Attendance
    ATTENDANCE: '/attendance',

    // Tour Plans (MTP)
    TOUR_PLANS: '/tour-plans',

    // Routes (for MTP day form dropdown)
    ROUTES: '/routes',

    // Products
    PRODUCTS: '/products',
    PRODUCTS_CAMPAIGN: '/products/campaign',
    PRODUCTS_SEARCH: '/products/search',

    // Lookups (admin-managed dropdown values)
    LOOKUPS: '/lookups',

    // Live Tracking
    LIVE_TRACKING_UPDATE: '/live-tracking/update',

    // Expenses
    EXPENSES: '/expenses',
    EXPENSES_MY_EXPENSES: '/expenses/my-expenses',

    // Reports
    REPORTS_MR_DASHBOARD: '/reports/dashboards/mr',
  },
};
