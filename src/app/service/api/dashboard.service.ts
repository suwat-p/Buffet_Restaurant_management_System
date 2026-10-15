import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Constants } from '../../config/contants';
import { CashierDashboardStats, DashboardOverview, HourlyChartItem, SalesChartResponse } from '../../models/dashboard.model';

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
  public salesChart(type: 'daily' | 'monthly' | 'yearly' = 'daily', selectedDate?: string) {
    let params = new HttpParams().set('type', type);

    // 🎯 หากมีการส่ง selectedDate เข้ามา ให้ตั้งค่า params เพิ่มเติม
    if (selectedDate && type === 'daily') {
      params = params.set('selectedDate', selectedDate);
    }

    return this.http.get<SalesChartResponse>(
      `${this.constants.API_ENDPOINT}/Dashboard/sales-chart`,
      { params }
    );
  }
  public GetCashierDashboardStats(type: 'daily' | 'monthly' | 'yearly' = 'daily') {
    const params = new HttpParams().set('type', type);
    return this.http.get<CashierDashboardStats>(`${this.constants.API_ENDPOINT}/Dashboard/cashier-stats`, { params });
  }
 public GetHourlySalesChart(selectedDate?: Date | string): Observable<HourlyChartItem[]> {
    let params = new HttpParams();

    if (selectedDate) {
      // แปลงวันที่ให้อยู่ในรูปแบบ YYYY-MM-DD ก่อนส่งไปยัง Backend
      const dateStr = selectedDate instanceof Date 
        ? selectedDate.toISOString().split('T')[0] 
        : selectedDate;
        
      params = params.set('selectedDate', dateStr);
    }

    return this.http.get<HourlyChartItem[]>(`${this.constants.API_ENDPOINT}/Dashboard/hourly-chart`, { params });
  }
}
