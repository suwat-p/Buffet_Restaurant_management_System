import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { RippleModule } from 'primeng/ripple';
import { ToastModule } from 'primeng/toast';
import { CartService } from '../../service/api/cart.service';
import { OrderService } from '../../service/api/order.service';
import { MenuPreorder } from '../../components/menu-bar/menu-manager/menu-preorder/menu-preorder';

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
  selector: 'app-pre-order-cart',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    ButtonModule,
    RippleModule,
    FormsModule,
    RouterModule,
    HttpClientModule,
    ToastModule,
    MenuPreorder,
    DialogModule,
  ],
  providers: [MessageService],
  templateUrl: './pre-order-cart.html',
  styleUrl: './pre-order-cart.scss',
})
export class PreOrderCart implements OnInit {
  cartItems: CartItem[] = [];
  currentCartId: number = 0;
  bookingId: number | null = null;
  displayConfirm: boolean = false;
  itemToDelete: CartItem | null = null;
  pendingChange: number = 0;

  constructor(
    private cartService: CartService,
    private messageService: MessageService,
    private orderService: OrderService,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe((params) => {
      if (params['bookingId']) {
        this.bookingId = Number(params['bookingId']);
        this.loadCart();
      }
    });
  }

  loadCart() {
    this.cartService.getCartItems(0, this.bookingId ?? undefined).subscribe({
      next: (res: any) => {
        if (res && res.cartId) {
          this.currentCartId = res.cartId;
          if (res.items) {
            this.cartItems = res.items.map((item: any) => ({
              id: item.id,
              menuId: item.menuId,
              name: item.name,
              price: item.price,
              quantity: item.quantity,
              image: item.image,
              selected: true,
            }));
          }
        } else {
          this.cartItems = [];
          this.currentCartId = 0;
        }
      },
      error: (err) => {
        console.error('Load cart error:', err);
        this.cartItems = [];
        this.currentCartId = 0;
      },
    });
  }

  // คำนวณจำนวนรายการที่เลือก
  get totalSelectedItems(): number {
    return this.cartItems.filter((item) => item.selected).length;
  }

  // คำนวณราคารวมทั้งหมด
  get totalPrice(): number {
    return this.cartItems
      .filter((item) => item.selected)
      .reduce((sum, item) => sum + item.price * item.quantity, 0);
  }

  // เพิ่มจำนวนสินค้า (+1)
  increaseQty(item: CartItem) {
    this.updateCartQuantity(item, 1);
  }

  // ลดจำนวนสินค้า (-1)
  decreaseQty(item: CartItem) {
    this.updateCartQuantity(item, -1);
  }

  // ตรวจสอบจำนวนก่อนอัปเดต หรือเปิด Dialog ยืนยันการลบ
  updateCartQuantity(item: CartItem, change: number) {
    const newQuantity = item.quantity + change;

    if (newQuantity <= 0) {
      this.itemToDelete = item;
      this.pendingChange = change;
      this.displayConfirm = true; // เปิด Dialog แจ้งเตือนเมื่อลดจำนวนจนเหลือ 0
    } else {
      this.processUpdate(item, change);
    }
  }

  // ยืนยันการลบจาก Dialog
  confirmDelete() {
    if (this.itemToDelete) {
      this.processUpdate(this.itemToDelete, this.pendingChange);
      this.displayConfirm = false;
      this.itemToDelete = null;
    }
  }

  // ยิง API อัปเดตข้อมูลตะกร้า
  private processUpdate(item: CartItem, change: number) {
    const previousQuantity = item.quantity;
    const previousItems = [...this.cartItems];

    item.quantity += change;

    if (item.quantity <= 0) {
      this.cartItems = this.cartItems.filter((x) => x.menuId !== item.menuId);
    }

    const payload = {
      tableId: null,
      menuId: item.menuId,
      quantity: change,
      booking_id: this.bookingId,
    };

    this.cartService.addToCart(payload).subscribe({
      next: () => {},
      error: (err) => {
        // Rollback ค่าเดิมหากเกิด Error
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

  // ยืนยันการสั่งอาหารล่วงหน้า
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

        setTimeout(() => {
          this.router.navigate(['/PreOrder'], {
            queryParams: { bookingId: this.bookingId },
          });
        }, 1500);
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

  goToPreOrderMenu() {
    this.router.navigate(['/PreOrder'], {
      queryParams: { bookingId: this.bookingId },
    });
  }
}
