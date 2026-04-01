import axiosInstance from './axiosInstance';
import { API_CONFIG } from '../../config/api.config';
import { LookupValue, CreateLookupValueRequest } from '../../types/lookup.types';
import { ApiResponse } from '../../types/api.types';

// Module-level in-memory cache — survives for the app session.
// Cleared on logout or explicit call to clearCache().
const _cache: Record<string, string[]> = {};

class LookupApi {
  /**
   * Returns display text strings for a single category.
   * Results are cached in memory for the app session.
   */
  async getByCategory(category: string): Promise<string[]> {
    if (_cache[category]) return _cache[category];

    const response = await axiosInstance.get<LookupValue[]>(
      `${API_CONFIG.ENDPOINTS.LOOKUPS}/${category}`
    );
    const values = (response.data as any)?.data ?? response.data;
    const texts: string[] = (values as LookupValue[]).map(v => v.displayText);
    _cache[category] = texts;
    return texts;
  }

  /**
   * Fetches multiple categories in parallel and returns a map of
   * { category → string[] }.  Results are individually cached.
   */
  async getMultipleCategories(categories: string[]): Promise<Record<string, string[]>> {
    const result: Record<string, string[]> = {};

    // Serve cached categories instantly, fetch the rest in parallel
    const missing = categories.filter(c => !_cache[c]);
    if (missing.length > 0) {
      const qs = missing.map(c => `categories=${encodeURIComponent(c)}`).join('&');
      const response = await axiosInstance.get<Record<string, LookupValue[]>>(
        `${API_CONFIG.ENDPOINTS.LOOKUPS}?${qs}`
      );
      const dict = (response.data as any)?.data ?? response.data as Record<string, LookupValue[]>;
      Object.entries(dict).forEach(([cat, items]) => {
        const texts = items.map((v: LookupValue) => v.displayText);
        _cache[cat] = texts;
      });
    }

    categories.forEach(c => {
      result[c] = _cache[c] ?? [];
    });
    return result;
  }

  /** Admin: add a new dropdown value to a category. */
  async create(data: CreateLookupValueRequest): Promise<LookupValue> {
    const response = await axiosInstance.post<ApiResponse<LookupValue>>(
      API_CONFIG.ENDPOINTS.LOOKUPS,
      data
    );
    // Invalidate cache for this category
    delete _cache[data.category];
    return response.data.data;
  }

  /** Admin: remove a dropdown value. */
  async remove(id: string): Promise<void> {
    await axiosInstance.delete(`${API_CONFIG.ENDPOINTS.LOOKUPS}/${id}`);
    // Invalidate entire cache — we don't know which category was affected
    this.clearCache();
  }

  /** Call this on user logout so a fresh login gets up-to-date options. */
  clearCache(): void {
    Object.keys(_cache).forEach(k => delete _cache[k]);
  }
}

export default new LookupApi();
