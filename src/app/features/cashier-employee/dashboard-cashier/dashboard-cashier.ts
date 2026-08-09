import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ChartModule } from 'primeng/chart';
import { MenuCashier } from '../../../components/menu-bar/menu-cashier/menu-cashier';
import { CashierDashboardStats, ChartType, SalesChartItem, SalesChartResponse } from '../../../models/dashboard.model';
import { DashboardService } from '../../../service/api/dashboard.service';
@Component({
  selector: 'app-dashboard-cashier',
  imports: [CommonModule, ButtonModule, CardModule, ChartModule, MenuCashier],
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

  ngOnInit() {
    this.initChartOptions();
    this.loadStats('daily');
  }
  loadStats(type: 'daily' | 'monthly' | 'yearly') {
    this.currentFilter = type; // อัปเดตสถานะปุ่ม
    
    this.dashboardService.GetCashierDashboardStats(type).subscribe({
      next: (response: CashierDashboardStats) => {
        this.stats = response; // นำข้อมูลจาก API มาใส่ตัวแปร stats
      },
      error: (error) => {
        console.error('Error fetching stats:', error);
      }
    });
  }
    fetchSalesChart(type: ChartType) {
      this.selectedFilter = type;
  
      this.dashboardService.salesChart(type).subscribe({
        next: (res: SalesChartResponse) => {
          // ใช้ SalesChartItem ระบุ Type ในฟังก์ชัน map
          const labels = (res.data || []).map((item: SalesChartItem) => item.label);
          const dataValues = (res.data || []).map((item: SalesChartItem) => item.amount);
  
          let labelText = 'ยอดขายรายวัน';
          if (type === 'monthly') labelText = 'ยอดขายรายเดือน';
          if (type === 'yearly') labelText = 'ยอดขายรายปี';
  
          this.data = {
            labels: labels,
            datasets: [
              {
                label: labelText,
                data: dataValues,
                backgroundColor: '#22c55e',
                borderColor: '#22c55e',
                borderWidth: 1,
                barThickness: 50,
              },
            ],
          };
        },
        error: (err) => {
          console.error('Error fetching sales chart data:', err);
        }
      });
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
