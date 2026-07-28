import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
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
  imports: [CommonModule, ButtonModule, RippleModule, ToastModule, MenuServer],
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
    private router: Router,
    private constants: Constants,
  ) {}

  ngOnInit(): void {
    this.loadCurrentEmployee();
  }

  goBack(): void {
    window.history.back();
  }

  padId(id: number): string {
    return String(id).padStart(3, '0');
  }

  // field รูปจริงจาก backend คือ image_Profile (เช็คจาก detail-employee.html ที่ bind ตรง
  // และใช้งานได้ปกติ) เป็น URL ที่ใช้ได้เลย ไม่ต้องต่อ base URL เพิ่ม
  // เผื่อกรณี backend เปลี่ยนไปส่งเป็น relative path ในอนาคต ฟังก์ชันนี้จะต่อ base ให้อัตโนมัติ
  private buildImageUrl(path?: string | null): string | undefined {
    if (!path) return undefined;
    if (/^https?:\/\//i.test(path)) return path;
    const base = (this.constants.API_ENDPOINT ?? '').replace(/\/$/, '');
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${base}${cleanPath}`;
  }

  // ดึงข้อมูลพนักงานจาก token ที่ login ไว้แล้ว (ไม่ต้องกรอกรหัสเอง)
  private loadCurrentEmployee(): void {
    const member = this.authService.getMember();

    if (!member || !member.id) {
      this.router.navigate(['/Loginemployee'], {
        queryParams: { returnUrl: this.router.url },
      });
      return;
    }

    this.authService.getEmployeebyId(Number(member.id)).subscribe({
      next: (res: any) => {
        // ปรับ mapping ตรงนี้ให้ตรงกับ field จริงที่ backend คืนมา (ดูจาก Network tab ถ้าไม่ตรง)
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

        this.employee = {
          empId: emp.emp_id ?? emp.Emp_id ?? Number(member.id),
          fullname: emp.fullname ?? emp.Fullname ?? member.fullname ?? '-',
          position: emp.department ?? emp.position ?? emp.Position ?? '-',
          shiftStart: emp.shift_start ?? emp.Shift_start,
          shiftEnd: emp.shift_end ?? emp.Shift_end,
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
        this.allLogs = res.data.filter(
          (l: AttendanceRecord) => l.employeeId === this.employee!.empId,
        );
        this.myHistory = [...this.allLogs].sort(
          (a, b) => new Date(b.clockInTime).getTime() - new Date(a.clockInTime).getTime(),
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
    const todayStr = new Date().toDateString();
    const record = this.myHistory.find((l) => new Date(l.clockInTime).toDateString() === todayStr);

    if (!record) {
      this.todayRecord = null;
      this.todayStatus = 'idle';
    } else if (!record.clockOutTime) {
      this.todayRecord = record;
      this.todayStatus = 'working';
    } else {
      this.todayRecord = record;
      this.todayStatus = 'done';
    }
  }

  // ขอพิกัด GPS จริงจากเครื่องพนักงาน ณ ขณะกดปุ่ม
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

  private finishAction(): void {
    this.isProcessing = false;
    this.pendingAction = null;
  }

  formatTime(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false });
  }

  formatThaiDate(iso: string): string {
    const d = new Date(iso);
    return `${d.getDate()} ${this.THAI_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`;
  }
}
