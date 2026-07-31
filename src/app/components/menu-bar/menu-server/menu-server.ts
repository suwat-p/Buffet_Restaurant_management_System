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
  selector: 'app-menu-server',
  imports: [
    CommonModule,
    DrawerModule,
    ButtonModule,
    Ripple,
    AvatarModule,
    MatIconModule,
    RouterModule,
  ],
  templateUrl: './menu-server.html',
  styleUrl: './menu-server.scss',
})
export class MenuServer {
  constructor(
    private router: Router,
    private authService: AuthService,
  ) {}
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
    { label: 'สร้างบิล/จัดการลูกค้า', icon: 'groups', route: '/CreateBill', active: true },
    {
      label: 'เช็คอินโต๊ะที่ลูกค้าจอง',
      icon: 'fact_check',
      route: '/ConfirmCheckin',
      active: false,
    },
    { label: 'นำเสิร์ฟอาหาร', icon: 'room_service', route: '/ManageTable', active: false }, // หรือ grid_view
    { label: 'ลงเวลาเข้างาน', icon: 'history', route: '/Employeecheckin', active: false },
    {
      label: 'เช็คเงินที่ทำงาน',
      icon: 'account_balance_wallet',
      route: '/ManageShop',
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
