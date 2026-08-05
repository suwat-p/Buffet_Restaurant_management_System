import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute } from '@angular/router';
import { OrderService } from '../../../service/api/order.service';

@Component({
  selector: 'app-serve-action',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './serve-action.html',
  styleUrl: './serve-action.scss',
})
export class ServeAction implements OnInit {
  loading = true;
  error = '';
  orderInfo: any = null;

  constructor(
    private route: ActivatedRoute,
    private orderService: OrderService,
  ) {}

  ngOnInit() {
    const orderId = Number(this.route.snapshot.queryParamMap.get('orderId'));
    if (!orderId) {
      this.error = 'ไม่พบเลขออเดอร์ใน QR';
      this.loading = false;
      return;
    }

    // 📲 ดึงโต๊ะ + รายการอาหารมาแสดงให้พนักงานเช็คก่อน
    this.orderService.GetServeInfo(orderId).subscribe({
      next: (info) => {
        this.orderInfo = info;
        this.loading = false;

        // 🍽️ เปลี่ยนสถานะเป็น "กำลังนำเสิร์ฟ" ทันทีที่สแกน ไม่ต้องกดยืนยันซ้ำ
        this.orderService.ServeOrder(orderId).subscribe({
          error: (err) => console.error('อัปเดตสถานะไม่สำเร็จ', err),
        });
      },
      error: () => {
        this.error = 'ไม่พบรายการออเดอร์นี้ หรือถูกเสิร์ฟไปแล้ว';
        this.loading = false;
      },
    });
  }
}
