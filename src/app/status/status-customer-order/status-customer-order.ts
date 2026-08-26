import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { CustomerNavbar } from '../../components/menu-bar/customer-navbar/customer-navbar';
import { OrderService } from '../../service/api/order.service';

export interface ActiveOrderItem {
  name: string;
  quantity: number;
}

export interface ActiveOrder {
  orderId: number;
  orderStatus: string;
  currentStep: number;
  items: ActiveOrderItem[];
}

const STEPS = [
  { label: 'รับออเดอร์' },
  { label: 'กำลังจัดเตรียมอาหาร' },
  { label: 'กำลังนำเสิร์ฟ' },
  { label: 'ดำเนินการเสร็จสิ้น' },
];

const STATUS_MAP: Record<string, number> = {
  รับออเดอร์: 0,
  กำลังจัดเตรียมอาหาร: 1,
  กำลังนำเสิร์ฟ: 2,
  ดำเนินการเสร็จสิ้น: 3,
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
  billId!: number;
  steps = STEPS;
  activeOrders: ActiveOrder[] = [];
  completedOrders: ActiveOrder[] = [];

  private statusSub?: Subscription;
  private paramSub?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private orderService: OrderService,
  ) {}

  ngOnInit() {
    this.paramSub = this.route.paramMap.subscribe((params) => {
      const idParam = params.get('billId') || params.get('orderId');
      if (idParam) {
        this.billId = Number(idParam);
        this.loadOrders();
        this.listenForRealtimeUpdates();
      }
    });
  }

  ngOnDestroy() {
    this.paramSub?.unsubscribe();
    this.statusSub?.unsubscribe();
    this.orderService.disconnect();
  }

  private loadOrders() {
    this.orderService.GetActiveOrdersByBill(this.billId).subscribe({
      next: (res: any[]) => {
        const allMapped = res.map((ord) => ({
          orderId: ord.orderId,
          orderStatus: ord.orderStatus || 'กำลังจัดเตรียมอาหาร',
          currentStep: STATUS_MAP[ord.orderStatus] ?? 1,
          items: (ord.items || []).map((i: any) => ({
            name: i.menuName,
            quantity: i.quantity,
          })),
        }));

        this.activeOrders = allMapped.filter(
          (o) => o.orderStatus !== 'เสร็จสิ้น' && o.orderStatus !== 'ดำเนินการเสร็จสิ้น',
        );
        this.completedOrders = allMapped.filter(
          (o) => o.orderStatus === 'เสร็จสิ้น' || o.orderStatus === 'ดำเนินการเสร็จสิ้น',
        );
      },
      error: (err) => console.error('โหลดรายการออเดอร์ไม่สำเร็จ:', err),
    });
  }

  private listenForRealtimeUpdates() {
    this.statusSub = this.orderService.connect().subscribe((event) => {
      // 🟢 หา Order จากฝั่ง Active
      const activeIndex = this.activeOrders.findIndex((o) => o.orderId === event.orderId);

      if (activeIndex !== -1) {
        const targetOrder = this.activeOrders[activeIndex];
        const newStatus = event.status;

        if (newStatus === 'เสร็จสิ้น' || newStatus === 'ดำเนินการเสร็จสิ้น') {
          // ย้ายจาก activeOrders ไปยัง completedOrders ทันที
          targetOrder.orderStatus = 'ดำเนินการเสร็จสิ้น';
          targetOrder.currentStep = 3;

          this.activeOrders.splice(activeIndex, 1);
          this.completedOrders.unshift(targetOrder);
        } else {
          // อัปเดตสถานะแบบ Real-time
          targetOrder.orderStatus = newStatus;
          targetOrder.currentStep = STATUS_MAP[newStatus] ?? targetOrder.currentStep;
        }
      } else {
        // หากเป็นออเดอร์ใหม่ที่กดสั่งเข้ามา ให้โหลดข้อมูลใหม่
        this.loadOrders();
      }
    });
  }
}
