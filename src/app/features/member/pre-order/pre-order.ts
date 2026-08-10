import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { BadgeModule } from 'primeng/badge';
import { ButtonModule } from 'primeng/button';
import { CarouselModule } from 'primeng/carousel';
import { DialogModule } from 'primeng/dialog';
import { RippleModule } from 'primeng/ripple';
import { ToastModule } from 'primeng/toast';
import { Menu, MenuService } from '../../../service/api/menu.service';
import { CartService } from '../../../service/api/cart.service';
import { CustomerNavbar } from '../../../components/menu-bar/customer-navbar/customer-navbar';

interface CartItem extends Menu {
  quantity: number;
}

@Component({
  selector: 'app-pre-order',
  standalone: true,
  imports: [
    CommonModule,
    HttpClientModule,
    CustomerNavbar, // เปลี่ยนตรงนี้
    CarouselModule,
    ButtonModule,
    RippleModule,
    DialogModule,
    BadgeModule,
    ToastModule,
  ],
  providers: [MessageService],
  templateUrl: './pre-order.html',
  styleUrl: './pre-order.scss',
})
export class PreOrder implements OnInit {
  currentBannerIndex: number = 0;
  slideInterval: number = 5000;
  slideTimer: any;

  banners = [
    { image: 'assets/Images/Banner.png' },
    { image: 'assets/Images/Banner2.png' },
    { image: 'assets/Images/Banner3.png' },
  ];

  isCartVisible: boolean = false;
  bookingId: number | null = null;

  allFoodItems: Menu[] = [];
  displayItems: Menu[] = [];

  categories: string[] = ['ทั้งหมด'];
  currentCategory: string = 'ทั้งหมด';

  cart: CartItem[] = [];

  constructor(
    private messageService: MessageService,
    private menuService: MenuService,
    private cartService: CartService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit() {
    this.loadMenus();

    this.route.queryParams.subscribe((params) => {
      if (params['bookingId']) {
        this.bookingId = Number(params['bookingId']);
      }
    });
  }

  loadMenus() {
    this.menuService.getMenus().subscribe({
      next: (data) => {
        this.allFoodItems = data;
        const uniqueCats = [...new Set(data.map((item) => item.category))];
        this.categories = ['ทั้งหมด', ...uniqueCats];
        this.filterCategory('ทั้งหมด');
      },
      error: (err) => {
        console.error('Error fetching menus:', err);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'โหลดเมนูไม่สำเร็จ',
        });
      },
    });
  }

  onClicksmailPictures(index: number) {
    if (this.slideTimer) {
      clearInterval(this.slideTimer);
    }
    this.currentBannerIndex = index;
    this.slideInterval = 0;
  }

  onBannerChange(event: any) {
    this.currentBannerIndex = event.page;
  }

  filterCategory(category: string) {
    this.currentCategory = category;
    if (category === 'ทั้งหมด') {
      this.displayItems = this.allFoodItems;
    } else {
      this.displayItems = this.allFoodItems.filter((item) => item.category === category);
    }
  }

  addToCart(item: Menu) {
    const payload = {
      TableId: null,
      Booking_id: this.bookingId,
      MenuId: item.menu_id,
      Quantity: 1,
    };

    const existingIndex = this.cart.findIndex((c) => c.menu_id === item.menu_id);
    if (existingIndex > -1) {
      this.cart[existingIndex].quantity += 1;
    } else {
      this.cart.push({ ...item, quantity: 1 });
    }

    this.cartService.addToCart(payload).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'เพิ่มลงตะกร้าสั่งล่วงหน้า',
          detail: item.menu_Name,
          life: 1000,
        });
      },
      error: (err) => {
        console.error(err);
        this.messageService.add({
          severity: 'error',
          summary: 'ผิดพลาด',
          detail: 'ไม่สามารถเพิ่มรายการล่วงหน้าได้',
        });
      },
    });
  }

  updateQuantity(item: CartItem, change: number) {
    const index = this.cart.indexOf(item);
    if (index === -1) return;
    item.quantity += change;
    if (item.quantity <= 0) {
      this.cart.splice(index, 1);
    }
  }

  removeItem(item: CartItem) {
    const index = this.cart.indexOf(item);
    if (index > -1) this.cart.splice(index, 1);
  }

  get cartTotalItems() {
    return this.cart.reduce((sum, item) => sum + item.quantity, 0);
  }

  get cartTotalPrice() {
    return this.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }

  confirmOrder() {
    if (this.cart.length === 0) return;

    this.isCartVisible = false;
    this.messageService.add({
      severity: 'success',
      summary: 'บันทึกการสั่งล่วงหน้าเรียบร้อย',
      detail: 'รายการจะถูกจัดเตรียมตามรอบเวลาการจอง',
    });
    this.cart = [];
  }
}
