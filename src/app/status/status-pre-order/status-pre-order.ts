import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { MenuPreorder } from '../../components/menu-bar/menu-member/menu-preorder/menu-preorder';
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
  selector: 'app-status-pre-order',
  standalone: true,
  imports: [CommonModule, MatIconModule, RouterModule, MenuPreorder],
  templateUrl: './status-pre-order.html',
  styleUrl: './status-pre-order.scss',
})
export class StatusPreOrder implements OnInit, OnDestroy {
  billId!: number;
  steps = STEPS;
  activeOrders: ActiveOrder[] = [];
  completedOrders: ActiveOrder[] = [];

  // sidebar เริ่มเปิดบนจอเดสก์ท็อป และปิดเป็นค่าเริ่มต้นบนมือถือ (แบบเดียวกับ pre-order)
  isSidebarOpen: boolean = true;
  cartBadgeCount: number = 0;

  private statusSub?: Subscription;
  private paramSub?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private orderService: OrderService,
    private router: Router,
  ) {}

  ngOnInit() {
    this.isSidebarOpen = window.innerWidth > 768;

    this.paramSub = this.route.paramMap.subscribe((params) => {
      const idParam = params.get('billId');
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
      error: (err) => console.error('โหลดรายการออเดอร์สั่งล่วงหน้าไม่สำเร็จ:', err),
    });
  }

  // เปิด/ปิด sidebar ด้วยปุ่ม hamburger (แบบเดียวกับ pre-order)
  toggleSidebar() {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  // ปิด sidebar อัตโนมัติเมื่อกดเมนูบนมือถือ (แบบเดียวกับ pre-order)
  closeSidebar() {
    if (window.innerWidth <= 768) {
      this.isSidebarOpen = false;
    }
  }

  // กลับไปหน้าสั่งอาหารล่วงหน้า (เมนู) ของการจองนี้
  goToMenu() {
    this.router.navigate(['/PreOrder'], {
      queryParams: { bookingId: this.billId },
    });
  }

  // ตะกร้าอยู่ในหน้าเมนู ให้พาไปหน้าเมนูแล้วเปิดตะกร้าที่นั่น
  toggleCartModal() {
    this.goToMenu();
  }

  // อยู่หน้าติดตามสถานะออเดอร์อยู่แล้ว กดจากตรงนี้ไม่ต้องทำอะไร
  goToOrderStatus() {}

  // กลับไปหน้าสถานะการจอง
  goToBookingStatus() {
    this.router.navigate(['/BookingStatus'], {
      queryParams: { bookingId: this.billId },
    });
  }

  private listenForRealtimeUpdates() {
    this.statusSub = this.orderService.connect().subscribe((event) => {
      const activeIndex = this.activeOrders.findIndex((o) => o.orderId === event.orderId);

      if (activeIndex !== -1) {
        const targetOrder = this.activeOrders[activeIndex];
        const newStatus = event.status;

        if (newStatus === 'เสร็จสิ้น' || newStatus === 'ดำเนินการเสร็จสิ้น') {
          targetOrder.orderStatus = 'ดำเนินการเสร็จสิ้น';
          targetOrder.currentStep = 3;

          this.activeOrders.splice(activeIndex, 1);
          this.completedOrders.unshift(targetOrder);
        } else {
          targetOrder.orderStatus = newStatus;
          targetOrder.currentStep = STATUS_MAP[newStatus] ?? targetOrder.currentStep;
        }
      } else {
        this.loadOrders();
      }
    });
  }
}
