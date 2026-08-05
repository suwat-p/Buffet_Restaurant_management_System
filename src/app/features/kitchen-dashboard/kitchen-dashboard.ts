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
  cookingCount: number = 0;
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

    this.newOrderSub = this.signalrService.newKitchenOrder$.subscribe((orderId) => {
      this.fetchAndAddTicket(orderId);
    });

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

  markAsDone(orderId: number) {
    this.orderService.ServeOrder(orderId).subscribe({
      next: () => this.removeOrder(orderId),
      error: (err) => console.error('อัปเดตสถานะออเดอร์ไม่สำเร็จ', err),
    });
  }

  ngOnDestroy() {
    if (this.timer) clearInterval(this.timer);
    if (this.newOrderSub) this.newOrderSub.unsubscribe();
    if (this.statusSub) this.statusSub.unsubscribe();
  }
}
