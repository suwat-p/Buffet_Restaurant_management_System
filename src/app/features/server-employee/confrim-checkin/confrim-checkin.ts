import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router } from '@angular/router';
import { BarcodeFormat } from '@zxing/library';
import { ZXingScannerModule } from '@zxing/ngx-scanner';
import { jwtDecode } from 'jwt-decode';
import { MenuServer } from "../../../components/menu-bar/menu-server/menu-server";
import { BookingService } from '../../../service/api/booking.service';
import { ConfigService } from '../../../service/api/config.service';

interface CheckinInfo {
  booking_id: number;
  booking_status: string;
  booking_datetime?: string;
  adult_count: number;
  child_count: number;
  member?: { name: string; phone: string } | null;
  table?: { table_id: number; table_number: string } | null;
  all_tables: string[];
}

@Component({
  selector: 'app-confrim-checkin',
  standalone: true,
  imports: [MenuServer, MatIconModule, ZXingScannerModule, CommonModule],
  templateUrl: './confrim-checkin.html',
  styleUrl: './confrim-checkin.scss',
})
export class ConfrimCheckin implements OnInit, OnDestroy {
  // States & Data
  loading = false;
  checkinInfo: CheckinInfo | null = null;
  errorMessage = '';
  successMessage = '';
  isAuthorized = false;
  bookingId: number | null = null;
  empId: number | null = this.getempIdFromToken();
  configId: number | null = null;
  tableId: number | null = null;
  // Scanner Config
  isCameraActive = false;
  allowedFormats = [BarcodeFormat.QR_CODE];

  constructor(
    private bookingService: BookingService,
    private configService: ConfigService,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit(): void {
    // 1. Check Authentication & Permissions
    const token = localStorage.getItem('token') ?? sessionStorage.getItem('token');
    if (!token) {
      this.router.navigate(['/Loginemployee'], {
        queryParams: { returnUrl: this.router.url },
      });
      return;
    }

    try {
      const decoded: any = jwtDecode(token);
      this.isAuthorized = decoded.role === 'พนักงานเสิร์ฟ';
    } catch {
      this.isAuthorized = false;
    }

    this.getconfig();

     const bId = this.route.snapshot.queryParamMap.get('bookingId');
    const tId = this.route.snapshot.queryParamMap.get('tableId');
    if (bId && tId) {
      this.bookingId = Number(bId);
      this.tableId = Number(tId);
      this.fetchCheckinInfo();
    }
  }

  toggleCamera(): void {
    this.isCameraActive = !this.isCameraActive;
    if (this.isCameraActive) {
      this.errorMessage = '';
      this.successMessage = '';
    }
  }

  onHasPermission(hasPermission: boolean): void {
    if (!hasPermission) {
      alert('กรุณาอนุญาตการเข้าถึงกล้องในเบราว์เซอร์เพื่อทำการสแกน');
    }
  }

  onCodeResult(resultString: string): void {
    this.isCameraActive = false;
    this.parseQrCodeAndFetch(resultString);
  }

  parseQrCodeAndFetch(qrData: string): void {
    try {
      if (qrData.includes('bookingId=') && qrData.includes('tableId=')) {
        const url = new URL(qrData);
        this.bookingId = Number(url.searchParams.get('bookingId'));
        this.tableId = Number(url.searchParams.get('tableId'));
      } else {
        const parsed = JSON.parse(qrData);
        this.bookingId = parsed.bookingId;
        this.tableId = parsed.tableId;
      }

      if (this.bookingId && this.tableId) {
        this.fetchCheckinInfo();
      } else {
        this.errorMessage = 'รูปแบบข้อมูลใน QR Code ไม่ถูกต้อง';
      }
    } catch {
      this.errorMessage = 'ไม่สามารถอ่านข้อมูลจาก QR Code นี้ได้';
    }
  }


  getempIdFromToken(): number | null {
    const token = localStorage.getItem('token') ?? sessionStorage.getItem('token');
    if (!token) return null;
    try {
      const decoded: any = jwtDecode(token);
      return decoded.emp_id ?? decoded.Emp_id ?? null;
    } catch {
      return null;
    }
  }

   fetchCheckinInfo(): void {
    if (!this.bookingId || !this.tableId) return;

    this.loading = true;
    this.errorMessage = '';
    console.log(this.tableId)
    this.bookingService.getCheckinInfo(this.bookingId, this.tableId).subscribe({
      next: (data: CheckinInfo) => {
        console.log('📌 ข้อมูลที่ได้จาก API Checkin:', data);
        this.checkinInfo = data;
        this.loading = false;
      },
      error: (err) => {
        this.errorMessage = err.error?.message ?? 'ไม่พบข้อมูลการจอง';
        this.loading = false;
      },
    });
  }

  formatDate(dateTimeStr?: string): string {
    if (!dateTimeStr) return '-';
    const [datePart] = dateTimeStr.split('T');
    if (!datePart) return '-';

    const [year, month, day] = datePart.split('-');
    return `${day}/${month}/${year}`;
  }

  formatTime(dateTimeStr?: string): string {
    if (!dateTimeStr) return '-';
    const [, timePart] = dateTimeStr.split('T');
    if (!timePart) return '-';

    return timePart.substring(0, 5) + ' น.';
  }

  // 🎯 ยืนยันการเช็คอินโดยไม่ต้องใช้ tableId
  confirmCheckin(): void {
    if (!this.isAuthorized) {
      this.errorMessage = 'คุณไม่มีสิทธิ์ในการทำรายการนี้';
      return;
    }
    if (!this.bookingId) {
      this.errorMessage = 'ข้อมูลการจองไม่ถูกต้อง';
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    const checkedInTables =
      this.checkinInfo?.all_tables && this.checkinInfo.all_tables.length > 0
        ? this.checkinInfo.all_tables.join(', ')
        : (this.checkinInfo?.table?.table_number ?? '-');

    // 🎯 Payload ส่งไปแค่ bookingId, config_id, emp_id
    const payload = {
      bookingId: this.bookingId,
      BookingId: this.bookingId,
      config_id: this.configId,
      Config_id: this.configId,
      emp_id: this.empId,
      Emp_id: this.empId,
      discount_id: null,
      Discount_id: null
    };

    this.bookingService.confirmCheckin(payload).subscribe({
      next: (res: any) => {
        console.log('Checkin & Bill Success Response:', res);
        this.successMessage = `✅ เช็คอินโต๊ะ ${checkedInTables} และสร้างบิลสำเร็จ!`;
        this.checkinInfo = null;
        this.loading = false;
      },
      error: (err) => {
        this.errorMessage = err.error?.message ?? 'เช็คอินไม่สำเร็จ';
        this.loading = false;
      },
    });
  }

  getconfig(): void {
    this.configService.getConfig().subscribe({
      next: (data: any[]) => {
        if (data && data.length > 0) {
          this.configId = data[0].config_id ?? data[0].Config_id ?? 1;
        } else {
          this.configId = 1;
        }
      },
      error: (err) => {
        console.error('เกิดข้อผิดพลาดในการดึงข้อมูล Config:', err);
        this.configId = 1;
      }
    });
  }

  resetScanner(): void {
    this.checkinInfo = null;
    this.errorMessage = '';
    this.successMessage = '';
    this.bookingId = null;
    this.isCameraActive = true;
  }

  goBack(): void {
    this.isCameraActive = false;
    this.router.navigate(['/']);
  }

  ngOnDestroy(): void {
    this.isCameraActive = false;
  }
}