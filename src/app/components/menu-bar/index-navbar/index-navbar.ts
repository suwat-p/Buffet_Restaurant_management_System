import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';
import { AvatarModule } from 'primeng/avatar';
import { ButtonModule } from 'primeng/button';
import { Ripple } from 'primeng/ripple';

@Component({
  selector: 'app-index-navbar',
  imports: [CommonModule, ButtonModule, Ripple, AvatarModule, MatIconModule, RouterModule],
  templateUrl: './index-navbar.html',
  styleUrl: './index-navbar.scss',
})
export class IndexNavbar {
  isExpanded: boolean = true; 

  // เมนูสำหรับ Sidebar
  menuItems = [
    { label: 'หน้าหลัก', icon: 'home', route: '/', active: true },
    { label: 'เข้าสู่ระบบ', icon: 'login', route: '/Loginmember', active: false },
    { label: 'เข้าสู่ระบบ(สำหรับพนักงาน)', icon: 'login', route: '/Loginemployee', active: false },
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
}
