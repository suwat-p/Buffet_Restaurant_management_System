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
        this.loadActiveOrders();
        this.listenForRealtimeUpdates();
      }
    });
  }

  ngOnDestroy() {
    this.paramSub?.unsubscribe();
    this.statusSub?.unsubscribe();
    this.orderService.disconnect();
  }

  private loadActiveOrders() {
    this.orderService.GetActiveOrdersByBill(this.billId).subscribe({
      next: (res: any[]) => {
        this.activeOrders = res.map((ord) => ({
          orderId: ord.orderId,
          orderStatus: ord.orderStatus || 'กำลังจัดเตรียมอาหาร',
          currentStep: STATUS_MAP[ord.orderStatus] ?? 1,
          items: ord.items.map((i: any) => ({
            name: i.menuName,
            quantity: i.quantity,
          })),
        }));
      },
      error: (err) => console.error('โหลดรายการออเดอร์ไม่สำเร็จ:', err),
    });
  }

  private listenForRealtimeUpdates() {
    this.statusSub = this.orderService.connect().subscribe((event) => {
      const targetOrder = this.activeOrders.find((o) => o.orderId === event.orderId);

      if (targetOrder) {
        if (event.status === 'เสร็จสิ้น') {
          // 🟢 ลบออเดอร์ที่เสร็จสิ้นออกจากหน้าจอทันที
          this.activeOrders = this.activeOrders.filter((o) => o.orderId !== event.orderId);
        } else {
          // 🟢 อัปเดตสถานะ Real-time
          targetOrder.orderStatus = event.status;
          targetOrder.currentStep = STATUS_MAP[event.status] ?? targetOrder.currentStep;
        }
      } else if (event.status !== 'เสร็จสิ้น') {
        // หากมีออเดอร์ใหม่เข้ามาในบิลนี้ ให้โหลดข้อมูลใหม่
        this.loadActiveOrders();
      }
    });
  }
}
