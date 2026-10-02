import Geolocation from 'react-native-geolocation-service';
import DeviceInfo from 'react-native-device-info';
import { attendanceApi } from '../services/api';
import { requestLocationPermission } from './helpers';

export interface PunchLocation {
  latitude: number;
  longitude: number;
  address?: string;
}

/** Current GPS fix plus a best-effort place name (coordinates alone are still valid). */
export const capturePunchLocation = (): Promise<PunchLocation> =>
  new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        let address: string | undefined;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
            { headers: { 'Accept-Language': 'en', 'User-Agent': 'EterniRoFieldForce/1.0' } },
          );
          const data = await res.json();
          address = data.display_name as string | undefined;
        } catch {
          // address stays undefined
        }
        resolve({ latitude, longitude, address });
      },
      (err) => reject(new Error(`Location error: ${err.message}`)),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 },
    );
  });

/** Punch in right now — used by the Dashboard button and by Log Visit's "punch in first" prompt. */
export const punchInNow = async (): Promise<void> => {
  const hasPermission = await requestLocationPermission();
  if (!hasPermission) throw new Error('Location permission is required to punch in.');

  const location = await capturePunchLocation();
  let batteryLevel: number | undefined;
  try {
    batteryLevel = Math.round((await DeviceInfo.getBatteryLevel()) * 100);
  } catch { /* non-critical */ }

  await attendanceApi.punchIn({ timestamp: new Date().toISOString(), ...location, batteryLevel });
};

/** User-facing message for a failed punch request. */
export const punchErrorMessage = (err: any): string => {
  const isNetworkError = !err?.response && (err?.message === 'Network Error' || err?.code === 'ECONNABORTED');
  return isNetworkError
    ? 'No internet connection. Please check your network and try again.'
    : err?.response?.data?.message ?? err?.message ?? 'Something went wrong';
};

/** "7h 05m" */
export const formatWorked = (minutes: number): string =>
  `${Math.floor(minutes / 60)}h ${String(minutes % 60).padStart(2, '0')}m`;
