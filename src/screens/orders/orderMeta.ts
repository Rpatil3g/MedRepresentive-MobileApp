import { OrderStatus } from '../../types/order.types';

export const ORDER_STATUS_META: Record<OrderStatus, { label: string; color: string; bg: string; icon: string }> = {
  PENDING:    { label: 'Pending',    color: '#b45309', bg: '#fffbeb', icon: 'clock-outline' },
  CONFIRMED:  { label: 'Confirmed',  color: '#1d4ed8', bg: '#eff6ff', icon: 'check-circle-outline' },
  DISPATCHED: { label: 'Dispatched', color: '#7c3aed', bg: '#f5f3ff', icon: 'truck-delivery-outline' },
  DELIVERED:  { label: 'Delivered',  color: '#047857', bg: '#f0fdf4', icon: 'truck-check-outline' },
  CANCELLED:  { label: 'Cancelled',  color: '#dc2626', bg: '#fef2f2', icon: 'close-circle-outline' },
};

export const formatINR = (value: number, fractionDigits = 2): string =>
  `₹${(value ?? 0).toLocaleString('en-IN', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })}`;

/** Compact form for tiles: ₹950, ₹12.5k, ₹3.4L */
export const formatINRShort = (value: number): string => {
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(1)}k`;
  return `₹${Math.round(value)}`;
};

/** Same rounding as the server (2 dp, half away from zero) so estimates match the booked order. */
export const round2 = (value: number): number =>
  Math.sign(value) * Math.round((Math.abs(value) + Number.EPSILON) * 100) / 100;
