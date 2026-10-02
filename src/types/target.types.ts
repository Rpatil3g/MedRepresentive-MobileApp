/**
 * The MR's monthly targets (set by their manager) and achievement.
 * Achievement rules: visits count when the outcome is "Met"; sales count in the month the order
 * is dispatched (delivered orders included), whenever it was booked.
 */
export interface MyTargets {
  year: number;
  month: number;
  visitTarget?: number | null;
  salesTarget?: number | null;
  /** Completed visits with outcome "Met". */
  actualVisits: number;
  /** Value of orders dispatched in the month. */
  actualSales: number;
  /** Open orders (booked, not yet dispatched) — count in the month they're dispatched. */
  pendingSales: number;
  /** Non-cancelled orders booked in the month. */
  orderCount: number;
  /** % of target; null when no target is set. */
  visitAchievement?: number | null;
  salesAchievement?: number | null;
}
