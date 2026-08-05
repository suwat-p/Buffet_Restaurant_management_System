import { CommonModule } from '@angular/common';
import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIcon } from "@angular/material/icon";
import { MessageService } from "primeng/api";
import { DialogModule } from "primeng/dialog";
import { ToastModule } from "primeng/toast";
import { MenuCashier } from "../../../components/menu-bar/menu-cashier/menu-cashier";
import { BillService } from "../../../service/api/bill.service";
import { ConfigService } from "../../../service/api/config.service";
import { PaymentService } from "../../../service/api/payment.service";
import { PrintService } from "../../../service/api/print.service";
import { SignalrService } from "../../../service/api/signalr.service";
import { TableService } from "../../../service/api/table.service";
@Component({
  selector: 'app-receipt',
  standalone: true,
  imports: [MenuCashier, ToastModule, DialogModule, MatIcon, CommonModule, FormsModule],
  templateUrl: './receipt.html',
  styleUrl: './receipt.scss',
})
export class Receipt implements OnInit, OnDestroy {

  /* Data Properties */
  bills: any[] = [];
  filteredBills: any[] = [];
  selectedBill: any = null;
  billOrderItems: any[] = [];
  resinfo: any = [];

  /* Filter Properties */
  limitSize: number = 50;
  searchTerm: string = '';
  searchDate: string = '';
  searchPaymentMethod: string = 'ทั้งหมด';

  /* Modal & Control Properties */
  showChangePaymentModal: boolean = false;
  selectedNewMethod: 'เงินสด' | 'โอน' = 'เงินสด';
  showQrModal: boolean = false;
  qrCodeData: string | null = null;
  transactionId: string = '';
  isGeneratingQr: boolean = false;

  /* Polling Properties */
  private pollingTimer: any = null;
  private isPolling: boolean = false;

  constructor(
    private billService: BillService,
    private paymentService: PaymentService,
    private signalRService: SignalrService,
    private messageService: MessageService,
    private tableService: TableService,
    private printService: PrintService ,
    private configService: ConfigService
  ) { }

  ngOnInit() {
    this.loadBills();
    this.loadResConfig();
  }

  ngOnDestroy() {
    this.stopPolling();
  }

