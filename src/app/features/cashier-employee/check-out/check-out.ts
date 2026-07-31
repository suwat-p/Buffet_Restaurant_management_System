import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { Subscription } from 'rxjs';
import { MenuCashier } from "../../../components/menu-bar/menu-cashier/menu-cashier";
import { BillService } from '../../../service/api/bill.service';
import { ConfigService } from '../../../service/api/config.service';
import { DiscountService } from '../../../service/api/discount.service';
import { OrderService } from '../../../service/api/order.service';
import { SignalrService } from '../../../service/api/signalr.service';
import { TableService } from '../../../service/api/table.service';

@Component({
  selector: 'app-check-out',
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    ToastModule, 
    DialogModule,
    MenuCashier
  ],
  providers: [MessageService], 
  templateUrl: './check-out.html',
  styleUrl: './check-out.scss',
})
export class CheckOut implements OnInit, OnDestroy {
  currentBill: any = null;
  orderItems: any[] = [];
  discounts: any[] = [];
  extraItemsTotalPrice: number = 0; 
  isLoadingItems: boolean = false;
  billId: number = 0;

  resData: any = null;
  
  // 🟢 รวม Subscriptions ไว้สำหรับ Unsubscribe เมื่อลบ Component
  private subscriptions: Subscription[] = [];

  fineKg: number = 0;
  selectedDiscount: any = null;
  showDiscountModal: boolean = false;
  
  paymentMethod: 'cash' | 'qrcode' = 'cash';
  receivedAmount: number | null = null;

