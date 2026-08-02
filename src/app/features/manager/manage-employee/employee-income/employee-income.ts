import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router'; // 👈 1. เพิ่ม ActivatedRoute
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
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.initCurrentEmployee();
  }

  // ฟังก์ชันดึง ID จาก Query Param หรือ Token
  private initCurrentEmployee(): void {
    // 👈 3. อ่าน emp_id จาก URL ก่อน
    this.route.queryParams.subscribe((params) => {
      const paramEmpId = params['emp_id'];

      if (paramEmpId) {
        this.currentEmpId = Number(paramEmpId);
      } else {
        // ถ้าไม่มีใน URL ค่อยดึงจากบัญชีที่ล็อกอินอยู่
        const member = this.authService.getMember();
        if (!member || !member.id) {
          this.router.navigate(['/Loginemployee'], {
            queryParams: { returnUrl: this.router.url },
          });
          return;
        }
        this.currentEmpId = Number(member.id);
      }

      this.loadEmployeeData();
      this.loadIncomeData();
      this.initChartOptions();
    });
  }

  loadEmployeeData(): void {
    if (!this.currentEmpId) return;

    this.authService.getEmployeebyId(this.currentEmpId).subscribe({
      next: (res: any) => {
        const emp = Array.isArray(res) ? res[0] : res;
        if (emp) {
          // 👈 4. เช็กฟิลด์เวลาให้รองรับทั้งตัวพิมพ์เล็ก/ใหญ่
          let start = emp.start_Time ?? emp.start_time ?? emp.shift_start ?? emp.Shift_start ?? '-';
          let end = emp.end_Time ?? emp.end_time ?? emp.shift_end ?? emp.Shift_end ?? '-';

          if (start && start.length >= 5) start = start.substring(0, 5);
          if (end && end.length >= 5) end = end.substring(0, 5);

          emp.start_Time = start;
          emp.end_Time = end;

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
