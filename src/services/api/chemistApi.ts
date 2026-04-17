import axiosInstance from './axiosInstance';
import { API_CONFIG } from '../../config/api.config';
import { Chemist } from '../../types/chemist.types';

const unwrapResponse = <T>(payload: T | { data?: T }): T => {
  if (
    payload &&
    typeof payload === 'object' &&
    'data' in payload &&
    (payload as { data?: T }).data !== undefined
  ) {
    return (payload as { data: T }).data;
  }
  return payload as T;
};

const normalizeChemist = (c: Chemist): Chemist => ({
  ...c,
  // Normalise casing differences — backend returns PascalCase IDs
  id: (c as any).Id ?? (c as any).id ?? c.id,
  chemistName: (c as any).ChemistName ?? (c as any).chemistName ?? c.chemistName,
  pharmacyName: (c as any).PharmacyName ?? (c as any).pharmacyName ?? c.pharmacyName,
  address: (c as any).Address ?? (c as any).address ?? c.address,
  city: (c as any).City ?? (c as any).city ?? c.city,
  category: (c as any).Category ?? (c as any).category ?? c.category,
  latitude: (c as any).Latitude ?? (c as any).latitude ?? c.latitude,
  longitude: (c as any).Longitude ?? (c as any).longitude ?? c.longitude,
});

class ChemistApi {
  async searchChemists(query: string): Promise<Chemist[]> {
    const response = await axiosInstance.get<Chemist[] | { data?: Chemist[] }>(
      `${API_CONFIG.ENDPOINTS.CHEMISTS_SEARCH}/${encodeURIComponent(query)}`,
    );
    return unwrapResponse(response.data).map(normalizeChemist);
  }

  async getChemistById(id: string): Promise<Chemist> {
    const response = await axiosInstance.get<Chemist | { data?: Chemist }>(
      `${API_CONFIG.ENDPOINTS.CHEMISTS}/${id}`,
    );
    return normalizeChemist(unwrapResponse(response.data));
  }
}

export default new ChemistApi();
