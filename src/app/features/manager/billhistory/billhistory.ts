import { CommonModule } from '@angular/common';
import { Component, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIcon } from "@angular/material/icon";
import { MessageService } from 'primeng/api';
import { DialogModule } from "primeng/dialog";
import { ToastModule } from "primeng/toast";
import { MenuManager } from '../../../components/menu-bar/menu-manager/menu-manager';
import { BillService } from '../../../service/api/bill.service';
import { ConfigService } from '../../../service/api/config.service';
import { PaymentService } from '../../../service/api/payment.service';
import { TableService } from '../../../service/api/table.service';

@Component({
  selector: 'app-billhistory',
  imports: [MenuManager, CommonModule, FormsModule, MatIcon, DialogModule, ToastModule],
  templateUrl: './billhistory.html',
  styleUrl: './billhistory.scss',
})
export class Billhistory {

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
    private messageService: MessageService,
    private tableService: TableService,
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
      },
      error: (err) => {
        console.error(err);
        this.billOrderItems = [];
    
      }
    });
  }

 

}
