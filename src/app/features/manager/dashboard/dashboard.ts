import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ChartModule } from 'primeng/chart';
import { DatePickerModule } from 'primeng/datepicker';
import { MenuManager } from '../../../components/menu-bar/menu-manager/menu-manager';
import { CashierDashboardStats, ChartType, HourlyChartItem, HourlyTableRow, SalesChartItem, SalesChartResponse } from '../../../models/dashboard.model';
import { DashboardService } from '../../../service/api/dashboard.service';
@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, MenuManager, ChartModule, ButtonModule, CardModule, MatIconModule, DatePickerModule, FormsModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit, OnDestroy {
  data: any;
  options: any;
  timeNow: string = '';
  stats: CashierDashboardStats | null = null;
  selectedDate: Date = new Date();
  currentFilter: 'daily' | 'monthly' | 'yearly' = 'daily';
  hourlyChartData: any;
  hourlyChartOptions: any;
  private timer: any;
  hourlySelectedDate: Date = new Date();
  customerRatioData: any;
  customerRatioOptions: any;
  totalAdults: number = 0;
  totalChildren: number = 0;
  hourlyTableData: HourlyTableRow[] = [];
  grandTotalSales: number = 0;
  grandTotalAdults: number = 0;
  grandTotalChildren: number = 0;
  grandTotalCustomers: number = 0;
  hasHourlyData: boolean = false;

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

  constructor(private dashboardService: DashboardService) {
  }


  ngOnInit() {
    this.updateTime();
    this.initChartOptions();
    this.fetchOverview();
    this.initCustomerRatioOptions();
    this.fetchSalesChart(this.selectedFilter);
    this.initHourlyChartOptions();
    this.fetchHourlyChart(this.hourlySelectedDate);
    this.timer = setInterval(() => {
      this.updateTime();
    }, 1000);
  }

  ngOnDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
    }
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
  onDateChange(newDate: Date): void {
    if (newDate) {
      this.selectedDate = newDate;
      this.fetchSalesChart(this.selectedFilter, newDate);
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
      next: (res: any) => {
        const todaySales = Number(res.todaySales ?? res.TodaySales ?? 0);
        const totalCustomers = Number(res.totalCustomersToday ?? res.TotalCustomersToday ?? 0);
        const peakSlot = res.peakTimeSlot ?? res.PeakTimeSlot ?? '-';
        const peakCustomers = Number(res.peakTimeCustomers ?? res.PeakTimeCustomers ?? 0);

        // 🟢 แก้ไขโดยการระบุ property .title และ .subtitle โดยตรงเพื่อรักษา icon, color, textColor เดิมไว้
        if (this.kpiData[0]) {
          this.kpiData[0].title = `฿${todaySales.toLocaleString()}`;
          this.kpiData[0].subtitle = 'ยอดขายวันนี้';
        }

        if (this.kpiData[1]) {
          this.kpiData[1].title = `${totalCustomers.toLocaleString()} คน`;
          this.kpiData[1].subtitle = 'ลูกค้าทั้งหมดวันนี้';
        }

        if (this.kpiData[2]) {
          this.kpiData[2].title = peakSlot !== '-' ? peakSlot : 'ไม่มีข้อมูล';
          this.kpiData[2].subtitle = peakCustomers > 0
            ? `คึกคักที่สุด (${peakCustomers.toLocaleString()} คน)`
            : 'ช่วงเวลาที่คึกคักที่สุด';
        }
      },
      error: (err) => console.error('Error fetching dashboard overview:', err)
    });
  }

  // 🟢 4. ใช้ SalesChartResponse และ SalesChartItem ระบุ Type ของข้อมูลกราฟ
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
  private formatDateToLocal(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  fetchHourlyChart(date: Date) {
    const formattedDate = this.formatDateToLocal(date);

    this.dashboardService.GetHourlySalesChart(formattedDate).subscribe({
      next: (res: HourlyChartItem[]) => {
        console.log('ข้อมูลที่ได้จาก API:', res); // Check log ดูข้อมูล

        if (!res || res.length === 0) {
          this.resetNoDataState();
          return;
        }

        const labels = res.map((item: any) => item.TimeSlot ?? item.timeSlot);
        const salesData = res.map((item: any) => item.Sales ?? item.sales);
        const adultsData = res.map((item: any) => item.Adults ?? item.adults);
        const childrenData = res.map((item: any) => item.Children ?? item.children);

        this.updateHourlyChartData(labels, salesData, adultsData, childrenData);

        this.totalAdults = adultsData.reduce((a, b) => a + b, 0);
        this.totalChildren = childrenData.reduce((a, b) => a + b, 0);

        this.updateCustomerRatioChart(this.totalAdults, this.totalChildren);

        let maxCustomers = -1;
        let peakIndex = -1;

        const rawRows: HourlyTableRow[] = res.map((item: any, index: number) => {
          const timeSlot = item.TimeSlot ?? item.timeSlot;
          const sales = Number(item.Sales ?? item.sales ?? 0);
          const adults = Number(item.Adults ?? item.adults ?? 0);
          const children = Number(item.Children ?? item.children ?? 0);
          const total = adults + children;

          if (total > maxCustomers && total > 0) {
            maxCustomers = total;
            peakIndex = index;
          }

          return {
            timeSlot,
            sales,
            adults,
            children,
            totalCustomers: total,
            isPeak: false
          };
        });

        // ติดป้ายกำกับ "คึกคักที่สุด"
        if (peakIndex !== -1) {
          rawRows[peakIndex].isPeak = true;
        }

        this.hourlyTableData = rawRows;

        // 4. คำนวณสรุปรวมทั้งหมด (Grand Totals)
        this.grandTotalSales = salesData.reduce((a, b) => a + b, 0);
        this.grandTotalAdults = this.totalAdults;
        this.grandTotalChildren = this.totalChildren;
        this.grandTotalCustomers = this.grandTotalAdults + this.grandTotalChildren;

      },
      error: (err) => console.error('Error fetching hourly chart:', err)
    });
  }
  resetNoDataState() {
    this.hasHourlyData = false;
    this.totalAdults = 0;
    this.totalChildren = 0;
    this.hourlyTableData = [];
    this.updateHourlyChartData([], [], [], []);
    this.resetTotals();
  }
  resetTotals() {
    this.grandTotalSales = 0;
    this.grandTotalAdults = 0;
    this.grandTotalChildren = 0;
    this.grandTotalCustomers = 0;
  }
  // Event เมื่อคลิกเลือกวันที่จาก p-datepicker
  onHourlyDateChange(selectedDate: Date) {
    this.hourlySelectedDate = selectedDate;
    this.fetchHourlyChart(this.hourlySelectedDate);
  }
  updateHourlyChartData(labels: string[], sales: number[], adults: number[], children: number[]) {
    this.hourlyChartData = {
      labels: labels,
      datasets: [
        {
          label: 'ยอดขาย',
          data: sales,
          borderColor: '#3b82f6',
          tension: 0.4,
          pointBackgroundColor: '#3b82f6',
          pointBorderColor: '#ffffff',
          pointRadius: 4,
          yAxisID: 'y'
        },
        {
          label: 'ผู้ใหญ่',
          data: adults,
          borderColor: '#a855f7',
          tension: 0.4,
          pointBackgroundColor: '#a855f7',
          pointBorderColor: '#ffffff',
          pointRadius: 4,
          yAxisID: 'y1'
        },
        {
          label: 'เด็ก',
          data: children,
          borderColor: '#ec4899',
          tension: 0.4,
          pointBackgroundColor: '#ec4899',
          pointBorderColor: '#ffffff',
          pointRadius: 4,
          yAxisID: 'y1'
        }
      ]
    };
  }
  initHourlyChartOptions() {
    const textColor = '#a1a1aa';
    const surfaceBorder = '#27272a';

    this.hourlyChartOptions = {
      stacked: false,
      maintainAspectRatio: false,
      aspectRatio: 0.6,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: '#e4e4e7',
            usePointStyle: true,
            boxWidth: 8,
            font: { family: 'Kanit, sans-serif', size: 13 }
          }
        },
        tooltip: {
          backgroundColor: '#18181b',
          titleColor: '#ffffff',
          bodyColor: '#e4e4e7',
          borderColor: '#3f3f46',
          borderWidth: 1,
          padding: 12,
          boxPadding: 6,
          usePointStyle: true,
          callbacks: {
            title: (items: any) => `เวลา ${items[0].label}`,
            label: (context: any) => {
              const label = context.dataset.label || '';
              const value = context.parsed.y;
              return label === 'ยอดขาย'
                ? `ยอดขาย : ${value.toLocaleString()} บาท`
                : `${label} : ${value} คน`;
            }
          }
        }
      },
      scales: {
        x: {
          ticks: { color: textColor, font: { family: 'Kanit, sans-serif', size: 11 } },
          grid: { color: surfaceBorder, drawBorder: false }
        },
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          ticks: { color: textColor, font: { family: 'Kanit, sans-serif' } },
          grid: { color: surfaceBorder, drawBorder: false }
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          ticks: { color: textColor, font: { family: 'Kanit, sans-serif' } },
          grid: { drawOnChartArea: false }
        }
      }
    };
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
  // อัปเดตข้อมูลกราฟโดนัท
  updateCustomerRatioChart(adults: number, children: number) {
    this.customerRatioData = {
      labels: ['ผู้ใหญ่', 'เด็ก'],
      datasets: [
        {
          data: [adults, children],
          backgroundColor: ['#1d4ed8', '#dc2626'], // สีน้ำเงินผู้ใหญ่ / สีแดงเด็ก
          hoverBackgroundColor: ['#2563eb', '#ef4444'],
          borderWidth: 0
        }
      ]
    };
  }

  // ตั้งค่าแสดงผลกราฟโดนัท
  initCustomerRatioOptions() {
    this.customerRatioOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: {
            color: '#a1a1aa',
            usePointStyle: true,
            boxWidth: 10,
            padding: 15,
            font: { family: 'Kanit, sans-serif', size: 13 }
          }
        },
        tooltip: {
          backgroundColor: '#18181b',
          titleColor: '#ffffff',
          bodyColor: '#e4e4e7',
          borderColor: '#3f3f46',
          borderWidth: 1,
          padding: 10,
          callbacks: {
            label: (context: any) => {
              const label = context.label || '';
              const value = context.parsed;
              return `${label} : ${value}คน`;
            }
          }
        }
      },
      cutout: '65%'
    };
  }
}
