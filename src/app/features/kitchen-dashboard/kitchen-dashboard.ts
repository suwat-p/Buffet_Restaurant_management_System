import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Subscription } from 'rxjs';

import { OrderService } from '../../service/api/order.service';
import { SignalrService } from '../../service/api/signalr.service';
import { KitchenNavbar } from '../../components/menu-bar/menu-kitchen/menu-kitchen';

@Component({
  selector: 'app-kitchen-dashboard',
  standalone: true,
  imports: [CommonModule, MatIconModule, KitchenNavbar],
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
    this.loadActiveOrders(); // โหลดจาก DB ตอนเปิดหน้า / Refresh

    //  ออเดอร์ใหม่เข้ามา → โหลดรายการใหม่จาก DB
    this.newOrderSub = this.signalrService.newKitchenOrder$.subscribe(() => {
      this.loadActiveOrders();
    });

    //  สถานะเปลี่ยน → โหลดใหม่ ออเดอร์ที่ไม่ใช่ "กำลังจัดเตรียมอาหาร" จะหายเอง
    this.statusSub = this.signalrService.orderStatusUpdated$.subscribe(() => {
      this.loadActiveOrders();
    });
  }

  private loadActiveOrders() {
    this.orderService.GetKitchenActiveOrders().subscribe({
      next: (res) => {
        this.activeOrders = res.activeOrders;
        this.pendingCount = res.activeOrders.length;
        this.completedTodayCount = res.completedTodayCount;
      },
      error: (err) => console.error('โหลดออเดอร์ครัวไม่สำเร็จ', err),
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

  //  ระดับความเร่งด่วน: normal (<5นาที) / warning (5-10นาที) / urgent (>10นาที)
  getUrgencyClass(orderTime: string | Date): string {
    const mins = Math.floor((Date.now() - new Date(orderTime).getTime()) / 60000);
    if (mins >= 10) return 'urgent';
    if (mins >= 5) return 'warning';
    return 'normal';
  }
  //  แสดงเวลาที่ค้าง
  getElapsedText(orderTime: string | Date): string {
    const totalSec = Math.max(0, Math.floor((Date.now() - new Date(orderTime).getTime()) / 1000));
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;

    if (mins >= 60) {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return m === 0 ? `${h} ชม.` : `${h} ชม. ${m} นาที`;
    }
    if (mins >= 10) return `${mins} นาที`;
    return `${mins}.${secs.toString().padStart(2, '0')} นาที`;
  }
  formatTime(orderTime: string | Date): string {
    const d = new Date(orderTime);
    if (isNaN(d.getTime())) return '--:--';
    return d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', hour12: false });
  }

  trackByOrderId(_: number, order: any) {
    return order.orderId;
  }
  ngOnDestroy() {
    if (this.timer) clearInterval(this.timer);
    if (this.newOrderSub) this.newOrderSub.unsubscribe();
    if (this.statusSub) this.statusSub.unsubscribe();
  }
}
