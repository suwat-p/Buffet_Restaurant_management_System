import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { BillService } from '../../../service/api/bill.service';
import { TableService } from '../../../service/api/table.service';
import { CartService } from '../../../service/api/cart.service';

interface NavMenuItem {
  label: string;
  icon: string;
  route: string;
  dynamic?: boolean;
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
  tableId: number = 0;
  billId: number = 0;

  cartCount: number = 0;

  menuItems: NavMenuItem[] = [
    { label: 'รายการเมนูอาหาร', icon: 'restaurant_menu', route: '/Customer' },
    { label: 'สั่งอาหาร/รถเข็นของคุณ', icon: 'shopping_cart', route: '/Cart' },
    { label: 'ติดตามสถานะออเดอร์', icon: 'receipt_long', route: '/StatusCustomer', dynamic: true },
  ];

  constructor(
    private tableService: TableService,
    private billService: BillService,
    private cartService: CartService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.tableNumber = this.tableService.getTable();

    // subscribe ค่าจำนวนตะกร้าแบบ real-time
    this.cartService.cartCount$.subscribe((count) => {
      this.cartCount = count;
    });
  }

  toggleSidebar() {
    this.isExpanded = !this.isExpanded;
  }

  closeSidebar() {
    if (window.innerWidth <= 768) {
      this.isExpanded = false;
    }
  }

  getItemRoute(item: NavMenuItem): any[] {
    if (!item.dynamic) return [item.route];

    if (this.billId) {
      return [item.route, this.billId];
    }

    return [];
  }
}
