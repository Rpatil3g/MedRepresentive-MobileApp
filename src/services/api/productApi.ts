import axiosInstance from './axiosInstance';
import { API_CONFIG } from '../../config/api.config';
import {
  Product,
  ProductDetail,
  ProductPricing,
  ProductListRequest,
  PaginatedProductList,
} from '../../types/product.types';

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

class ProductApi {
  async getProducts(params: ProductListRequest): Promise<PaginatedProductList> {
    const response = await axiosInstance.get<PaginatedProductList | { data?: PaginatedProductList }>(
      API_CONFIG.ENDPOINTS.PRODUCTS,
      { params }
    );
    const data = unwrapResponse(response.data);
    return {
      ...data,
      items: Array.isArray(data.items) ? data.items : [],
    };
  }

  async getProductById(id: string): Promise<Product> {
    const response = await axiosInstance.get<Product | { data?: Product }>(
      `${API_CONFIG.ENDPOINTS.PRODUCTS}/${id}`
    );
    return unwrapResponse(response.data);
  }

  async getProductDetail(id: string): Promise<ProductDetail> {
    const response = await axiosInstance.get<ProductDetail | { data?: ProductDetail }>(
      `${API_CONFIG.ENDPOINTS.PRODUCTS}/${id}/detail`
    );
    return unwrapResponse(response.data);
  }

  async getProductPricing(id: string): Promise<ProductPricing> {
    const response = await axiosInstance.get<ProductPricing | { data?: ProductPricing }>(
      `${API_CONFIG.ENDPOINTS.PRODUCTS}/${id}/pricing`
    );
    return unwrapResponse(response.data);
  }

  async searchProducts(query: string): Promise<Product[]> {
    const response = await axiosInstance.get<Product[] | { data?: Product[] }>(
      `${API_CONFIG.ENDPOINTS.PRODUCTS}/search`,
      { params: { query } }
    );
    return unwrapResponse(response.data);
  }

  async getCategories(): Promise<string[]> {
    const response = await axiosInstance.get<string[] | { data?: string[] }>(
      `${API_CONFIG.ENDPOINTS.PRODUCTS}/categories`
    );
    return unwrapResponse(response.data);
  }

  async getProductTypes(): Promise<string[]> {
    const response = await axiosInstance.get<string[] | { data?: string[] }>(
      `${API_CONFIG.ENDPOINTS.PRODUCTS}/types`
    );
    return unwrapResponse(response.data);
  }

  async getProductsByCategory(category: string): Promise<Product[]> {
    const response = await axiosInstance.get<Product[] | { data?: Product[] }>(
      `${API_CONFIG.ENDPOINTS.PRODUCTS}/by-category/${encodeURIComponent(category)}`
    );
    return unwrapResponse(response.data);
  }
}

export default new ProductApi();