  constructor(
    private billService: BillService,
    private orderService: OrderService, 
    private discountService: DiscountService,
    private tableService: TableService,
    private ConfigService: ConfigService,
    private signalRService: SignalrService,
    private messageService: MessageService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadDiscounts();

    // 1. ดึง Config ตั้งต้น
    this.ConfigService.getConfig().subscribe((res) => {
      if (res && res.length > 0) {
        this.resData = res[0];
      }
    });

    // 2. Real-time Config (ราคาหัว/ค่าปรับ)
    if (this.signalRService.resConfig$) {
      const sub = this.signalRService.resConfig$.subscribe((updatedConfig) => {
        this.resData = updatedConfig;
      });
      this.subscriptions.push(sub);
    }

    this.billId = Number(this.route.snapshot.paramMap.get('billId'));
    
    if (this.billId) {
      this.loadBillInfo();
      this.loadPricedOrderItems();

      // 🟢 3. Real-time Listeners ผ่าน SignalR สำหรับหน้า Check-out
      this.setupSignalRListeners();
    } else {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'ไม่พบข้อมูล Bill ID จาก URL'
      });
    }
  }

  ngOnDestroy() {
    // 🟢 Unsubscribe ทั้งหมดป้องกัน Memory Leak
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  // 🟢 ตั้งค่า SignalR Listeners สำหรับรับอัปเดตแบบ Real-time
  setupSignalRListeners() {
    // กรณีที่ 1: มีการอัปเดตบิล (เช่น เปลี่ยนค่าปรับ/ส่วนลด/จำนวนคน จากแคชเชียร์เครื่องอื่น)
    if (this.signalRService.billUpdated$) {
      const sub = this.signalRService.billUpdated$.subscribe((data: any) => {
        if (!data || data.billId === this.billId) {
          this.loadBillInfo();
        }
      });
      this.subscriptions.push(sub);
    }

    // กรณีที่ 2: มีการสั่งอาหารเพิ่ม/อัปเดตรายการอาหาร Real-time
    if (this.signalRService.orderUpdated$) {
      const sub = this.signalRService.orderUpdated$.subscribe((data: any) => {
        if (!data || data.billId === this.billId) {
          this.loadPricedOrderItems();
        }
      });
      this.subscriptions.push(sub);
    }
  }

  loadDiscounts() {
    this.discountService.getDiscount().subscribe({
      next: (response: any[]) => {
        this.discounts = response;
        this.matchInitialDiscount();
      },
      error: (err) => {
        console.error('โหลดข้อมูลส่วนลดไม่สำเร็จ:', err);
      }
    });
  }

  loadBillInfo() {
    this.billService.getBillById(this.billId).subscribe({
      next: (res: any) => {
        this.currentBill = res;
        this.currentBill.tableNumbers = 'กำลังโหลด...';

        this.matchInitialDiscount();

        if (this.billId) {
          this.tableService.getTableByBillId(this.billId).subscribe({
            next: (tables: any[]) => {
              if (tables && tables.length > 0) {
                const tableNames = tables
                  .map(t => t.table_Number || t.table_number || t.tableNo)
                  .filter(Boolean);
                this.currentBill.tableNumbers = tableNames.join(', ');
              } else {
                this.currentBill.tableNumbers = 'ไม่พบโต๊ะ';
              }
            },
            error: (err) => {
              console.error(`โหลดโต๊ะของบิล ${this.billId} ไม่สำเร็จ:`, err);
              this.currentBill.tableNumbers = 'ข้อผิดพลาด';
            }
          });
        }
      },
      error: (err) => {
        console.error('โหลดข้อมูลบิลไม่สำเร็จ:', err);
      }
    });
  }

  matchInitialDiscount() {
    if (this.discounts.length > 0 && this.currentBill?.discount_id && !this.selectedDiscount) {
      const found = this.discounts.find((d: any) => d.discount_id === this.currentBill.discount_id);
      if (found) {
        this.selectedDiscount = found;
      }
    }
  }

  // เปิด/ปิด การเลือกส่วนลด
  openDiscountModal() {
    this.showDiscountModal = true;
  }

  selectDiscount(discount: any) {
    this.selectedDiscount = discount;
    this.showDiscountModal = false;
  }

  removeDiscount() {
    this.selectedDiscount = null;
    this.showDiscountModal = false;
  }

  get billDateDisplay(): Date | null {
    const rawDate = this.currentBill?.created_at || this.currentBill?.createdAt;
    if (!rawDate) return null;

    if (rawDate instanceof Date || typeof rawDate === 'number') {
      return new Date(rawDate);
    }

    if (typeof rawDate === 'string') {
      const isoFormatted = rawDate.replace(' ', 'T');
      const parsed = new Date(isoFormatted);
      return isNaN(parsed.getTime()) ? null : parsed;
    }

    return null;
  }

  // 🟢 แสดงชื่อส่วนลด หรือ "ไม่มีโปรโมชั่น"
  get discountName(): string {
    if (!this.selectedDiscount) return 'ไม่มีส่วนลด';
    
    const valText = this.selectedDiscount.discount_Type === 'percent' 
      ? `${this.selectedDiscount.discount_amount}%` 
      : `${this.selectedDiscount.discount_amount} ฿`;

    return `${this.selectedDiscount.discount_Name} (${valText})`;
  }

  get adultPrice(): number {
    return this.resData?.price_Adult ?? 0;
  }

  get childPrice(): number {
    return this.resData?.price_Child ?? 0;
  }

  get numAdults(): number {
    return this.currentBill?.numAdults ?? this.currentBill?.num_adults ?? 0;
  }

  get numChildren(): number {
    return this.currentBill?.numChildren ?? this.currentBill?.num_children ?? 0;
  }

  get finePerKg(): number {
    return this.resData?.fine ?? 0;
  }

  get fineAmount(): number {
    const kg = this.currentBill?.fine_kg || this.fineKg || 0;
    return kg * this.finePerKg;
  }

  loadPricedOrderItems() {
    this.isLoadingItems = true;
    
    this.orderService.GetOrderPrice(this.billId).subscribe({
      next: (res: any) => {
        this.isLoadingItems = false;
        this.orderItems = (res.items || []).map((item: any) => ({
          ...item,
          name: item.menuName || item.name || 'รายการอาหาร',
          quantity: item.quantity || 1,
          price: item.priceAtOrderTime || item.price || 0,
          subTotal: item.subTotal || (item.quantity * item.priceAtOrderTime)
        }));

        this.extraItemsTotalPrice = res.totalPrice || 0;
      },
      error: (err) => {
        this.isLoadingItems = false;
        console.error('โหลดรายการอาหารชำระเงินเพิ่มไม่สำเร็จ:', err);
        this.orderItems = [];
        this.extraItemsTotalPrice = 0;
      }
    });
  }

  get buffetTotal(): number {
    const totalAdult = this.numAdults * this.adultPrice;
    const totalChild = this.numChildren * this.childPrice;
    return totalAdult + totalChild;
  }

  get itemsSubtotal(): number {
    return this.orderItems.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);
  }

  get subtotalBeforeDiscount(): number {
    return this.buffetTotal + this.itemsSubtotal + this.fineAmount;
  }

  // คำนวณมูลค่าส่วนลดบาท (fixed หรือ percent)
  get discountAmount(): number {
    if (!this.selectedDiscount) return 0;

    const discountType = this.selectedDiscount.discount_Type;
    const discountValue = Number(this.selectedDiscount.discount_amount || 0);

    if (discountType === 'percent') {
      return (this.subtotalBeforeDiscount * discountValue) / 100;
    }

    if (discountType === 'fixed') {
      return discountValue;
    }

    return 0;
  }

  get grandTotal(): number {
    const total = this.subtotalBeforeDiscount - this.discountAmount;
    return total > 0 ? total : 0;
  }

  get changeAmount(): number {
    if (this.paymentMethod === 'qrcode') return 0;
    if (!this.receivedAmount || this.receivedAmount < this.grandTotal) return 0;
    return this.receivedAmount - this.grandTotal;
  }

  updateQuantity(item: any, change: number) {
    if (item.quantity + change >= 0) {
      item.quantity += change;
    }
  }

  processPayment(method: 'cash' | 'qrcode') {
    this.paymentMethod = method;

    if (method === 'qrcode') {
      this.receivedAmount = this.grandTotal;
    }

    this.saveBill();
  }

  saveBill() {
    const targetBillId = this.currentBill?.bill_id || this.billId;

    if (!targetBillId) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'ไม่พบรหัสบิล ไม่สามารถปิดบิลได้'
      });
      return;
    }

    if (this.paymentMethod === 'cash' && (!this.receivedAmount || this.receivedAmount < this.grandTotal)) {
      this.messageService.add({
        severity: 'error',
        summary: 'Payment Error',
        detail: 'จำนวนเงินที่รับมาไม่เพียงพอกับยอดรวมสุทธิ'
      });
      return;
    }

    const payload = {
      Fine_kg: this.currentBill?.fine_kg || this.fineKg,
      Discount_id: this.selectedDiscount?.discount_id || null,
      Discount_amount: this.discountAmount,
      Total_amount: this.grandTotal,
      PaymentMethod: this.paymentMethod === 'cash' ? 'เงินสด' : 'โอนเงิน'
    };

    this.billService.closeBill(targetBillId, payload).subscribe({
      next: (response) => {
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: response.message || 'เช็คบิลและปิดโต๊ะเรียบร้อยแล้ว'
        });
        this.router.navigate(['/BillingList']);
      },
      error: (err) => {
        const errorMessage = err.error?.message || 'เกิดข้อผิดพลาดในการปิดบิล';
        this.messageService.add({
          severity: 'error',
          summary: 'Close Bill Failed',
          detail: errorMessage
        });
      }
    });
  }

  printReceipt() {
    console.log('สั่งปริ้นใบเสร็จ...');
  }
}