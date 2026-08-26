import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CarouselModule } from 'primeng/carousel';
import { DialogModule } from 'primeng/dialog';
import { RippleModule } from 'primeng/ripple';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { MatIconModule } from '@angular/material/icon';

import { Menu, MenuService } from '../../../service/api/menu.service';
import { CartService } from '../../../service/api/cart.service';
import { OrderService } from '../../../service/api/order.service';

interface CartItem {
  id: number;
  menuId: number;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  selected: boolean;
}

@Component({
  selector: 'app-pre-order',
  standalone: true,
  imports: [
    CommonModule,
    HttpClientModule,
    FormsModule,
    CarouselModule,
    ButtonModule,
    RippleModule,
    ToastModule,
    TooltipModule,
    DialogModule,
    MatIconModule,
  ],
  providers: [MessageService],
  templateUrl: './pre-order.html',
  styleUrl: './pre-order.scss',
})
export class PreOrder implements OnInit {
  isSidebarOpen: boolean = true;
  currentBannerIndex: number = 0;
  slideInterval: number = 5000;
  slideTimer: any;

  banners = [
    { image: 'assets/Images/Banner.png' },
    { image: 'assets/Images/Banner2.png' },
    { image: 'assets/Images/Banner3.png' },
  ];

  bookingId: number | null = null;

  allFoodItems: Menu[] = [];
  displayItems: Menu[] = [];

  categories: string[] = ['ทั้งหมด'];
  currentCategory: string = 'ทั้งหมด';

  cartBadgeCount: number = 0;

  // State ตะกร้าและ Modal
  displayCartDialog: boolean = false;
  cartItems: CartItem[] = [];
  currentCartId: number = 0;

  // State สำหรับ Dialog ยืนยันการลบ
  displayConfirmDelete: boolean = false;
  itemToDelete: CartItem | null = null;
  pendingChange: number = 0;

  constructor(
    private messageService: MessageService,
    private menuService: MenuService,
    private cartService: CartService,
    private orderService: OrderService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit() {
    this.loadMenus();

    this.route.queryParams.subscribe((params) => {
      if (params['bookingId']) {
        this.bookingId = Number(params['bookingId']);
        this.loadCart();
      }
    });
  }

  loadCart() {
    if (!this.bookingId) return;

    this.cartService.getCartItems(0, this.bookingId).subscribe({
      next: (res: any) => {
        if (res && (res.cartId || res.cart_id)) {
          this.currentCartId = res.cartId || res.cart_id;
          const rawItems = res.items || res.cart_items || res.cartItems || [];

          this.cartItems = rawItems.map((item: any) => ({
            id: item.id || item.cart_item_id || item.cartItemId,
            menuId: item.menuId || item.menu_id,
            name: item.name || item.menu_Name || item.menuName,
            price: item.price ?? item.priceAtOrderTime ?? 0,
            quantity: item.quantity || item.qty || 0,
            image: item.image || item.menu_Image,
            selected: true,
          }));

          this.cartBadgeCount = this.cartItems.reduce((sum, item) => sum + item.quantity, 0);
        } else {
          this.cartItems = [];
          this.currentCartId = 0;
          this.cartBadgeCount = 0;
        }
      },
      error: (err) => {
        console.error('Load cart error:', err);
        this.cartItems = [];
        this.currentCartId = 0;
        this.cartBadgeCount = 0;
      },
    });
  }

  toggleCartModal() {
    this.displayCartDialog = !this.displayCartDialog;
    if (this.displayCartDialog) {
      this.loadCart();
    }
  }

  get totalSelectedItems(): number {
    return this.cartItems.filter((item) => item.selected).length;
  }

  get totalPrice(): number {
    return this.cartItems
      .filter((item) => item.selected)
      .reduce((sum, item) => sum + item.price * item.quantity, 0);
  }

  increaseQty(item: CartItem) {
    this.updateCartQuantity(item, 1);
  }

  decreaseQty(item: CartItem) {
    this.updateCartQuantity(item, -1);
  }

  updateCartQuantity(item: CartItem, change: number) {
    const newQuantity = item.quantity + change;

    if (newQuantity <= 0) {
      this.itemToDelete = item;
      this.pendingChange = change;
      this.displayConfirmDelete = true;
    } else {
      this.processUpdate(item, change);
    }
  }

  confirmDelete() {
    if (this.itemToDelete) {
      this.processUpdate(this.itemToDelete, this.pendingChange);
      this.displayConfirmDelete = false;
      this.itemToDelete = null;
    }
  }

  private processUpdate(item: CartItem, change: number) {
    const previousQuantity = item.quantity;
    const previousItems = [...this.cartItems];

    item.quantity += change;

    if (item.quantity <= 0) {
      this.cartItems = this.cartItems.filter((x) => x.menuId !== item.menuId);
    }

    const payload = {
      TableId: null,
      BookingId: this.bookingId,
      MenuId: item.menuId,
      Quantity: change,
    };

    this.cartService.addToCart(payload).subscribe({
      next: () => {
        this.loadCart();
      },
      error: (err) => {
        item.quantity = previousQuantity;
        this.cartItems = previousItems;

        this.messageService.add({
          severity: 'error',
          summary: 'ไม่สามารถอัปเดตได้',
          detail: 'กรุณาลองใหม่อีกครั้ง',
        });
        this.loadCart();
      },
    });
  }

  addToCart(item: Menu) {
    const payload = {
      TableId: null,
      BookingId: this.bookingId,
      MenuId: item.menu_id,
      Quantity: 1,
    };

    this.cartService.addToCart(payload).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'เพิ่มลงตะกร้าสั่งล่วงหน้า',
          detail: item.menu_Name,
          life: 1000,
        });
        this.loadCart();
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

  async placeOrder() {
    if (this.currentCartId === 0 || this.cartItems.length === 0) return;

    const payload = {
      cartId: this.currentCartId,
      bookingId: this.bookingId,
      orderType: 'สั่งล่วงหน้า',
    };

    this.orderService.PlaceOrder(payload).subscribe({
      next: (response: any) => {
        this.messageService.add({
          severity: 'success',
          summary: 'บันทึกการสั่งล่วงหน้าเรียบร้อย',
          detail: response?.message || 'รายการจะถูกจัดเตรียมตามรอบเวลาการจอง',
        });

        this.cartItems = [];
        this.currentCartId = 0;
        this.cartBadgeCount = 0;
        this.displayCartDialog = false;
      },
      error: (error: any) => {
        console.error('Error placing order:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'เกิดข้อผิดพลาด',
          detail: error?.error?.message || 'ไม่สามารถส่งรายการสั่งล่วงหน้าได้',
        });
        this.loadCart();
      },
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

  // **นำทางไปยังหน้าติดตามสถานะการจอง**
  goToBookingStatus() {
    if (this.bookingId) {
      this.router.navigate(['/BookingStatus'], {
        queryParams: { bookingId: this.bookingId },
      });
    } else {
      this.router.navigate(['/BookingStatus']);
    }
  }

  // **นำทางไปยังหน้าติดตามสถานะออเดอร์ (/StatusCustomer)**[cite: 28]
  goToOrderStatus() {
    if (this.bookingId) {
      // เปลี่ยนไปใช้ path PreOrderStatus เพื่อแยก Navbar และ Parameter
      this.router.navigate(['/PreOrderStatus', this.bookingId]);
    } else {
      this.router.navigate(['/BookingStatus']);
    }
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
}
