import { useEffect } from 'react';
import { AppState } from 'react-native';
import alertsApi from '../services/api/alertsApi';
import { store } from '../store/store';
import { setRejectedCounts } from '../store/slices/alertsSlice';

const POLL_MS = 60_000;

/**
 * Re-fetches the red-dot counts. Call after the MR resubmits or deletes something so the dot
 * clears straight away; failures are ignored (the next poll catches up).
 */
export const refreshRejectedCounts = async (): Promise<void> => {
  if (!store.getState().auth?.isAuthenticated) return;
  try {
    store.dispatch(setRejectedCounts(await alertsApi.getRejectedCounts()));
  } catch {
    // offline or server error — keep the last known counts
  }
};

/**
 * Keeps the counts fresh while the main app is shown: on mount, when the app comes back to
 * the foreground (a manager may have rejected something meanwhile), and every minute while active.
 */
export const useRejectedCountsPolling = (): void => {
  useEffect(() => {
    refreshRejectedCounts();
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') refreshRejectedCounts();
    });
    const timer = setInterval(() => {
      if (AppState.currentState === 'active') refreshRejectedCounts();
    }, POLL_MS);
    return () => {
      sub.remove();
      clearInterval(timer);
    };
  }, []);
};
