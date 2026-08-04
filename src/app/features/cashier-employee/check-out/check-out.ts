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
import { PaymentService } from '../../../service/api/payment.service';
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
  private subscriptions: Subscription[] = [];

  fineKg: number = 0;
  selectedDiscount: any = null;
  showDiscountModal: boolean = false;

  paymentMethod: 'cash' | 'qrcode' = 'cash';
  receivedAmount: number | null = null;

  transactionId: string = '';
  private pollingTimer: any = null;
  private isPolling: boolean = false;

  constructor(
    private billService: BillService,
    private orderService: OrderService,
    private discountService: DiscountService,
    private tableService: TableService,
    private ConfigService: ConfigService,
    private signalRService: SignalrService,
    private messageService: MessageService,
    private route: ActivatedRoute,
    private router: Router,
    private paymentService: PaymentService
  ) { }

  // Lifecycle Hooks
  ngOnInit() {
    this.loadDiscounts();

    this.ConfigService.getConfig().subscribe((res) => {
      if (res && res.length > 0) {
        this.resData = res[0];
      }
    });

    if (this.signalRService.resConfig$) {
      const sub = this.signalRService.resConfig$.subscribe((updatedConfig) => {
        this.resData = updatedConfig;
        this.sendToCustomerDisplay();
      });
      this.subscriptions.push(sub);
    }

    this.billId = Number(this.route.snapshot.paramMap.get('billId'));

    if (this.billId) {
      this.loadBillInfo();
      this.loadPricedOrderItems();
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
    this.stopPolling();
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  // SignalR Handlers
  setupSignalRListeners() {
    if (this.signalRService.billUpdated$) {
      const sub = this.signalRService.billUpdated$.subscribe((data: any) => {
        if (!data || data.billId === this.billId) {
          this.loadBillInfo();
        }
      });
      this.subscriptions.push(sub);
    }

    if (this.signalRService.orderUpdated$) {
      const sub = this.signalRService.orderUpdated$.subscribe((data: any) => {
        if (!data || data.billId === this.billId) {
          this.loadPricedOrderItems();
        }
      });
      this.subscriptions.push(sub);
    }
  }

  // Polling Methods
  startAutoCheckStatus() {
    if (this.isPolling) return;
    this.isPolling = true;

    this.pollingTimer = setInterval(() => {
      if (!this.transactionId) return;
      console.log('Polling payment status for transactionId:', this.transactionId);
      this.paymentService.verifyPayment(this.billId, this.transactionId).subscribe({
        next: (result: any) => {
          if (result.status === 'success') {
            console.log('Payment verified successfully:', result);
            this.stopPolling();
            this.messageService.add({
              severity: 'success',
              summary: 'ชำระเงินสำเร็จ',
              detail: 'ตรวจพบการชำระเงินผ่าน QR Code เรียบร้อยแล้ว'
            });

            setTimeout(() => {
              this.router.navigate(['/BillingList']);
            }, 1500);
          }
        },
        error: (err) => {
          console.error('Polling error:', err);
        }
      });
    }, 3000);
  }

  stopPolling() {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
    this.isPolling = false;
  }

  // Data Loading Methods
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
              this.sendToCustomerDisplay();
            },
            error: (err) => {
              console.error(`โหลดโต๊ะของบิล ${this.billId} ไม่สำเร็จ:`, err);
              this.currentBill.tableNumbers = 'ข้อผิดพลาด';
              this.sendToCustomerDisplay();
            }
          });
        }
      },
      error: (err) => {
        console.error('โหลดข้อมูลบิลไม่สำเร็จ:', err);
      }
    });
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
        this.sendToCustomerDisplay();
      },
      error: (err) => {
        this.isLoadingItems = false;
        console.error('โหลดรายการอาหารชำระเงินเพิ่มไม่สำเร็จ:', err);
        this.orderItems = [];
        this.extraItemsTotalPrice = 0;
      }
    });
  }

  // Discount & Form Handlers
  matchInitialDiscount() {
    if (this.discounts.length > 0 && this.currentBill?.discount_id && !this.selectedDiscount) {
      const found = this.discounts.find((d: any) => d.discount_id === this.currentBill.discount_id);
      if (found) {
        this.selectedDiscount = found;
        this.sendToCustomerDisplay();
      }
    }
  }

  openDiscountModal() {
    this.showDiscountModal = true;
  }

  selectDiscount(discount: any) {
    this.selectedDiscount = discount;
    this.showDiscountModal = false;
    this.sendToCustomerDisplay();
  }

  removeDiscount() {
    this.selectedDiscount = null;
    this.showDiscountModal = false;
    this.sendToCustomerDisplay();
  }

  updateQuantity(item: any, change: number) {
    if (item.quantity + change >= 0) {
      item.quantity += change;
      this.sendToCustomerDisplay();
    }
  }

  // Getters for Calculations
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

  // Payment Process Methods
  processPayment(method: 'cash' | 'qrcode') {
    this.paymentMethod = method;
    this.stopPolling();

    if (!this.grandTotal || this.grandTotal <= 0) {
      console.error('ยอดเงินไม่ถูกต้อง ไม่สามารถสร้าง QR Code ได้');
      return;
    }

    if (method === 'qrcode') {
      this.receivedAmount = this.grandTotal;

      this.paymentService.CreateCheckoutQr(this.billId, this.grandTotal).subscribe({
        next: (res: any) => {
          console.log('Sending QR Request:', { billId: this.billId, amount: this.grandTotal });
          console.log('QR Code generated successfully:', res);
          this.transactionId = res.transactionId || res.transaction_id || '';
          this.sendToCustomerDisplay(res.qr_data);

          if (this.transactionId) {
            this.startAutoCheckStatus();
          }
        },
        error: (err) => {
          console.error('สร้าง QR Code ไม่สำเร็จ:', err);
          this.sendToCustomerDisplay(null);
        }
      });
    } else {
      this.sendToCustomerDisplay(null);
      this.saveBill();
    }
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
        this.stopPolling();
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

  // Customer Display Synchronization
  sendToCustomerDisplay(qrCodeData: string | null = null) {
    const displayItems = [];

    if (this.numAdults > 0) {
      displayItems.push({
        name: 'บุฟเฟต์ผู้ใหญ่',
        quantity: this.numAdults,
        subTotal: this.numAdults * this.adultPrice
      });
    }

    if (this.numChildren > 0) {
      displayItems.push({
        name: 'บุฟเฟต์เด็ก',
        quantity: this.numChildren,
        subTotal: this.numChildren * this.childPrice
      });
    }

    this.orderItems.forEach(item => {
      displayItems.push({
        name: item.name,
        quantity: item.quantity,
        subTotal: item.price * item.quantity
      });
    });

    const payload = {
      tableNumbers: this.currentBill?.tableNumbers || '-',
      items: displayItems,
      fineAmount: this.fineAmount,
      discountName: this.discountAmount > 0 ? this.discountName : 'ไม่มีโปรโมชั่น',
      grandTotal: this.grandTotal,
      qrData: qrCodeData,
      isPaidSuccess: false
    };

    if (this.signalRService.sendToCustomerDisplay) {
      this.signalRService.sendToCustomerDisplay(payload).catch(err => {
        console.warn('ยังไม่สามารถส่งข้อมูลไปยังหน้าจอลูกค้าได้:', err);
      });
    }
  }

  printReceipt() {
    console.log('สั่งปริ้นใบเสร็จ...');
  }
}