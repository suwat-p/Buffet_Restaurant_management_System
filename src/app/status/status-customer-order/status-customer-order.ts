import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { CustomerNavbar } from '../../components/menu-bar/customer-navbar/customer-navbar';
import { OrderService, OrderStatusItem } from '../../service/api/order.service';

// แม็ปสถานะจาก backend (Order_Status ใน DB) ไปเป็นลำดับ step บน stepper
// ⚠️ ต้องตรงกับ string ที่ backend ใช้จริงเป๊ะ ๆ (ดูจาก OrderController.cs)
const STATUS_STEP_MAP: Record<string, number> = {
  รับออเดอร์: 0,
  กำลังจัดเตรียมอาหาร: 1,
  กำลังนำเสิร์ฟ: 2,
  เสร็จสิ้น: 3,
};

@Component({
  selector: 'app-status-customer-order',
  standalone: true,
  imports: [CommonModule, MatIconModule, RouterModule, CustomerNavbar],
  templateUrl: './status-customer-order.html',
  styleUrl: './status-customer-order.scss',
})
export class StatusCustomerOrder implements OnInit, OnDestroy {
  currentStep = 0;
  orderId!: number;

  steps = [
    { label: 'รับออเดอร์' }, // index 0
    { label: 'กำลังจัดเตรียมอาหาร' }, // index 1
    { label: 'กำลังนำเสริฟ' }, // index 2
    { label: 'ดำเนินการเสร็จสิ้น' }, // index 3
  ];

  orderItems: { name: string; quantity: number }[] = [];
  overallStatusText = '';

  private statusSub?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private orderService: OrderService,
  ) {}

  ngOnInit() {
    const idParam = this.route.snapshot.paramMap.get('orderId');
    if (!idParam) {
      console.error('ไม่พบ orderId ใน route');
      return;
    }
    this.orderId = Number(idParam);

    this.loadInitialStatus();
    this.listenForRealtimeUpdates();
  }

  ngOnDestroy() {
    this.statusSub?.unsubscribe();
    this.orderService.disconnect();
  }

  // โหลดสถานะ + รายการสินค้าปัจจุบันตอนเปิดหน้าครั้งแรก
  private loadInitialStatus() {
    this.orderService.GetOrderStatus(this.orderId).subscribe({
      next: (res) => {
        this.overallStatusText = res.orderStatus;
        this.orderItems = res.items.map((item: OrderStatusItem) => ({
          name: item.menuName,
          quantity: item.quantity,
        }));
        this.updateTracker(res.orderStatus);
      },
      error: (err) => {
        console.error('โหลดสถานะออเดอร์ไม่สำเร็จ:', err);
      },
    });
  }

  // ต่อ SignalR รอฟัง event "OrderStatusUpdated" แบบ real-time
  private listenForRealtimeUpdates() {
    this.statusSub = this.orderService.connect().subscribe((event) => {
      if (event.orderId !== this.orderId) return; // ไม่ใช่ออเดอร์ของเรา ข้ามไป

      this.overallStatusText = event.status;
      this.updateTracker(event.status);
    });
  }

  // แปลงข้อความสถานะ (จาก backend) เป็นลำดับ step บน stepper
  private updateTracker(statusText: string) {
    const index = STATUS_STEP_MAP[statusText];
    if (index !== undefined) {
      this.currentStep = index;
    } else {
      console.warn('ไม่รู้จักสถานะนี้ ตรวจสอบ STATUS_STEP_MAP:', statusText);
    }
  }
}
