import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';

@Component({
  selector: 'app-menu-preorder',
  standalone: true,
  imports: [CommonModule, MatIconModule],
  templateUrl: './menu-preorder.html',
  styleUrl: './menu-preorder.scss',
})
export class MenuPreorder implements OnInit {
  isSidebarOpen: boolean = true;
  tableNumber: string = 'A18,A19';
  notificationCount: number = 1;
  cartCount: number = 5;

  categories: string[] = [
    'หมูหมัก',
    'หมูสไลด์',
    'ผักและอื่นๆ',
    'ของทานเล่น',
    'ทะเลซีฟู้ด',
    'เครื่องดื่ม',
  ];

  selectedCategory: string = 'หมูหมัก';

  menuItems = [
    { name: 'หมูหมักพริกไทยดำ', category: 'หมูหมัก', image: 'assets/Images/pork-blackpepper.jpg' },
    { name: 'หมูหมักสามชั้น', category: 'หมูหมัก', image: 'assets/Images/pork-belly.jpg' },
    { name: 'หมูหมักสันนอก', category: 'หมูหมัก', image: 'assets/Images/pork-sirloin.jpg' },
    { name: 'หมูนุ่มหมักงา', category: 'หมูหมัก', image: 'assets/Images/pork-sesame.jpg' },
  ];

  displayItems = [...this.menuItems];

  constructor(private router: Router) {}

  ngOnInit(): void {}

  selectCategory(cat: string) {
    this.selectedCategory = cat;
    this.displayItems = this.menuItems.filter((item) => item.category === cat);
  }

  goToCart() {
    this.router.navigate(['/cart']);
  }
}
