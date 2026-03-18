import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  authReducer,
  userReducer,
  doctorReducer,
  visitReducer,
  dcrReducer,
  taskReducer,
  attendanceReducer,
  tourPlanReducer,
} from './slices';

const authPersistConfig = {
  key: 'auth',
  storage: AsyncStorage,
  whitelist: ['isAuthenticated', 'token', 'refreshToken', 'user'],
};

// Redux Persist Config
const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  whitelist: ['user'], // Persist additional non-auth slice data
  blacklist: ['doctor', 'visit', 'dcr', 'task', 'attendance', 'tourPlan'], // Don't persist these (always fetch fresh)
};

// Combine Reducers
const rootReducer = combineReducers({
  auth: persistReducer(authPersistConfig, authReducer),
  user: userReducer,
  doctor: doctorReducer,
  visit: visitReducer,
  dcr: dcrReducer,
  task: taskReducer,
  attendance: attendanceReducer,
  tourPlan: tourPlanReducer,
});

// Create Persisted Reducer
const persistedReducer = persistReducer(persistConfig, rootReducer);

// Configure Store
export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
});

// Create Persistor
export const persistor = persistStore(store);

// Types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
