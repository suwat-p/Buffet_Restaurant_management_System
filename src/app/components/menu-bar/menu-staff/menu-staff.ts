import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { Ripple } from 'primeng/ripple';

import { AuthService } from '../../../service/api/auth.service';

interface StaffMenuItem {
  label: string;
  icon: string;
  route: string;
}

// เมนูที่ทุกแผนกใช้ร่วมกัน (หน้ากลางที่ทุกแผนกเข้าได้)
const COMMON_ITEMS: StaffMenuItem[] = [
  { label: 'ลงเวลาเข้างาน', icon: 'history', route: '/Employeecheckin' },
  { label: 'เช็คเงินที่ทำงาน', icon: 'account_balance_wallet', route: '/EmployeeIncome' },
];

// เมนูเฉพาะแผนก — key ต้องตรงกับ Department
const MENU_BY_ROLE: Record<string, StaffMenuItem[]> = {
  พนักงานเสิร์ฟ: [
    { label: 'สร้างบิล/จัดการลูกค้า', icon: 'groups', route: '/CreateBill' },
    { label: 'เช็คอินโต๊ะที่ลูกค้าจอง', icon: 'fact_check', route: '/ConfirmCheckin' },
    { label: 'นำเสิร์ฟอาหาร', icon: 'room_service', route: '/serve-action' },
    ...COMMON_ITEMS,
  ],
  พนักงานครัว: [
    { label: 'หน้าหลัก/dashboard', icon: 'dashboard', route: '/KitchenDashboard' },
    ...COMMON_ITEMS,
  ],
  // TODO: ปรับให้ตรงกับเมนูแคชเชียร์เดิมของคุณ (ตอนนี้ใส่ตาม route ที่มีใน app.routes.ts)
  พนักงานแคชเชียร์: [
    { label: 'หน้าหลัก/dashboard', icon: 'dashboard', route: '/cashier-dashboard' },
    { label: 'รายการบิล', icon: 'receipt_long', route: '/BillingList' },
    ...COMMON_ITEMS,
  ],
};

@Component({
  selector: 'app-menu-staff',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, Ripple],
  templateUrl: './menu-staff.html',
  styleUrl: './menu-staff.scss',
})
export class MenuStaff implements OnInit {
  isExpanded = false;
  username = '';
  roleLabel = '';
  menuItems: StaffMenuItem[] = COMMON_ITEMS;

  constructor(
    private router: Router,
    private authService: AuthService,
  ) {}

  ngOnInit() {
    const user = this.authService.getMember();
    this.username = user?.fullname || 'ไม่ระบุชื่อ';
    const role = String(user?.role ?? '').trim();
    this.roleLabel = role || 'พนักงาน';
    // แผนกที่ไม่รู้จัก → แสดงเฉพาะเมนูกลาง
    this.menuItems = MENU_BY_ROLE[role] ?? COMMON_ITEMS;
  }

  toggleSidebar() {
    this.isExpanded = !this.isExpanded;
  }

  closeSidebar() {
    if (window.innerWidth <= 768) {
      this.isExpanded = false;
    }
  }

  goProfile() {
    this.router.navigate(['/Profile-Employee']);
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('role');
    this.router.navigate(['/Loginemployee']);
  }
}
