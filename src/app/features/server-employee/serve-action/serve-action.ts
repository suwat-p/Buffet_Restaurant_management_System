import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router } from '@angular/router';
import { BarcodeFormat } from '@zxing/library';
import { ZXingScannerModule } from '@zxing/ngx-scanner';
import { OrderService } from '../../../service/api/order.service';
import { AuthService } from '../../../service/api/auth.service';
import { MenuServer } from '../../../components/menu-bar/menu-server/menu-server';
import { IndexNavbar } from '../../../components/menu-bar/index-navbar/index-navbar';

@Component({
  selector: 'app-serve-action',
  standalone: true,
  imports: [CommonModule, MatIconModule, MenuServer, IndexNavbar, ZXingScannerModule],
  templateUrl: './serve-action.html',
  styleUrl: './serve-action.scss',
})
export class ServeAction implements OnInit, OnDestroy {
  // States & Data
  loading = false;
  submitting = false;
  isServed = false;
  error = '';
  orderInfo: any = null;
  orderId: number | null = null;

  isLoggedIn = false;
  isServerRole = false;

  // Scanner Config
  isCameraActive = false;
  allowedFormats = [BarcodeFormat.QR_CODE];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private orderService: OrderService,
    private authService: AuthService,
  ) {}

  ngOnInit() {
    const member = this.authService.getMember();
    this.isLoggedIn = !!member;
    this.isServerRole = this.authService.isServer();

    if (!this.isLoggedIn) {
      this.error = 'กรุณาเข้าสู่ระบบก่อนดำเนินการ';
      return;
    }

    if (!this.isServerRole) {
      this.error = 'คุณไม่มีสิทธิ์เข้าถึงหน้านี้ (เฉพาะพนักงานเสิร์ฟเท่านั้น)';
      return;
    }

    // 🎯 รองรับ deep link เดิมที่ส่ง orderId มาทาง URL query param (เช่น เปิดจาก QR ภายนอก)
    const oId = this.route.snapshot.queryParamMap.get('orderId');
    if (oId) {
      this.orderId = Number(oId);
      this.fetchServeInfo();
    }
  }

  // ===== Scanner =====
  toggleCamera(): void {
    this.isCameraActive = !this.isCameraActive;
    if (this.isCameraActive) {
      this.error = '';
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

  // 🎯 แกะ QR Code ให้รับได้ทั้ง URL ที่มี orderId=, ตัวเลขล้วน หรือ JSON
  parseQrCodeAndFetch(qrData: string): void {
    try {
      if (qrData.includes('orderId=')) {
        const url = new URL(qrData);
        this.orderId = Number(url.searchParams.get('orderId'));
      } else if (!isNaN(Number(qrData))) {
        // กรณี QR Code มีแค่ตัวเลข OrderId เพียวๆ
        this.orderId = Number(qrData);
      } else {
        const parsed = JSON.parse(qrData);
        this.orderId = parsed.orderId ?? parsed.order_id;
      }

      if (this.orderId) {
        this.fetchServeInfo();
      } else {
        this.error = 'รูปแบบข้อมูลใน QR Code ไม่ถูกต้อง';
      }
    } catch {
      this.error = 'ไม่สามารถอ่านข้อมูลจาก QR Code นี้ได้';
    }
  }

  // ===== Data =====
  fetchServeInfo(): void {
    if (!this.orderId) return;

    this.loading = true;
    this.error = '';

    this.orderService.GetServeInfo(this.orderId).subscribe({
      next: (info: any) => {
        this.orderInfo = info;
        this.loading = false;
        if (info.orderStatus === 'เสร็จสิ้น') {
          this.isServed = true;
        }
      },
      error: (err: HttpErrorResponse) => {
        console.error('โหลดข้อมูลออเดอร์ไม่สำเร็จ', err);
        this.error = 'ไม่พบข้อมูลออเดอร์นี้ หรือออเดอร์ถูกยกเลิกแล้ว';
        this.loading = false;
      },
    });
  }

  // 🟢 ฟังก์ชันส่งผู้ใช้ไปหน้า Login พร้อมส่ง URL หน้าปัจจุบันไปบันทึก
  goToLogin() {
    const currentUrl = this.router.url;
    this.router.navigate(['/Loginemployee'], {
      queryParams: { returnUrl: currentUrl },
    });
  }

  // 🎯 ยืนยันเสิร์ฟ — ตรรกะเปลี่ยนสถานะเหมือนเดิมทุกประการ ไม่แตะ logic เดิม
  completeServe() {
    if (!this.orderId) return;

    this.submitting = true;
    this.orderService.ServeOrder(this.orderId).subscribe({
      next: () => {
        this.submitting = false;
        this.isServed = true;
      },
      error: (err: HttpErrorResponse) => {
        console.error('อัปเดตสถานะเสิร์ฟไม่สำเร็จ', err);
        this.submitting = false;
        alert('เกิดข้อผิดพลาดในการอัปเดตสถานะ');
      },
    });
  }

  resetScanner(): void {
    this.orderInfo = null;
    this.error = '';
    this.orderId = null;
    this.isServed = false;
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
