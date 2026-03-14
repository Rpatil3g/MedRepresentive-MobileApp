export const APP_CONFIG = {
  APP_NAME: 'GoodPharma MR',
  VERSION: '1.0.0',
  
  // Location Tracking
  LOCATION_TRACKING_INTERVAL: 300000, // 5 minutes in milliseconds
  GEOFENCE_RADIUS: 100, // meters
  
  // Pagination
  DEFAULT_PAGE_SIZE: 20,
  
  // Cache Duration
  CACHE_DURATION: 3600000, // 1 hour in milliseconds
  
  // File Upload
  MAX_FILE_SIZE: 5242880, // 5MB in bytes
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png'],
  
  // Visit
  MIN_VISIT_DURATION: 300, // 5 minutes in seconds
  
  // Offline Sync
  MAX_OFFLINE_RECORDS: 100,
  SYNC_RETRY_INTERVAL: 60000, // 1 minute
};
