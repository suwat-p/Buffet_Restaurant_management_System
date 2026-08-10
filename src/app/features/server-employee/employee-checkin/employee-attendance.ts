import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';
import { AttendanceService, AttendanceRecord } from '../../../service/api/attendance.service';
import { AuthService } from '../../../service/api/auth.service';
import { MenuServer } from '../../../components/menu-bar/menu-server/menu-server';
import { Constants } from '../../../config/contants';

type TodayStatus = 'idle' | 'working' | 'done';

interface EmployeeProfile {
  empId: number;
  fullname: string;
  position: string;
  shiftStart?: string;
  shiftEnd?: string;
  imageUrl?: string;
}

@Component({
  selector: 'app-employee-attendance',
  standalone: true,
  imports: [CommonModule, ButtonModule, RippleModule, ToastModule, ConfirmDialogModule, MenuServer],
  providers: [ConfirmationService],
  templateUrl: './employee-attendance.html',
  styleUrl: './employee-attendance.scss',
})
export class EmployeeAttendance implements OnInit {
  private readonly THAI_MONTHS = [
    'มกราคม',
    'กุมภาพันธ์',
    'มีนาคม',
    'เมษายน',
    'พฤษภาคม',
    'มิถุนายน',
    'กรกฎาคม',
    'สิงหาคม',
    'กันยายน',
    'ตุลาคม',
    'พฤศจิกายน',
    'ธันวาคม',
  ];

  loadingProfile = true;
  employee: EmployeeProfile | null = null;

  activeTab: 'clock' | 'history' = 'clock';
  isViewOnly = false; // 👈 เช็กโหมดผู้จัดการดูประวัติ

  allLogs: AttendanceRecord[] = [];
  myHistory: AttendanceRecord[] = [];
  todayRecord: AttendanceRecord | null = null;
  todayStatus: TodayStatus = 'idle';

  isProcessing = false;
  pendingAction: 'in' | 'out' | null = null;

  constructor(
    private attendanceService: AttendanceService,
    private authService: AuthService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private router: Router,
    private route: ActivatedRoute,
    private constants: Constants,
  ) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      const paramEmpId = params['emp_id'];

      if (paramEmpId) {
        this.isViewOnly = true;
        this.activeTab = 'history';
      }

