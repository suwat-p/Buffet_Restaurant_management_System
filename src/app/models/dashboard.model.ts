export type ChartType = 'daily' | 'monthly' | 'yearly';

export interface DashboardOverview {
  todaySales: number;
  totalCustomersToday: number;
  peakTimeSlot: string;
  peakTimeCustomers: number;
}
export interface SalesChartItem {
  label: string;
  amount: number;
}

export interface SalesChartResponse {
  type: ChartType;
  data: SalesChartItem[];
}
export interface CashierDashboardStats {
    netRevenue: number;
    totalAdults: number;
    totalChildren: number;
    totalDiscount: number;
    totalFines: number;
    cashAmount: number;
    transferAmount: number;
}