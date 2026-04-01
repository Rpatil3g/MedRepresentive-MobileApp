export interface Product {
  id: string;
  productName: string;
  composition?: string;
  category?: string;
  productType?: string; // Tablet, Capsule, Syrup, Gel, etc.
  hsnCode?: string;
  mrp?: number;
  ptr?: number; // Price to Retailer
  pts?: number; // Price to Stockist
  packSize?: string;
  manufacturer?: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface ProductDetail extends Product {
  totalVisits?: number;
  promotedInDCRs?: number;
}

export interface ProductPricing {
  id: string;
  productName: string;
  mrp: number;
  ptr: number;
  pts?: number;
  margin?: number; // PTR margin %
  packSize?: string;
}

export interface ProductListRequest {
  category?: string;
  productType?: string;
  searchTerm?: string;
  isActive?: boolean;
  pageNumber?: number;
  pageSize?: number;
}

export interface PaginatedProductList {
  items: Product[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}