  /* Keyboard Navigation */
  @HostListener('window:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if (!this.filteredBills || this.filteredBills.length === 0) return;

    const activeElement = document.activeElement;
    const tagName = activeElement?.tagName.toLowerCase();
    if (tagName === 'input' || tagName === 'select' || tagName === 'textarea') {
      return;
    }

    const currentIndex = this.filteredBills.findIndex(
      b => (b.bill_id || b.billId) === (this.selectedBill?.bill_id || this.selectedBill?.billId)
    );

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      const nextIndex = currentIndex < this.filteredBills.length - 1 ? currentIndex + 1 : 0;
      this.selectBill(this.filteredBills[nextIndex]);
      this.scrollToSelectedRow(nextIndex);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      const prevIndex = currentIndex > 0 ? currentIndex - 1 : this.filteredBills.length - 1;
      this.selectBill(this.filteredBills[prevIndex]);
      this.scrollToSelectedRow(prevIndex);
    }
  }

  private scrollToSelectedRow(index: number) {
    setTimeout(() => {
      const rows = document.querySelectorAll('.bill-table tbody tr');
      if (rows && rows[index]) {
        rows[index].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }, 50);
  }

  /* Polling Payment Status */
  startAutoCheckStatus(billId: number, transactionId: string) {
    if (this.isPolling) return;
    this.isPolling = true;

    this.pollingTimer = setInterval(() => {
      if (!transactionId) return;

      this.paymentService.verifyPayment(billId, transactionId).subscribe({
        next: (result: any) => {
          if (result.status === 'success') {
            this.stopPolling();
            this.showQrModal = false;

            if (this.selectedBill) {
              this.selectedBill.paymentMethod = 'โอน';
            }

            this.messageService.add({
              severity: 'success',
              summary: 'ชำระเงินสำเร็จ',
              detail: 'ตรวจพบการชำระเงินผ่าน QR Code เรียบร้อยแล้ว'
            });

            this.sendToCustomerDisplay(null, true);
            this.loadBills();
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

  /* Data Fetching */
  loadBills() {
    this.billService.getReceipt().subscribe({
      next: (res: any[]) => {
        this.bills = res || [];

        // 🟢 วนลูปดึงข้อมูลโต๊ะของแต่ละบิลเหมือนหน้า Bill
        this.bills.forEach(bill => {
          bill.tableNumbers = 'กำลังโหลด...';
          bill.allTables = [];
          const targetBillId = bill.bill_id || bill.billId;

          if (targetBillId) {
            this.tableService.getTableByBillId(targetBillId).subscribe({
              next: (tables: any[]) => {
                if (tables && tables.length > 0) {
                  bill.allTables = tables;
                  const tableNames = tables.map(t => t.table_Number || t.tableNumber).filter(name => name);

                  if (tableNames.length > 2) {
                    bill.tableNumbers = tableNames.slice(0, 2).join(', ') + '...';
                  } else {
                    bill.tableNumbers = tableNames.join(', ');
                  }
                } else {
                  bill.tableNumbers = 'ไม่พบโต๊ะ';
                  bill.allTables = [];
                }
              },
              error: (err) => {
                console.error(`โหลดโต๊ะของบิล ${targetBillId} ไม่สำเร็จ:`, err);
                bill.tableNumbers = 'ข้อผิดพลาด';
                bill.allTables = [];
              }
            });
          } else {
            bill.tableNumbers = 'ไม่มีรหัสบิล';
          }
        });

        this.applyFilters();
        if (this.filteredBills.length > 0) {
          this.selectBill(this.filteredBills[0]);
        }
      },
      error: (err) => {
        console.error(err);
        this.messageService.add({
          severity: 'error',
          summary: ' Error',
          detail: 'ไม่สามารถโหลดรายการบิลได้'
        });
      }
    });
  }
  loadResConfig() {
    this.configService.getConfig().subscribe({
      next: (res: any) => {
        this.resinfo = res || [];
        console.log('Loaded restaurant config:', this.resinfo);
      },
      error: (err) => {
        console.error(err);
      }
    });
  }

  /* Filter Logic */
  applyFilters() {
    let result = [...this.bills];

    if (this.searchTerm.trim() !== '') {
      const term = this.searchTerm.toLowerCase();
      result = result.filter(b =>
        (b.bill_id && b.bill_id.toString().includes(term)) ||
        (b.billNo && b.billNo.toLowerCase().includes(term)) ||
        (b.tableNumbers && b.tableNumbers.toLowerCase().includes(term)) // 🟢 ค้นหาด้วยหมายเลขโต๊ะได้
      );
    }

    if (this.searchDate) {
      result = result.filter(b => {
        const dateStr = b.created_at || b.createdAt;
        if (!dateStr) return false;
        const formattedDate = new Date(dateStr).toISOString().split('T')[0];
        return formattedDate === this.searchDate;
      });
    }

    if (this.searchPaymentMethod !== 'ทั้งหมด') {
      result = result.filter(b => b.paymentMethod === this.searchPaymentMethod);
    }

    if (this.limitSize > 0) {
      result = result.slice(0, this.limitSize);
    }

    this.filteredBills = result;
  }

  /* Selection Helper */
  selectBill(bill: any) {
    this.stopPolling();
    this.selectedBill = bill;
    this.loadBillOrderItems(bill.bill_id || bill.billId);
  }

  isSelected(bill: any): boolean {
    if (!this.selectedBill || !bill) return false;
    const selectedId = this.selectedBill.bill_id ?? this.selectedBill.billId;
    const currentId = bill.bill_id ?? bill.billId;
    return selectedId !== undefined && selectedId === currentId;
  }

  loadBillOrderItems(billId: number) {
    this.billService.getBillById(billId).subscribe({
      next: (res: any) => {
        this.billOrderItems = res.items || [];
        this.sendToCustomerDisplay(null);
      },
      error: (err) => {
        console.error(err);
        this.billOrderItems = [];
        this.sendToCustomerDisplay(null);
      }
    });
  }

  /* Payment Actions */
  openChangePaymentModal() {
    if (!this.selectedBill) return;
    this.selectedNewMethod = this.selectedBill.paymentMethod === 'โอน' ? 'โอน' : 'เงินสด';
    this.showChangePaymentModal = true;
  }

  confirmChangePayment() {
    if (!this.selectedBill) return;

    const targetBillId = this.selectedBill.bill_id || this.selectedBill.billId;
    this.stopPolling();

    if (this.selectedNewMethod === 'เงินสด') {
      const payload = { paymentMethod: 'เงินสด', transactionId: null };
      this.paymentService.updatePaymentMethod(targetBillId, payload).subscribe({
        next: () => {
          this.selectedBill.paymentMethod = 'เงินสด';
          this.showChangePaymentModal = false;
          this.messageService.add({
            severity: 'success',
            summary: 'สำเร็จ',
            detail: 'เปลี่ยนประเภทเป็น เงินสด เรียบร้อยแล้ว'
          });
          this.sendToCustomerDisplay(null);
        },
        error: (err) => console.error(err)
      });
    } else {
      this.showChangePaymentModal = false;
      this.isGeneratingQr = true;

      const amount = this.selectedBill.total_amount || this.selectedBill.grandTotal || 0;

      this.paymentService.CreateCheckoutQr(targetBillId, amount).subscribe({
        next: (res: any) => {
          this.isGeneratingQr = false;
          this.selectedBill.paymentMethod = 'โอน';
          this.qrCodeData = res.qr_data;
          this.transactionId = res.transaction_id || res.transactionId || '';
          this.showQrModal = true;

          this.sendToCustomerDisplay(this.qrCodeData);

          this.messageService.add({
            severity: 'info',
            summary: 'QR Code Ready',
            detail: 'แสดง QR Code บนหน้าจอลูกค้าเรียบร้อยแล้ว'
          });

          if (this.transactionId) {
            this.startAutoCheckStatus(targetBillId, this.transactionId);
          }
        },
        error: (err) => {
          this.isGeneratingQr = false;
          console.error(err);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'ไม่สามารถสร้าง QR Code สำหรับโอนเงินได้'
          });
        }
      });
    }
  }

  /* Customer Display & Print */
  sendToCustomerDisplay(qrCodeData: string | null = null, isPaidSuccess: boolean = false) {
    if (!this.selectedBill) return;

    const displayItems: any[] = [];

    const numAdults = this.selectedBill.num_adults || this.selectedBill.numAdults || 0;
    const numChildren = this.selectedBill.num_children || this.selectedBill.numChildren || 0;

    if (numAdults > 0) {
      displayItems.push({
        name: 'บุฟเฟต์ผู้ใหญ่',
        quantity: numAdults,
        subTotal: this.selectedBill.adultPriceTotal || 0
      });
    }

    if (numChildren > 0) {
      displayItems.push({
        name: 'บุฟเฟต์เด็ก',
        quantity: numChildren,
        subTotal: this.selectedBill.childPriceTotal || 0
      });
    }

    this.billOrderItems.forEach(item => {
      displayItems.push({
        name: item.name || item.menuName,
        quantity: item.quantity,
        subTotal: item.price * item.quantity
      });
    });

    const payload = {
      tableNumbers: this.selectedBill.tableNumbers || 'ไม่พบโต๊ะ', // 🟢 เปลี่ยนจากค่าคงที่ 'A2' เป็นหมายเลขโต๊ะจริงที่ดึงได้
      items: displayItems,
      fineAmount: this.selectedBill.fineAmount || 0,
      discountName: this.selectedBill.discountName || 'ไม่มีโปรโมชั่น',
      grandTotal: this.selectedBill.total_amount || this.selectedBill.grandTotal || 0,
      qrData: qrCodeData,
      isPaidSuccess: isPaidSuccess
    };

    if (this.signalRService.sendToCustomerDisplay) {
      this.signalRService.sendToCustomerDisplay(payload).catch(err => console.warn(err));
    }
  }

  printReceipt() {
    console.log('Print request sent for bill ID:', this.selectedBill.bill_id);
    this.printService.printReceipt(this.selectedBill.bill_id).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'สำเร็จ',
          detail: 'พิมพ์ใบเสร็จเรียบร้อยแล้ว'
        });
      },
      error: (err) => {
        console.error(err);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'ไม่สามารถพิมพ์ใบเสร็จได้'
        });
      }
    });
    
  }
}