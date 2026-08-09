import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router } from '@angular/router';
import { OrderService } from '../../../service/api/order.service';
import { AuthService } from '../../../service/api/auth.service';
import { MenuServer } from '../../../components/menu-bar/menu-server/menu-server';
import { IndexNavbar } from '../../../components/menu-bar/index-navbar/index-navbar';

@Component({
  selector: 'app-serve-action',
  standalone: true,
  imports: [CommonModule, MatIconModule, MenuServer, IndexNavbar],
  templateUrl: './serve-action.html',
  styleUrl: './serve-action.scss',
})
export class ServeAction implements OnInit {
  loading = true;
  submitting = false;
  isServed = false;
  error = '';
  orderInfo: any = null;
  orderId!: number;

  isLoggedIn: boolean = false;
  isServerRole: boolean = false;

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
      this.loading = false;
      return;
    }

    if (!this.isServerRole) {
      this.error = 'คุณไม่มีสิทธิ์เข้าถึงหน้านี้ (เฉพาะพนักงานเสิร์ฟเท่านั้น)';
      this.loading = false;
      return;
    }

    this.orderId = Number(this.route.snapshot.queryParamMap.get('orderId'));
    if (!this.orderId) {
      this.error = 'ไม่พบหมายเลขออเดอร์ใน QR Code';
      this.loading = false;
      return;
    }

    this.orderService.GetServeInfo(this.orderId).subscribe({
      next: (info: any) => {
        this.orderInfo = info;
        this.loading = false;
        if (info.orderStatus === 'เสร็จสิ้น') {
          this.isServed = true;
        }
      },
      error: () => {
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

  completeServe() {
    this.submitting = true;
    this.orderService.ServeOrder(this.orderId).subscribe({
      next: () => {
        this.submitting = false;
        this.isServed = true;
      },
      error: (err) => {
        console.error('อัปเดตสถานะเสิร์ฟไม่สำเร็จ', err);
        this.submitting = false;
        alert('เกิดข้อผิดพลาดในการอัปเดตสถานะ');
      },
    });
  }
}
