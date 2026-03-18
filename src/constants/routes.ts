export const ROUTES = {
  // Auth Stack
  LOGIN: 'Login',
  CHANGE_PASSWORD: 'ChangePassword',
  
  // Main Tab Navigation
  MAIN_TABS: 'MainTabs',
  
  // Tab Screens
  DASHBOARD: 'Dashboard',
  DOCTORS: 'Doctors',
  VISITS: 'Visits',
  DCR: 'DCR',
  MORE: 'More',
  
  // Doctor Stack
  DOCTOR_LIST: 'DoctorList',
  DOCTOR_DETAIL: 'DoctorDetail',
  ADD_DOCTOR: 'AddDoctor',
  
  // Visit Stack
  VISIT_LIST: 'VisitList',
  VISIT_CHECK_IN: 'VisitCheckIn',
  VISIT_DETAIL: 'VisitDetail',
  
  // DCR Stack
  DCR_LIST: 'DCRList',
  CREATE_DCR: 'CreateDCR',
  DCR_DETAIL: 'DCRDetail',
  DCR_CALENDAR: 'DCRCalendar',
  
  // Task Stack
  TASK_LIST: 'TaskList',
  TASK_DETAIL: 'TaskDetail',
  
  // Attendance Stack
  ATTENDANCE: 'Attendance',
  ATTENDANCE_HISTORY: 'AttendanceHistory',

  // Tour Plan Stack
  TOUR_PLAN: 'TourPlan',
  MTP_CALENDAR: 'MTPCalendar',
  MTP_DAY_FORM: 'DayPlanForm',
  MTP_SUMMARY: 'MTPSummary',

  // Profile Stack
  PROFILE: 'Profile',
  EDIT_PROFILE: 'EditProfile',
} as const;
