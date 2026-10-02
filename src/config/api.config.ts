import { API_BASE_URL, API_PREFIX, API_TIMEOUT } from '@env';

export const API_CONFIG = {
  BASE_URL: API_BASE_URL,
  PREFIX: API_PREFIX || '/api/v1',
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
    DOCTORS_MY_SUBMISSIONS: '/doctors/my-submissions',
    DOCTORS_NEARBY: '/doctors/nearby',

    // Chemists
    CHEMISTS: '/chemists',
    CHEMISTS_SEARCH: '/chemists/search',
    CHEMISTS_MY_SUBMISSIONS: '/chemists/my-submissions',

    // Stockists
    STOCKISTS: '/stockists',

    
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
    MEDICAL_REPS_REJECTED_COUNTS: '/medicalreps/me/rejected-counts',
    
    // Attendance
    ATTENDANCE: '/attendance',

    // Tour Plans (MTP)
    TOUR_PLANS: '/tour-plans',

    // Routes (for MTP day form dropdown)
    ROUTES: '/routes',

    // Headquarters (for MTP day form HQ/Location dropdown)
    HEADQUARTERS: '/headquarters',

    // Products
    PRODUCTS: '/products',
    PRODUCTS_CAMPAIGN: '/products/campaign',
    PRODUCTS_SEARCH: '/products/search',

    // Lookups (admin-managed dropdown values)
    LOOKUPS: '/lookups',

    // Storage (file upload)
    STORAGE_UPLOAD: '/storage/upload',

    // Live Tracking
    LIVE_TRACKING_UPDATE: '/live-tracking/update',

    // Expenses
    EXPENSES: '/expenses',
    EXPENSES_MY_EXPENSES: '/expenses/my-expenses',
    EXPENSES_BATCH: '/expenses/batch',

    // Orders
    ORDERS: '/orders',
    ORDERS_MY: '/orders/my',
    ORDERS_SUMMARY: '/orders/summary',
    ORDERS_CANCEL: '/orders/{id}/cancel',

    // Targets
    TARGETS_MY: '/targets/my',
    TARGETS_MY_HISTORY: '/targets/my/history',

    // Reports
    REPORTS_MR_DASHBOARD: '/reports/dashboards/mr',
  },
};
