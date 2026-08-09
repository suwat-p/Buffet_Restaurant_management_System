import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Constants } from '../../config/contants';
import { CashierDashboardStats, DashboardOverview, SalesChartResponse } from '../../models/dashboard.model';

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  constructor(
    private http: HttpClient,
    private constants: Constants,
  ) { }

  public overview() {
    return this.http.get<DashboardOverview>(`${this.constants.API_ENDPOINT}/Dashboard/overview`);
  }
  public salesChart(type: 'daily' | 'monthly' | 'yearly' = 'daily') {
    const params = new HttpParams().set('type', type);
    return this.http.get<SalesChartResponse>(`${this.constants.API_ENDPOINT}/Dashboard/sales-chart`, { params });
  }
  public GetCashierDashboardStats(type: 'daily' | 'monthly' | 'yearly' = 'daily') {
    const params = new HttpParams().set('type', type);
    return this.http.get<CashierDashboardStats>(`${this.constants.API_ENDPOINT}/Dashboard/cashier-stats`, { params });
  }
}
