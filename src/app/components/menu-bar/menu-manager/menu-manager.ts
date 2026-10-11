import { CommonModule } from '@angular/common';
import { Component, ViewChild } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterModule } from '@angular/router';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { Drawer, DrawerModule } from 'primeng/drawer';
import { Ripple } from 'primeng/ripple';
@Component({
  selector: 'app-menu-manager',
  imports: [
    CommonModule,
    DrawerModule,
    ButtonModule,
    Ripple,
    AvatarModule,
    MatIconModule,
    RouterModule,
  ],
  templateUrl: './menu-manager.html',
  styleUrl: './menu-manager.scss',
})
export class MenuManager {
  constructor(private router: Router) {}
  isExpanded: boolean = false; // สถานะเปิด/ปิด เมนู (สำหรับ Mobile)

  menuItems = [
    { label: 'หน้าหลัก/dashboard', icon: 'dashboard', route: '/Dashboard', active: true },
    { label: 'จัดการข้อมูลพนักงาน', icon: 'groups', route: '/ManageEmployee', active: false },
    { label: 'จัดการข้อมูลโต๊ะ', icon: 'table_restaurant', route: '/ManageTable', active: false }, // หรือ grid_view
    { label: 'รายการบิล', icon: 'receipt_long', route: '/HistoryBill', active: false },
    { label: 'การตั้งค่าร้าน', icon: 'settings', route: '/ManageShop', active: false },
    {
      label: 'การตั้งค่าราคาอาหาร',
      route: '/ManageMenu',
      active: false,
      icon: 'restaurant_menu',
    },
  ];

  toggleSidebar() {
    this.isExpanded = !this.isExpanded;
  }

  closeSidebar() {
    // ปิดเมนูเมื่อคลิก (สำหรับ Mobile UX)
    if (window.innerWidth <= 768) {
      this.isExpanded = false;
    }
  }
  @ViewChild('drawerRef') drawerRef!: Drawer;

  closeCallback(e: Event): void {
    this.drawerRef.close(e);
  }
  visible: boolean = false;
  logout() {
    console.log('Logging out...');
    localStorage.removeItem('token');
    sessionStorage.removeItem('token');
    this.router.navigate(['/Loginemployee']);
  }
}
