import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ChartModule } from 'primeng/chart';
import { MenuManager } from '../../../components/menu-bar/menu-manager/menu-manager';
import { ChartType, DashboardOverview, SalesChartItem, SalesChartResponse } from '../../../models/dashboard.model';
import { DashboardService } from '../../../service/api/dashboard.service';

@Component({
  selector: 'app-dashboard',
  imports: [MenuManager, ChartModule, ButtonModule, CardModule, MatIconModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit, OnDestroy {
  data: any;
  options: any;
  timeNow: string = '';
  private timer: any;

  // 🟢 2. ใช้ ChartType กำหนดชนิดข้อมูลตัวแปรตัวกรอง
  selectedFilter: ChartType = 'daily';

  kpiData = [
    {
      title: '฿0',
      subtitle: 'ยอดขายวันนี้',
      icon: 'pi pi-chart-line',
      color: 'bg-blue-900',
      textColor: 'text-blue-500',
    },
    {
      title: '0',
      subtitle: 'ลูกค้าทั้งหมด',
      icon: 'pi pi-users',
      color: 'bg-purple-900',
      textColor: 'text-purple-500',
    },
    {
      title: '-',
      subtitle: 'ช่วงเวลาที่คึกคักที่สุด',
      icon: 'pi pi-clock',
      color: 'bg-teal-900',
      textColor: 'text-teal-500',
    },
    {
      title: '0',
      subtitle: 'ลูกค้าในช่วงนี้',
      icon: 'pi pi-calendar',
      color: 'bg-green-900',
      textColor: 'text-green-500',
    },
  ];

  currentDate: string = new Date().toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  constructor(private dashboardService: DashboardService) { }

  ngOnInit() {
    this.updateTime();
    this.initChartOptions();

    this.fetchOverview();
    this.fetchSalesChart(this.selectedFilter);

    this.timer = setInterval(() => {
      this.updateTime();
    }, 1000);
  }

  ngOnDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  updateTime() {
    this.timeNow = new Date().toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }

  // 🟢 3. ใช้ DashboardOverview ใน res เพื่อระบุ Type ของข้อมูลการ์ด
  fetchOverview() {
    this.dashboardService.overview().subscribe({
      next: (res: DashboardOverview) => {
        this.kpiData[0].title = `฿${(res.todaySales || 0).toLocaleString('th-TH')}`;
        this.kpiData[1].title = (res.totalCustomersToday || 0).toLocaleString('th-TH');
        this.kpiData[2].title = res.peakTimeSlot || '-';
        this.kpiData[3].title = (res.peakTimeCustomers || 0).toLocaleString('th-TH');
      },
      error: (err) => {
        console.error('Error fetching overview data:', err);
      }
    });
  }

  // 🟢 4. ใช้ SalesChartResponse และ SalesChartItem ระบุ Type ของข้อมูลกราฟ
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