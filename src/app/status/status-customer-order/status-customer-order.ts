import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { CustomerNavbar } from '../../components/menu-bar/customer-navbar/customer-navbar';
import { OrderService, OrderStatusItem } from '../../service/api/order.service';

// 1. Steps สำหรับออเดอร์สั่งปกติที่ร้าน
const NORMAL_STEPS = [
  { label: 'รับออเดอร์' },
  { label: 'กำลังจัดเตรียมอาหาร' },
  { label: 'กำลังนำเสริฟ' },
  { label: 'ดำเนินการเสร็จสิ้น' },
];

// 2. Steps สำหรับออเดอร์สั่งล่วงหน้า (Pre-order)
const PREORDER_STEPS = [
  { label: 'รับออเดอร์สั่งล่วงหน้า' },
  { label: 'รอเช็คอินเข้าร้าน' },
  { label: 'กำลังจัดเตรียมอาหาร' },
  { label: 'ดำเนินการเสร็จสิ้น' },
];

// 3. Map สถานะ DB เป็น Index (ปกติ)
const NORMAL_STATUS_MAP: Record<string, number> = {
  รับออเดอร์: 0,
  กำลังจัดเตรียมอาหาร: 1,
  กำลังนำเสิร์ฟ: 2,
  เสร็จสิ้น: 3,
};

// 4. Map สถานะ DB เป็น Index (สั่งล่วงหน้า)
const PREORDER_STATUS_MAP: Record<string, number> = {
  รับออเดอร์: 0,
  สั่งล่วงหน้าสำเร็จ: 0,
  รอเช็คอิน: 1,
  กำลังจัดเตรียมอาหาร: 2,
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
  bookingId: number | null = null;
  isPreorder = false;

  // กำหนด Dynamic Steps และ Status Map
  steps = NORMAL_STEPS;
  private currentStatusMap = NORMAL_STATUS_MAP;

  orderItems: { name: string; quantity: number }[] = [];
  overallStatusText = '';

  private statusSub?: Subscription;
  private paramSub?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private orderService: OrderService,
  ) {}

  ngOnInit() {
    // เช็ค Query Params สำหรับกรณี Pre-order (สั่งล่วงหน้า)
    this.route.queryParams.subscribe((queryParams) => {
      if (queryParams['bookingId']) {
        this.isPreorder = true;
        this.bookingId = Number(queryParams['bookingId']);
        this.steps = PREORDER_STEPS;
        this.currentStatusMap = PREORDER_STATUS_MAP;

        this.loadPreorderStatus();
      }
    });

    // เช็ค Route Param สำหรับกรณี สั่งปกติที่ร้าน
    this.paramSub = this.route.paramMap.subscribe((params) => {
      const idParam = params.get('orderId');
      if (idParam && !this.isPreorder) {
        const newOrderId = Number(idParam);
        if (newOrderId === this.orderId) return;

        this.orderId = newOrderId;
        this.isPreorder = false;
        this.steps = NORMAL_STEPS;
        this.currentStatusMap = NORMAL_STATUS_MAP;

        this.resetState();
        this.statusSub?.unsubscribe();

        this.loadInitialStatus();
        this.listenForRealtimeUpdates();
      }
    });
  }

  ngOnDestroy() {
    this.paramSub?.unsubscribe();
    this.statusSub?.unsubscribe();
    this.orderService.disconnect();
  }

  private resetState() {
    this.currentStep = 0;
    this.overallStatusText = '';
    this.orderItems = [];
  }

  // โหลดออเดอร์ปกติ
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
      error: (err) => console.error('โหลดสถานะออเดอร์ไม่สำเร็จ:', err),
    });
  }

  // โหลดออเดอร์สั่งล่วงหน้า (Pre-order)
  private loadPreorderStatus() {
    if (!this.bookingId) return;
    this.resetState();

    // ตัวอย่างการรับ/แม็ปข้อมูลสั่งล่วงหน้า
    this.orderService.GetOrderStatus(this.bookingId).subscribe({
      next: (res) => {
        this.overallStatusText = res.orderStatus || 'รับออเดอร์';
        this.orderItems = res.items.map((item: OrderStatusItem) => ({
          name: item.menuName,
          quantity: item.quantity,
        }));
        this.updateTracker(this.overallStatusText);
      },
      error: (err) => console.error('โหลดสถานะ Pre-order ไม่สำเร็จ:', err),
    });
  }

  private listenForRealtimeUpdates() {
    this.statusSub = this.orderService.connect().subscribe((event) => {
      if (event.orderId !== this.orderId) return;
      this.overallStatusText = event.status;
      this.updateTracker(event.status);
    });
  }

  private updateTracker(statusText: string) {
    const index = this.currentStatusMap[statusText];
    if (index !== undefined) {
      this.currentStep = index;
    } else {
      console.warn('ไม่รู้จักสถานะนี้ ตรวจสอบ Map:', statusText);
    }
  }
}
