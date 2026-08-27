import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ChartModule } from 'primeng/chart';
import { DatePickerModule } from 'primeng/datepicker';
import { MenuCashier } from '../../../components/menu-bar/menu-cashier/menu-cashier';
import { CashierDashboardStats, ChartType, SalesChartItem, SalesChartResponse } from '../../../models/dashboard.model';
import { DashboardService } from '../../../service/api/dashboard.service';

@Component({
  selector: 'app-dashboard-cashier',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    CardModule,
    ChartModule,
    DatePickerModule,
    MenuCashier
  ],
  templateUrl: './dashboard-cashier.html',
  styleUrl: './dashboard-cashier.scss',
})
export class DashboardCashier implements OnInit {
  constructor(private dashboardService: DashboardService) { }

  stats: CashierDashboardStats | null = null;
  options: any;
  data: any;
  currentFilter: 'daily' | 'monthly' | 'yearly' = 'daily';
  chartData: any;
  chartOptions: any;
  selectedFilter: ChartType = 'daily';
  selectedDate: Date = new Date();

  ngOnInit() {
    this.initChartOptions();
    this.loadStats('daily');
    this.fetchSalesChart('daily');
  }

  loadStats(type: 'daily' | 'monthly' | 'yearly') {
    this.currentFilter = type;
    
    this.dashboardService.GetCashierDashboardStats(type).subscribe({
      next: (response: CashierDashboardStats) => {
        this.stats = response;
      },
      error: (error) => {
        console.error('Error fetching stats:', error);
      }
    });
  }

  // 🎯 ดึงข้อมูลกราฟโดยแปลง selectedDate ให้เป็น Format ที่ C# อ่านง่าย (YYYY-MM-DD)
  fetchSalesChart(type: ChartType, selectedDate?: Date) {
    this.selectedFilter = type;
    const dateToUse = selectedDate ?? this.selectedDate;

    const year = dateToUse.getFullYear();
    const month = String(dateToUse.getMonth() + 1).padStart(2, '0');
    const day = String(dateToUse.getDate()).padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}`;

    this.dashboardService.salesChart(type, formattedDate).subscribe({
      next: (res: SalesChartResponse) => {
        const labels = (res.data || []).map((item: SalesChartItem) => item.label);
        const dataValues = (res.data || []).map((item: SalesChartItem) => item.amount);

        let labelText = 'ยอดขายรายวัน (ย้อนหลัง 7 วัน)';
        if (type === 'monthly') labelText = 'ยอดขายรายเดือน (ย้อนหลัง 12 เดือน)';
        if (type === 'yearly') labelText = 'ยอดขายรายปี (ย้อนหลัง 5 ปี)';

        this.data = {
          labels: labels,
          datasets: [
            {
              label: labelText,
              data: dataValues,
              backgroundColor: '#22c55e',
              borderColor: '#22c55e',
              borderWidth: 1,
              barThickness: 45,
            },
          ],
        };
      },
      error: (err) => {
        console.error('Error fetching sales chart data:', err);
      }
    });
  }

  // 🎯 ทำงานเมื่อกดเลือกวัน/เดือน/ปี ใหม่จาก DatePicker
  onDateChange(newDate: Date): void {
    if (newDate) {
      this.selectedDate = newDate;
      this.fetchSalesChart(this.selectedFilter, newDate);
    }
  }

  initChartOptions() {
    const textColorSecondary = '#a1a1aa';
    const surfaceBorder = '#27272a';

    this.options = {
      maintainAspectRatio: false,
      aspectRatio: 0.8,
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          backgroundColor: '#27272a',
          titleColor: '#fff',
          bodyColor: '#fff',
          borderColor: '#22c55e',
          borderWidth: 1,
          displayColors: true,
          callbacks: {
            label: function (context: any) {
              let label = context.dataset.label || '';
              if (label) {
                label += ' : ';
              }
              if (context.parsed.y !== null) {
                label += new Intl.NumberFormat('th-TH', {
                  style: 'currency',
                  currency: 'THB',
                }).format(context.parsed.y);
              }
              return label;
            },
          },
        },
      },
      scales: {
        x: {
          ticks: {
            color: textColorSecondary,
            font: {
              weight: 500,
            },
          },
          grid: {
            color: surfaceBorder,
            drawBorder: false,
          },
        },
        y: {
          ticks: {
            color: textColorSecondary,
          },
          grid: {
            color: surfaceBorder,
            drawBorder: false,
          },
          border: {
            display: false,
          },
        },
      },
    };
  }
}