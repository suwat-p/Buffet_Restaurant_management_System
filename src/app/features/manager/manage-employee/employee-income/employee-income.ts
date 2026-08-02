import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { ChartModule } from 'primeng/chart';
import { AttendanceService } from '../../../../service/api/attendance.service';
import { AuthService } from '../../../../service/api/auth.service';
import { IncomeSummary, IncomeLog, Employee } from '../../../../models/employee.model';
import { MenuServer } from '../../../../components/menu-bar/menu-server/menu-server';

@Component({
  selector: 'app-employee-income',
  standalone: true,
  imports: [CommonModule, MenuServer, ButtonModule, TableModule, ChartModule],
  templateUrl: './employee-income.html',
  styleUrl: './employee-income.scss',
})
export class EmployeeIncome implements OnInit {
  summary: IncomeSummary = { dailyIncome: 0, monthlyIncome: 0, totalIncome: 0 };
  logs: IncomeLog[] = [];
  employee: Employee | null = null;
  chartData: any;
  chartOptions: any;
  isLoading = true;

  currentEmpId: number | null = null;

  constructor(
    private attendanceService: AttendanceService,
    private authService: AuthService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.initCurrentEmployee();
  }

  // ฟังก์ชันดึง ID จาก session/token ของพนักงานที่ล็อกอินอยู่
  private initCurrentEmployee(): void {
    const member = this.authService.getMember();

    if (!member || !member.id) {
      // ถ้าไม่ได้ล็อกอิน ให้ดีดกลับไปหน้า Login
      this.router.navigate(['/Loginemployee'], {
        queryParams: { returnUrl: this.router.url },
      });
      return;
    }

    this.currentEmpId = Number(member.id);

    // เมื่อได้ ID ของคนที่ล็อกอินแล้ว ค่อยเรียกโหลดข้อมูล
    this.loadEmployeeData();
    this.loadIncomeData();
    this.initChartOptions();
  }

  loadEmployeeData(): void {
    if (!this.currentEmpId) return;

    this.authService.getEmployeebyId(this.currentEmpId).subscribe({
      next: (res: any) => {
        const emp = Array.isArray(res) ? res[0] : res;
        if (emp) {
          if (emp.start_Time) emp.start_Time = emp.start_Time.substring(0, 5);
          if (emp.end_Time) emp.end_Time = emp.end_Time.substring(0, 5);
          this.employee = emp;
        }
      },
      error: (err) => {
        console.error('Error loading employee info:', err);
      },
    });
  }

  loadIncomeData(): void {
    if (!this.currentEmpId) return;

    this.isLoading = true;
    this.attendanceService.getEmployeeIncome(this.currentEmpId).subscribe({
      next: (res) => {
        if (res.status === 'success') {
          this.summary = res.summary;
          this.logs = res.logs;
          this.setupChartData();
        }
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error loading income data:', err);
        this.isLoading = false;
      },
    });
  }

  setupChartData(): void {
    this.chartData = {
      labels: ['รายได้ต่อวัน', 'รวมรายได้ทั้งหมด', 'รายได้สะสมต่อเดือน'],
      datasets: [
        {
          data: [this.summary.dailyIncome, this.summary.totalIncome, this.summary.monthlyIncome],
          backgroundColor: ['#ef4444', '#15803d', '#f59e0b'],
          hoverBackgroundColor: ['#dc2626', '#166534', '#d97706'],
          borderWidth: 0,
        },
      ],
    };
  }

  initChartOptions(): void {
    this.chartOptions = {
      plugins: {
        legend: {
          labels: { color: '#ffffff', usePointStyle: true },
          position: 'top',
        },
      },
      cutout: '60%',
    };
  }

  goBack(): void {
    window.history.back();
  }
}
