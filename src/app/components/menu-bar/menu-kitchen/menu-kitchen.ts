import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { Ripple } from 'primeng/ripple';

import { AuthService } from '../../../service/api/auth.service';

@Component({
  selector: 'app-kitchen-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, Ripple],
  templateUrl: './menu-kitchen.html',
  styleUrl: './menu-kitchen.scss',
})
export class KitchenNavbar implements OnInit {
  isExpanded = false;

  username = '';
  roleLabel = '';

  menuItems = [
    { label: 'หน้าหลัก/dashboard', icon: 'dashboard', route: '/KitchenDashboard' },
    { label: 'ลงเวลาเข้างาน', icon: 'history', route: '/Employeecheckin' },
    { label: 'เช็คเงินที่ทำงาน', icon: 'account_balance_wallet', route: '/EmployeeIncome' },
  ];

  constructor(
    private router: Router,
    private authService: AuthService,
  ) {}

  ngOnInit() {
    const user = this.authService.getMember();
    this.username = user?.fullname || 'ไม่ระบุชื่อ';
    this.roleLabel = user?.role || 'พนักงาน';
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
