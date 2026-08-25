import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { TableService } from '../../../service/api/table.service';

interface NavMenuItem {
  label: string;
  icon: string;
  route: string;
  dynamic?: boolean; // true = ต้องต่อ orderId ท้าย route ตอน runtime
}

@Component({
  selector: 'app-customer-navbar',
  standalone: true,
  imports: [CommonModule, ButtonModule, RippleModule, MatIconModule, RouterModule],
  templateUrl: './customer-navbar.html',
  styleUrl: './customer-navbar.scss',
})
export class CustomerNavbar implements OnInit {
  isExpanded: boolean = false;

  tableNumber: string | null = null;
  notificationCount: number = 2;
  cartCount: number = 3;

  menuItems: NavMenuItem[] = [
    { label: 'รายการเมนูอาหาร', icon: 'restaurant_menu', route: '/Customer' },
    { label: 'สั่งอาหาร/รถเข็นของคุณ', icon: 'shopping_cart', route: '/Cart' },
    { label: 'ติดตามสถานะออเดอร์', icon: 'receipt_long', route: '/StatusCustomer', dynamic: true },
  ];

  constructor(private tableService: TableService) {}

  ngOnInit(): void {
    this.tableNumber = this.tableService.getTable();
  }

  toggleSidebar() {
    this.isExpanded = !this.isExpanded;
  }

  closeSidebar() {
    if (window.innerWidth <= 768) {
      this.isExpanded = false;
    }
  }

  // ⚠️ ตอนนี้อ่าน orderId จาก localStorage key 'currentOrderId'
  // ต้องไปเพิ่มโค้ดที่หน้า checkout/place-order ให้เซฟค่านี้ไว้ตอนสั่งอาหารสำเร็จ:
  //   localStorage.setItem('currentOrderId', response.orderId);
  // ถ้ายังไม่มีการเซฟ ลิงก์นี้จะยังกดไม่ได้ (แจ้งเตือนแทน) จนกว่าจะเพิ่มจุดนั้น
  getItemRoute(item: NavMenuItem): any[] {
    if (!item.dynamic) return [item.route];

    const orderId = localStorage.getItem('currentOrderId');
    if (!orderId) return []; // ป้องกัน routerLink พังถ้ายังไม่มี orderId

    return [item.route, orderId];
  }

  onMenuItemClick(item: NavMenuItem, event: Event) {
    this.closeSidebar();

    if (item.dynamic && !localStorage.getItem('currentOrderId')) {
      event.preventDefault();
      alert('ยังไม่มีออเดอร์ที่กำลังดำเนินการ กรุณาสั่งอาหารก่อน');
    }
  }
}
