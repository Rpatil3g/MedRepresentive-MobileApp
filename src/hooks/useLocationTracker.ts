import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import Geolocation from 'react-native-geolocation-service';
import DeviceInfo from 'react-native-device-info';
import VIForegroundService from '@voximplant/react-native-foreground-service';
import { liveTrackingApi } from '../services/api';

// ─── Constants ───────────────────────────────────────────────────────────────

const INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const CHANNEL_ID  = 'goodpharma_location';
const NOTIF_ID    = 1001;

// ─── Shared location sender ───────────────────────────────────────────────────

const collectAndSend = async (): Promise<void> => {
  await new Promise<void>((resolve) => {
    Geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy, speed, altitude } = pos.coords;

        let batteryLevel: number | undefined;
        try {
          batteryLevel = Math.round((await DeviceInfo.getBatteryLevel()) * 100);
        } catch {
          // non-critical
        }

        try {
          await liveTrackingApi.updateLocation({
            latitude,
            longitude,
            timestamp: new Date().toISOString(),
            accuracy:  accuracy  ?? undefined,
            // Geolocation gives speed in m/s — backend expects km/h
            speed:     speed != null && speed >= 0 ? speed * 3.6 : undefined,
            altitude:  altitude  ?? undefined,
            batteryLevel,
          });
        } catch {
          // Best-effort — never surface tracking errors to the user
        }

        resolve();
      },
      () => resolve(), // Location unavailable — skip this ping silently
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  });
};

// ─── Android helpers (foreground service) ────────────────────────────────────

const startForegroundService = async (): Promise<void> => {
  await VIForegroundService.getInstance().createNotificationChannel({
    id:               CHANNEL_ID,
    name:             'Location Tracking',
    description:      'GoodPharma tracks your location while you are on duty',
    enableVibration:  false,
  });

  await VIForegroundService.getInstance().startService({
    channelId: CHANNEL_ID,
    id:        NOTIF_ID,
    title:     'GoodPharma MR – On Duty',
    text:      'Location tracking is active',
    icon:      'ic_launcher',
    button:    false,
  });
};

const stopForegroundService = async (): Promise<void> => {
  try {
    await VIForegroundService.getInstance().stopService();
  } catch {
    // Already stopped — ignore
  }
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Sends the device's GPS location to the live-tracking endpoint while the MR
 * is punched in, even when the app is minimised or the screen is off.
 *
 * Android: starts a foreground service (persistent notification keeps the JS
 *          thread alive) + setInterval every 5 minutes.
 *
 * iOS:     uses watchPosition with allowsBackgroundLocationUpdates=true so the
 *          OS wakes the app on significant movement; pings are throttled to one
 *          per 5 minutes so we don't flood the server.
 *
 * Everything stops automatically when isPunchedIn becomes false or the
 * component unmounts.
 */
export const useLocationTracker = (isPunchedIn: boolean): void => {
  // Android
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // iOS
  const watchIdRef  = useRef<number | null>(null);
  const lastSentRef = useRef<number>(0);

  useEffect(() => {
    if (!isPunchedIn) {
      // ── Stop ──────────────────────────────────────────────────────────────
      if (Platform.OS === 'android') {
        if (intervalRef.current !== null) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        stopForegroundService();
      } else {
        if (watchIdRef.current !== null) {
          Geolocation.clearWatch(watchIdRef.current);
          watchIdRef.current = null;
        }
      }
      return;
    }

    // ── Start ───────────────────────────────────────────────────────────────
    if (Platform.OS === 'android') {
      startForegroundService().then(() => {
        // First ping immediately, then every 5 minutes
        collectAndSend();
        intervalRef.current = setInterval(collectAndSend, INTERVAL_MS);
      });

      return () => {
        if (intervalRef.current !== null) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        stopForegroundService();
      };
    }

    // iOS — watchPosition wakes the app; we throttle sends to 5-min intervals
    watchIdRef.current = Geolocation.watchPosition(
      async (pos) => {
        const now = Date.now();
        if (now - lastSentRef.current < INTERVAL_MS) return; // throttle
        lastSentRef.current = now;

        const { latitude, longitude, accuracy, speed, altitude } = pos.coords;
        let batteryLevel: number | undefined;
        try {
          batteryLevel = Math.round((await DeviceInfo.getBatteryLevel()) * 100);
        } catch { /* non-critical */ }

        try {
          await liveTrackingApi.updateLocation({
            latitude,
            longitude,
            timestamp:   new Date().toISOString(),
            accuracy:    accuracy ?? undefined,
            speed:       speed != null && speed >= 0 ? speed * 3.6 : undefined,
            altitude:    altitude ?? undefined,
            batteryLevel,
          });
        } catch { /* best-effort */ }
      },
      () => { /* location error — skip silently */ },
      {
        enableHighAccuracy:               true,
        distanceFilter:                   50,   // metres — only wake on real movement
        interval:                         INTERVAL_MS,
        fastestInterval:                  INTERVAL_MS,
        showsBackgroundLocationIndicator: true, // iOS blue bar — transparency for user
        // allowsBackgroundLocationUpdates is iOS-only and missing from @types
        ...({ allowsBackgroundLocationUpdates: true } as any),
      },
    );

    // Send first ping immediately without waiting for movement
    collectAndSend();
    lastSentRef.current = Date.now();

    return () => {
      if (watchIdRef.current !== null) {
        Geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPunchedIn]);
};
