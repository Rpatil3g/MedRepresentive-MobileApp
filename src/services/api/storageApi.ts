import { Platform } from 'react-native';
import { API_CONFIG } from '../../config/api.config';
import storageService from '../storage/storageService';

const resolveBaseUrl = (): string => {
  if (Platform.OS === 'android' && API_CONFIG.BASE_URL.includes('localhost')) {
    return API_CONFIG.BASE_URL.replace('localhost', '10.0.2.2');
  }
  return API_CONFIG.BASE_URL;
};

class StorageApi {
  async uploadFile(
    uri: string,
    mimeType: string,
    filename: string,
    folder: string = '',
  ): Promise<string> {
    const token = await storageService.getAuthToken();

    const formData = new FormData();
    formData.append('file', { uri, type: mimeType, name: filename } as any);

    const params = folder ? `?folder=${encodeURIComponent(folder)}` : '';
    const url = `${resolveBaseUrl()}${API_CONFIG.PREFIX}${API_CONFIG.ENDPOINTS.STORAGE_UPLOAD}${params}`;

    // Use fetch instead of axios for multipart uploads.
    // React Native's fetch handles FormData natively and sets the correct
    // Content-Type: multipart/form-data; boundary=... header automatically.
    // Axios's header merging interferes with this and causes Network Error.
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token ?? ''}`,
        // Content-Type is intentionally omitted — fetch sets it with the
        // correct multipart boundary when the body is FormData.
      },
      body: formData,
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Upload failed (${response.status}): ${body}`);
    }

    const data = await response.json() as { url: string };
    return data.url;
  }
}

export default new StorageApi();