      this.loadCurrentEmployee(paramEmpId ? Number(paramEmpId) : null);
    });
  }

  goBack(): void {
    window.history.back();
  }

  padId(id: number): string {
    return String(id).padStart(3, '0');
  }

  private buildImageUrl(path?: string | null): string | undefined {
    if (!path) return undefined;
    if (/^https?:\/\//i.test(path)) return path;
    const base = (this.constants.API_ENDPOINT ?? '').replace(/\/$/, '');
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${base}${cleanPath}`;
  }

  private loadCurrentEmployee(targetEmpId: number | null): void {
    let empIdToLoad = targetEmpId;

    if (!empIdToLoad) {
      const member = this.authService.getMember();
      if (!member || !member.id) {
        this.router.navigate(['/Loginemployee'], {
          queryParams: { returnUrl: this.router.url },
        });
        return;
      }
      empIdToLoad = Number(member.id);
    }

    this.authService.getEmployeebyId(empIdToLoad).subscribe({
      next: (res: any) => {
        const emp = Array.isArray(res) ? res[0] : res;

        if (!emp) {
          this.messageService.add({
            severity: 'error',
            summary: 'ไม่พบข้อมูล',
            detail: 'ไม่พบข้อมูลพนักงานของบัญชีนี้',
          });
          this.loadingProfile = false;
          return;
        }

        let start = emp.start_Time ?? emp.start_time ?? emp.shift_start ?? emp.Shift_start;
        let end = emp.end_Time ?? emp.end_time ?? emp.shift_end ?? emp.Shift_end;

        if (start && start.length >= 5) start = start.substring(0, 5);
        if (end && end.length >= 5) end = end.substring(0, 5);

        this.employee = {
          empId: emp.emp_id ?? emp.Emp_id ?? empIdToLoad,
          fullname: emp.fullname ?? emp.Fullname ?? '-',
          position: emp.department ?? emp.position ?? emp.Position ?? '-',
          shiftStart: start,
          shiftEnd: end,
          imageUrl: this.buildImageUrl(emp.image_Profile ?? emp.image_url ?? emp.Image_url),
        };

        this.loadingProfile = false;
        this.loadHistory();
      },
      error: () => {
        this.loadingProfile = false;
        this.messageService.add({
          severity: 'error',
          summary: 'ผิดพลาด',
          detail: 'โหลดข้อมูลพนักงานไม่สำเร็จ',
        });
      },
    });
  }

  loadHistory(): void {
    if (!this.employee) return;
    this.attendanceService.getLogs().subscribe({
      next: (res) => {
        this.allLogs = res.data
          .filter((l: any) => {
            const logEmpId = l.emp_id ?? l.Emp_id ?? l.employeeId;
            return Number(logEmpId) === Number(this.employee!.empId);
          })
          .map((l: any) => ({
            employeeId: l.emp_id ?? l.Emp_id ?? l.employeeId,
            clockInTime: l.clockInTime ?? l.ClockInTime ?? l.time_in ?? l.Time_in,
            clockOutTime: l.clockOutTime ?? l.ClockOutTime ?? l.time_out ?? l.Time_out,
          }));

        this.myHistory = [...this.allLogs].sort(
          (a, b) =>
            this.toBangkokInstant(b.clockInTime).getTime() -
            this.toBangkokInstant(a.clockInTime).getTime(),
        );

        this.resolveTodayStatus();
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'ผิดพลาด',
          detail: 'โหลดประวัติการลงเวลาไม่สำเร็จ',
        });
      },
    });
  }

  private resolveTodayStatus(): void {
    const todayKey = this.bangkokDateKey(new Date());

    const todayLogs = this.myHistory.filter(
      (l) => this.bangkokDateKey(this.toBangkokInstant(l.clockInTime)) === todayKey,
    );

    if (todayLogs.length === 0) {
      this.todayRecord = null;
      this.todayStatus = 'idle';
    } else {
      const latestRecord = todayLogs[0];

      if (!latestRecord.clockOutTime) {
        this.todayRecord = latestRecord;
        this.todayStatus = 'working';
      } else {
        this.todayRecord = latestRecord;
        this.todayStatus = 'done';
      }
    }
  }

  private getPosition(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('เบราว์เซอร์นี้ไม่รองรับการระบุตำแหน่ง'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        resolve,
        () =>
          reject(
            new Error(
              'ไม่สามารถระบุตำแหน่งได้ กรุณาเปิดสิทธิ์เข้าถึงตำแหน่ง (Location) ในเบราว์เซอร์',
            ),
          ),
        { enableHighAccuracy: true, timeout: 10000 },
      );
    });
  }

  async doClockIn(): Promise<void> {
    if (!this.employee) return;
    this.isProcessing = true;
    this.pendingAction = 'in';
    try {
      const pos = await this.getPosition();
      this.attendanceService
        .clockIn({
          employeeId: this.employee.empId,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        })
        .subscribe({
          next: (res) => {
            this.messageService.add({
              severity: 'success',
              summary: 'สำเร็จ',
              detail: res.message,
            });
            this.loadHistory();
            this.finishAction();
          },
          error: (err) => {
            this.messageService.add({
              severity: 'error',
              summary: 'ลงเวลาไม่สำเร็จ',
              detail: err?.error?.message ?? 'เกิดข้อผิดพลาด กรุณาลองใหม่',
              life: 6000,
            });
            this.finishAction();
          },
        });
    } catch (e: any) {
      this.messageService.add({ severity: 'error', summary: 'ผิดพลาด', detail: e.message });
      this.finishAction();
    }
  }

  async doClockOut(): Promise<void> {
    if (!this.employee) return;

    if (this.todayRecord && this.todayRecord.clockInTime) {
      const clockInTime = new Date(this.todayRecord.clockInTime).getTime();
      const nowTime = new Date().getTime();
      const hoursWorked = (nowTime - clockInTime) / (1000 * 60 * 60);

      let standardHours = 8;

      if (this.employee.shiftStart && this.employee.shiftEnd) {
        const [startH, startM] = this.employee.shiftStart.split(':').map(Number);
        const [endH, endM] = this.employee.shiftEnd.split(':').map(Number);

        let startInMinutes = startH * 60 + (startM || 0);
        let endInMinutes = endH * 60 + (endM || 0);

        if (endInMinutes <= startInMinutes) {
          endInMinutes += 24 * 60;
        }

        standardHours = (endInMinutes - startInMinutes) / 60;
      }

      if (hoursWorked < standardHours) {
        const minutesWorked = Math.round((nowTime - clockInTime) / (1000 * 60));

        this.confirmationService.confirm({
          message: `คุณเพิ่งทำงานไปเพียง ${minutesWorked} นาที (ไม่ครบกะ ${standardHours} ชม.) รายได้จะถูกคิดตามชั่วโมงจริง คุณต้องการยืนยันออกงานใช่หรือไม่?`,
          header: 'คำเตือน: ออกงานก่อนเวลา',
          icon: 'pi pi-exclamation-triangle',
          acceptLabel: 'ตกลง',
          rejectLabel: 'ยกเลิก',
          acceptButtonStyleClass: 'p-button-danger',
          rejectButtonStyleClass: 'p-button-secondary',
          accept: () => {
            this.executeClockOut();
          },
          reject: () => {},
        });
        return;
      }
    }

    this.executeClockOut();
  }

  private async executeClockOut(): Promise<void> {
    if (!this.employee) return;
    this.isProcessing = true;
    this.pendingAction = 'out';
    try {
      const pos = await this.getPosition();
      this.attendanceService
        .clockOut({
          employeeId: this.employee.empId,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        })
        .subscribe({
          next: (res) => {
            const isWarning = res.message && res.message.includes('เตือน');

            this.messageService.add({
              severity: isWarning ? 'warn' : 'success',
              summary: isWarning ? 'แจ้งเตือนการออกงาน' : 'สำเร็จ',
              detail: res.message,
              life: 8000,
            });

            this.loadHistory();
            this.finishAction();
          },
          error: (err) => {
            this.messageService.add({
              severity: 'error',
              summary: 'ลงเวลาไม่สำเร็จ',
              detail: err?.error?.message ?? 'เกิดข้อผิดพลาด กรุณาลองใหม่',
              life: 6000,
            });
            this.finishAction();
          },
        });
    } catch (e: any) {
      this.messageService.add({ severity: 'error', summary: 'ผิดพลาด', detail: e.message });
      this.finishAction();
    }
  }

  private finishAction(): void {
    this.isProcessing = false;
    this.pendingAction = null;
  }

  formatTime(iso: string): string {
    const d = this.toBangkokInstant(iso);
    return d.toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Bangkok',
    });
  }

  formatThaiDate(iso: string): string {
    const d = this.toBangkokInstant(iso);
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Bangkok',
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
    }).formatToParts(d);

    const day = Number(parts.find((p) => p.type === 'day')!.value);
    const month = Number(parts.find((p) => p.type === 'month')!.value);
    const year = Number(parts.find((p) => p.type === 'year')!.value);

    return `${day} ${this.THAI_MONTHS[month - 1]} ${year + 543}`;
  }

  private toBangkokInstant(iso: string): Date {
    const hasTimezone = /Z$|[+-]\d{2}:\d{2}$/.test(iso);
    return new Date(hasTimezone ? iso : `${iso}+07:00`);
  }

  private bangkokDateKey(d: Date): string {
    return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
  }
}
