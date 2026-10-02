import axiosInstance from './axiosInstance';
import { API_CONFIG } from '../../config/api.config';
import { Chemist, CreateChemistRequest } from '../../types/chemist.types';

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
  // Chemists this MR added, with their approval status (PENDING / APPROVED / REJECTED)
  async getMySubmissions(): Promise<Chemist[]> {
    const response = await axiosInstance.get<Chemist[] | { data?: Chemist[] }>(
      API_CONFIG.ENDPOINTS.CHEMISTS_MY_SUBMISSIONS,
    );
    return unwrapResponse(response.data).map(normalizeChemist);
  }

  /**
   * Approved, active chemists — in the given HQ (including ones not yet on a route) when an
   * HQ is passed, otherwise the first page A–Z. Used to show a list before the MR types.
   */
  async listChemists(headquartersId?: string, pageSize = 100): Promise<Chemist[]> {
    const response = await axiosInstance.get<{ items?: Chemist[] } | { data?: { items?: Chemist[] } }>(
      API_CONFIG.ENDPOINTS.CHEMISTS,
      {
        params: {
          headquartersId,
          includeUnassigned: !!headquartersId,
          isActive: true,
          pageSize,
        },
      },
    );
    const page = unwrapResponse(response.data as any) as { items?: Chemist[] };
    return (page?.items ?? []).map(normalizeChemist);
  }

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

  async createChemist(data: CreateChemistRequest): Promise<Chemist> {
    const response = await axiosInstance.post<Chemist | { data?: Chemist }>(
      API_CONFIG.ENDPOINTS.CHEMISTS,
      data,
    );
    return normalizeChemist(unwrapResponse(response.data));
  }
}

export default new ChemistApi();
