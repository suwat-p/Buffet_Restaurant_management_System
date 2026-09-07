import { CommonModule } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterModule } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { RippleModule } from 'primeng/ripple';
import { ToastModule } from 'primeng/toast';
import { CustomerNavbar } from '../components/menu-bar/customer-navbar/customer-navbar';
import { BillService } from '../service/api/bill.service';
import { CartService } from '../service/api/cart.service';
import { OrderService } from '../service/api/order.service';
import { TableService } from '../service/api/table.service';

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
  selector: 'app-cart',
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
    CustomerNavbar,
    DialogModule,
  ],
  providers: [MessageService],
  templateUrl: './cart.html',
  styleUrl: './cart.scss',
})
export class Cart implements OnInit {
  cartItems: CartItem[] = [];
  currentCartId: number = 0;
  tableNumber: string | null = null;
  tableid: number = 0;
  billId: number = 0;
  displayConfirm: boolean = false;
  itemToDelete: CartItem | null = null;
  pendingChange: number = 0;

  constructor(
    private cartService: CartService,
    private messageService: MessageService,
    private tableService: TableService,
    private orderService: OrderService,
    private billService: BillService,
    private router: Router,
  ) {}

  ngOnInit() {
    this.tableNumber = this.tableService.getTable();
    if (this.tableNumber) {
      this.gettableid(this.tableNumber);
    } else {
      console.warn('ไม่พบข้อมูลโต๊ะ');
      this.messageService.add({
        severity: 'warn',
        summary: 'เตือน',
        detail: 'ไม่พบหมายเลขโต๊ะ',
      });
    }
  }

  gettableid(tableNumber: string) {
    this.tableService.getTableid(tableNumber).subscribe({
      next: (id: number) => {
        this.tableid = id;
        this.loadCart();
        this.getbillbytableid(this.tableid);
      },
      error: (err) => console.error('หา ID โต๊ะไม่เจอ:', err),
    });
  }

  loadCart() {
    if (this.tableid === 0) return;
    this.cartService.getCartItems(this.tableid).subscribe({
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
        this.cartService.setCartCount(this.cartItems.reduce((sum, i) => sum + i.quantity, 0));
      },
      error: (err) => {
        console.error('Load cart error:', err);
        this.cartItems = [];
        this.currentCartId = 0;
        this.cartService.setCartCount(0);
      },
    });
  }

  getbillbytableid(tableId: number) {
    if (tableId === 0) return;
    this.billService.getBillByTableId(tableId).subscribe({
      next: (response: any) => {
        if (response && response.bill_id) {
          this.billId = response.bill_id;
        } else {
          this.showBillErrorToast();
        }
      },
      error: (err) => {
        console.error('Error getting bill:', err);
        this.showBillErrorToast();
      },
    });
  }

  private showBillErrorToast() {
    this.messageService.add({
      severity: 'error',
      summary: 'เกิดข้อผิดพลาด',
      detail: 'กรุณาแจ้งพนักงานเพื่อเปิดบิลสำหรับโต๊ะนี้',
    });
  }

  get isAllSelected(): boolean {
    return this.cartItems.length > 0 && this.cartItems.every((item) => item.selected);
  }

  set isAllSelected(value: boolean) {
    this.cartItems.forEach((item) => (item.selected = value));
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
      this.displayConfirm = true;
    } else {
      this.processUpdate(item, change);
    }
  }

  confirmDelete() {
    if (this.itemToDelete) {
      this.processUpdate(this.itemToDelete, this.pendingChange);
      this.displayConfirm = false;
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
      tableId: this.tableid,
      menuId: item.menuId,
      quantity: change,
      booking_id: null,
    };

    this.cartService.addToCart(payload).subscribe({
      next: () => {
        this.cartService.setCartCount(this.cartItems.reduce((sum, i) => sum + i.quantity, 0));
      },
      error: () => {
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

  removeItem(id: number) {
    this.cartService.deleteItem(id).subscribe({
      next: () => {
        this.cartItems = this.cartItems.filter((item) => item.id !== id);
        this.cartService.setCartCount(this.cartItems.reduce((sum, i) => sum + i.quantity, 0)); // ← เพิ่มบรรทัดนี้
        this.messageService.add({ severity: 'success', summary: 'ลบสำเร็จ' });
        if (this.cartItems.length === 0) this.currentCartId = 0;
      },
      error: () => {
        this.messageService.add({ severity: 'error', summary: 'ลบไม่สำเร็จ' });
      },
    });
  }

  async placeOrder() {
    if (this.currentCartId === 0 || this.cartItems.length === 0) return;

    if (!this.billId) {
      this.messageService.add({
        severity: 'error',
        summary: 'ไม่พบบิล',
        detail: 'ไม่พบข้อมูลบิล กรุณาแจ้งพนักงานเปิดบิลก่อนสั่งอาหาร',
      });
      return;
    }

    const payload = {
      cartId: this.currentCartId,
      billId: this.billId,
      orderType: 'สั่งหน้าร้าน',
    };

    this.orderService.PlaceOrder(payload).subscribe({
      next: (response: any) => {
        this.messageService.add({
          severity: 'success',
          summary: 'สั่งอาหารเรียบร้อย',
          detail: response?.message || 'รายการถูกส่งเข้าครัวแล้ว',
        });

        if (response?.order_id) {
          localStorage.setItem('currentOrderId', String(response.order_id));
        }

        this.cartItems = [];
        this.currentCartId = 0;
        this.cartService.setCartCount(0); // ← เพิ่มบรรทัดนี้

        setTimeout(() => {
          this.router.navigate(['/StatusCustomer', this.billId]);
        }, 1000);
      },
      error: (error: any) => {
        console.error('Error placing order:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'เกิดข้อผิดพลาด',
          detail: error?.error?.message || 'ไม่สามารถส่งออเดอร์ได้ กรุณาลองใหม่อีกครั้ง',
        });
        this.loadCart();
      },
    });
  }
}
