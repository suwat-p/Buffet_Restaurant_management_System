import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MessageService } from 'primeng/api';
import { MenuCashier } from '../../../components/menu-bar/menu-cashier/menu-cashier';
import { Bill } from '../../../models/bill.model';
import { Discount } from '../../../models/discount.model';
import { BillService } from '../../../service/api/bill.service';
import { DiscountService } from '../../../service/api/discount.service';
import { TableService } from '../../../service/api/table.service';
import { Toast } from 'primeng/toast';

@Component({
  selector: 'app-bill',
  imports: [MenuCashier, CommonModule, MatIconModule, FormsModule, Toast],
  templateUrl: './bill.html',
  styleUrl: './bill.scss',
})
export class BillingList implements OnInit {
  activeBills: Bill[] = [];
  discounts: Discount[] = [];
  searchText: string = '';

  // สำหรับ Modal ชำระเงิน
  selectedBillForPayment: any = null;
  showPaymentModal: boolean = false;

  constructor(
    private billService: BillService,
    private discountService: DiscountService,
    private tableService: TableService,
    private messageService: MessageService,
  ) {}

  ngOnInit() {
    this.loadDiscounts();
    this.loadActiveBills();
  }

  // โหลดรายการส่วนลดเพื่อนำมาแมปชื่อโปรโมชั่น
  loadDiscounts() {
    this.discountService.getDiscount().subscribe({
      next: (response: Discount[]) => {
        this.discounts = response;
      },
      error: (err) => {
        console.error('โหลดข้อมูลส่วนลดไม่สำเร็จ:', err);
      },
    });
  }

  // โหลดรายการบิลที่ยังเปิดอยู่
  loadActiveBills() {
    this.billService.getBill().subscribe({
      next: (response: any[]) => {
        this.activeBills = response;

        this.activeBills.forEach((bill) => {
          bill.tableNumbers = 'กำลังโหลด...';
          bill.allTables = [];

          if (bill.bill_id) {
            this.tableService.getTableByBillId(bill.bill_id).subscribe({
              next: (tables: any[]) => {
                if (tables && tables.length > 0) {
                  bill.allTables = tables;
                  const tableNames = tables.map((t) => t.table_Number).filter((name) => name);

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
                console.error(`โหลดโต๊ะของบิล ${bill.bill_id} ไม่สำเร็จ:`, err);
                bill.tableNumbers = 'ข้อผิดพลาด';
                bill.allTables = [];
              },
            });
          } else {
            bill.tableNumbers = 'ไม่มีรหัสบิล';
          }
        });
      },
      error: (err) => {
        console.error('โหลดข้อมูลบิลไม่สำเร็จ:', err);
      },
    });
  }

  // แปลง discount_id เป็นชื่อส่วนลด
  getdiscountName(discountId: number | null): string {
    if (discountId === null) return 'ไม่มีส่วนลด';
    const discount = this.discounts.find((d) => d.discount_id === discountId);
    return discount ? discount.discount_Name : 'ไม่มีส่วนลด';
  }

  // Getter ระบบค้นหาโต๊ะ
  get filteredActiveBills(): Bill[] {
    if (!this.searchText.trim()) {
      return this.activeBills;
    }

    const search = this.searchText.toLowerCase().trim();

    return this.activeBills.filter((bill) => {
      const matchText = bill.tableNumbers && bill.tableNumbers.toLowerCase().includes(search);
      const matchInAllTables =
        bill.allTables &&
        bill.allTables.some((t) => t.table_Number && t.table_Number.toLowerCase().includes(search));

      return matchText || matchInAllTables;
    });
  }

  // ฟังก์ชันเปิด Modal ชำระเงิน (รอผูกกับ Modal ชำระเงินต่อ)
  openPaymentModal(bill: any) {
    this.selectedBillForPayment = bill;
    this.showPaymentModal = true;
    console.log('เปิดหน้าชำระเงินสำหรับบิล:', bill);
  }
}
