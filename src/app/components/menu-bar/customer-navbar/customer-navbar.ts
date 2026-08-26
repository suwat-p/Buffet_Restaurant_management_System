import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { BillService } from '../../../service/api/bill.service';
import { TableService } from '../../../service/api/table.service';

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
  notificationCount: number = 2;
  cartCount: number = 3;

  menuItems: NavMenuItem[] = [
    { label: 'รายการเมนูอาหาร', icon: 'restaurant_menu', route: '/Customer' },
    { label: 'สั่งอาหาร/รถเข็นของคุณ', icon: 'shopping_cart', route: '/Cart' },
    { label: 'ติดตามสถานะออเดอร์', icon: 'receipt_long', route: '/StatusCustomer', dynamic: true },
  ];

  constructor(
    private tableService: TableService,
    private billService: BillService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.tableNumber = this.tableService.getTable();
    if (this.tableNumber) {
      this.getBillInfo(this.tableNumber);
    }
  }

  getBillInfo(tableNum: string) {
    this.tableService.getTableid(tableNum).subscribe({
      next: (id: number) => {
        this.tableId = id;
        this.billService.getBillByTableId(this.tableId).subscribe({
          next: (res: any) => {
            if (res && res.bill_id) {
              this.billId = res.bill_id;
            }
          },
        });
      },
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

  onMenuItemClick(item: NavMenuItem, event: Event) {
    this.closeSidebar();

    if (item.dynamic) {
      event.preventDefault();
      if (this.billId) {
        this.router.navigate(['/StatusCustomer', this.billId]);
      } else {
        alert('ยังไม่มีข้อมูลบิลสำหรับโต๊ะนี้ กรุณาแจ้งพนักงานเพื่อเปิดบิล');
      }
    }
  }
}
