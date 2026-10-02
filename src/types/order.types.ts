export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'DISPATCHED' | 'DELIVERED' | 'CANCELLED';

/** Chemist orders are priced at PTR and supplied by a stockist; stockist orders are priced at PTS. */
export type OrderType = 'Chemist' | 'Stockist';

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  packSize?: string;
  quantity: number;
  freeQuantity: number;
  unitPrice: number;
  discountPercentage: number;
  discountAmount: number;
  taxPercentage: number;
  taxAmount: number;
  lineTotal: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  mrId?: string;
  mrName: string;
  employeeId?: string;
  orderType: OrderType;
  chemistId?: string;
  chemistName?: string;
  stockistId: string;
  stockistName: string;
  visitId?: string;
  orderDate: string;
  totalAmount: number;
  discountAmount: number;
  taxAmount: number;
  netAmount: number;
  itemCount: number;
  totalQuantity: number;
  totalFreeQuantity: number;
  latitude?: number;
  longitude?: number;
  orderStatus: OrderStatus;
  statusRemarks?: string;
  /** When the order was dispatched — counts towards the sales target of this month. */
  dispatchedAt?: string;
  remarks?: string;
  items: OrderItem[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrderItemRequest {
  productId: string;
  quantity: number;
  freeQuantity?: number;
  discountPercentage?: number;
}

/** Prices are applied by the server from the product master; only quantities and discount are sent. */
export interface CreateOrderRequest {
  chemistId?: string;
  stockistId: string;
  visitId?: string;
  latitude?: number;
  longitude?: number;
  remarks?: string;
  items: CreateOrderItemRequest[];
  /** Client-generated id so a retried submit doesn't create a duplicate order. */
  offlineId: string;
}

export interface MyOrdersParams {
  fromDate?: string; // yyyy-MM-dd
  toDate?: string;   // yyyy-MM-dd
  status?: OrderStatus;
  visitId?: string;
  pageNumber?: number;
  pageSize?: number;
}

export interface PagedOrders {
  items: Order[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
}

export interface OrderSummary {
  fromDate: string;
  toDate: string;
  totalOrders: number;
  totalValue: number;
  averageOrderValue: number;
  totalUnits: number;
  pendingOrders: number;
  confirmedOrders: number;
  dispatchedOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  deliveredValue: number;
  topProducts: { productId: string; productName: string; totalQuantity: number; totalValue: number; orderCount: number }[];
}
