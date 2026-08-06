import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Subscription } from 'rxjs';

import { OrderService } from '../../service/api/order.service';
import { SignalrService } from '../../service/api/signalr.service';
import { MenuManager } from '../../components/menu-bar/menu-manager/menu-manager';

@Component({
  selector: 'app-kitchen-dashboard',
  standalone: true,
  imports: [CommonModule, MatIconModule, MenuManager],
  templateUrl: './kitchen-dashboard.html',
  styleUrl: './kitchen-dashboard.scss',
})
export class KitchenDashboard implements OnInit, OnDestroy {
  activeOrders: any[] = [];
  pendingCount: number = 0;
  completedTodayCount: number = 0;

  timeNow: string = '';

  private timer: any;
  private newOrderSub!: Subscription;
  private statusSub!: Subscription;

  constructor(
    private orderService: OrderService,
    private signalrService: SignalrService,
  ) {}

  ngOnInit() {
    this.startClock();

    // 🍳 ออเดอร์ใหม่เข้ามา → ดึงตั๋วมาแสดงบนจอ (ไม่ต้องมีใครกดอะไร)
    this.newOrderSub = this.signalrService.newKitchenOrder$.subscribe((orderId) => {
      this.fetchAndAddTicket(orderId);
    });

    // 📲 ออเดอร์ถูกเสิร์ฟแล้ว (สแกน QR ตอนเดินเสิร์ฟจริง) → หายไปจากจอเอง
    this.statusSub = this.signalrService.orderStatusUpdated$.subscribe(({ orderId, status }) => {
      if (status === 'กำลังนำเสิร์ฟ' || status === 'SERVED') {
        this.removeOrder(orderId);
      }
    });
  }

  startClock() {
    this.updateTime();
    this.timer = setInterval(() => this.updateTime(), 1000);
  }

  updateTime() {
    this.timeNow = new Date().toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }

  // ⏱️ คำนวณเวลาที่ออเดอร์ค้างอยู่ (นาที) เพื่อใช้เปลี่ยนสีเตือน
  getElapsedMinutes(orderTime: string | Date): number {
    const diffMs = Date.now() - new Date(orderTime).getTime();
    return Math.floor(diffMs / 60000);
  }

  // 🎨 ระดับความเร่งด่วน: normal (<5นาที) / warning (5-10นาที) / urgent (>10นาที)
  getUrgencyClass(orderTime: string | Date): string {
    const mins = this.getElapsedMinutes(orderTime);
    if (mins >= 10) return 'urgent';
    if (mins >= 5) return 'warning';
    return 'normal';
  }

  private fetchAndAddTicket(orderId: number) {
    this.orderService.GetKitchenTicket(orderId).subscribe({
      next: (ticket: any) => {
        const exists = this.activeOrders.some((o) => o.orderId === ticket.orderId);
        if (!exists) {
          this.activeOrders = [ticket, ...this.activeOrders];
          this.pendingCount = this.activeOrders.length;
        }
      },
      error: (err) => console.error(`โหลดตั๋วครัว order ${orderId} ไม่สำเร็จ`, err),
    });
  }

  private removeOrder(orderId: number) {
    this.activeOrders = this.activeOrders.filter((o) => o.orderId !== orderId);
    this.pendingCount = this.activeOrders.length;
    this.completedTodayCount++;
  }

  ngOnDestroy() {
    if (this.timer) clearInterval(this.timer);
    if (this.newOrderSub) this.newOrderSub.unsubscribe();
    if (this.statusSub) this.statusSub.unsubscribe();
  }
}
