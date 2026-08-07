import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute } from '@angular/router';
import { OrderService } from '../../../service/api/order.service';
import { MenuServer } from '../../../components/menu-bar/menu-server/menu-server';

@Component({
  selector: 'app-serve-action',
  standalone: true,
  imports: [CommonModule, MatIconModule, MenuServer],
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

  constructor(
    private route: ActivatedRoute,
    private orderService: OrderService,
  ) {}

  ngOnInit() {
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
        if (info.orderStatus === 'SERVED') {
          this.isServed = true;
        }
      },
      error: () => {
        this.error = 'ไม่พบข้อมูลออเดอร์นี้ หรือออเดอร์ถูกยกเลิกแล้ว';
        this.loading = false;
      },
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
