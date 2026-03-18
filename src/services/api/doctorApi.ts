import axiosInstance from './axiosInstance';
import { API_CONFIG } from '../../config/api.config';
import {
  Doctor,
  CreateDoctorRequest,
  DoctorListRequest,
  PaginatedDoctorList,
} from '../../types/doctor.types';

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

const normalizeDoctor = (doctor: Doctor): Doctor => ({
  ...doctor,
  geoLocation:
    doctor.geoLocation ??
    (doctor.latitude !== undefined && doctor.longitude !== undefined
      ? {
          latitude: doctor.latitude,
          longitude: doctor.longitude,
        }
      : undefined),
});

class DoctorApi {
  async getDoctors(params: DoctorListRequest): Promise<PaginatedDoctorList> {
    const response = await axiosInstance.get<PaginatedDoctorList | { data?: PaginatedDoctorList }>(
      API_CONFIG.ENDPOINTS.DOCTORS,
      { params }
    );

    const data = unwrapResponse(response.data);

    return {
      ...data,
      items: Array.isArray(data.items) ? data.items.map(normalizeDoctor) : [],
    };
  }

  async getDoctorById(id: string): Promise<Doctor> {
    const response = await axiosInstance.get<Doctor | { data?: Doctor }>(
      `${API_CONFIG.ENDPOINTS.DOCTORS}/${id}`
    );
    return normalizeDoctor(unwrapResponse(response.data));
  }

  async searchDoctors(query: string): Promise<Doctor[]> {
    const response = await axiosInstance.get<Doctor[] | { data?: Doctor[] }>(
      `${API_CONFIG.ENDPOINTS.DOCTORS_SEARCH}/${encodeURIComponent(query)}`
    );
    return unwrapResponse(response.data).map(normalizeDoctor);
  }

  async getNearbyDoctors(
    latitude: number,
    longitude: number,
    radiusKm: number = 5
  ): Promise<Doctor[]> {
    const response = await axiosInstance.post<Doctor[] | { data?: Doctor[] }>(
      API_CONFIG.ENDPOINTS.DOCTORS_NEARBY,
      {
        latitude,
        longitude,
        radiusInKm: radiusKm,
      }
    );
    return unwrapResponse(response.data).map(normalizeDoctor);
  }

  async getDoctorsByTerritory(territoryId: string): Promise<Doctor[]> {
    const response = await axiosInstance.get<Doctor[] | { data?: Doctor[] }>(
      `${API_CONFIG.ENDPOINTS.DOCTORS_BY_TERRITORY}/${territoryId}`
    );
    return unwrapResponse(response.data).map(normalizeDoctor);
  }

  async createDoctor(data: CreateDoctorRequest): Promise<Doctor> {
    const response = await axiosInstance.post<Doctor | { data?: Doctor }>(
      API_CONFIG.ENDPOINTS.DOCTORS,
      data
    );
    return normalizeDoctor(unwrapResponse(response.data));
  }

  async updateDoctor(id: string, data: Partial<CreateDoctorRequest>): Promise<Doctor> {
    const response = await axiosInstance.put<Doctor | { data?: Doctor }>(
      `${API_CONFIG.ENDPOINTS.DOCTORS}/${id}`,
      data
    );
    return normalizeDoctor(unwrapResponse(response.data));
  }
}

export default new DoctorApi();
