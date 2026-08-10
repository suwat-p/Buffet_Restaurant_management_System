import { CommonModule } from '@angular/common';
import { Component, ViewChild } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterModule } from '@angular/router';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { Drawer, DrawerModule } from 'primeng/drawer';
import { Ripple } from 'primeng/ripple';
import { AuthService } from '../../../service/api/auth.service';
@Component({
  selector: 'app-menu-cashier',
  imports: [
    CommonModule,
    DrawerModule,
    ButtonModule,
    Ripple,
    AvatarModule,
    MatIconModule,
    RouterModule,
  ],
  templateUrl: './menu-cashier.html',
  styleUrl: './menu-cashier.scss',
})
export class MenuCashier {
  constructor(
    private router: Router,
    private authService: AuthService,
  ) { }
  isExpanded: boolean = false;
  userName: string = '';
  ngOnInit() {
    const member = this.authService.getMember();
    console.log('Member info:', member);
    if (member) {
      this.userName = member.fullname;
    }
  }
  menuItems = [
    { label: 'รายการบิลชำระเงิน', icon: 'groups', route: '/BillingList', active: true },
    {
      label: 'ใบเสร็จ',
      icon: 'receipt_long',
      route: '/Receipt',
      active: false,
    },
    { label: 'แดชบอร์ด', icon: 'dashboard', route: '/cashier-dashboard', active: false },
    { label: 'ลงเวลาเข้างาน', icon: 'history', route: '/CheckIn', active: false },
    {
      label: 'เช็คเงินที่ทำงาน',
      icon: 'account_balance_wallet',
      route: '/EmployeeIncome',
      active: false,
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
