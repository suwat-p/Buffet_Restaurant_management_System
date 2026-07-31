import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Toast } from 'primeng/toast';
import { Subscription } from 'rxjs';
import { MenuCashier } from "../../../components/menu-bar/menu-cashier/menu-cashier";
import { Bill } from '../../../models/bill.model';
import { Discount } from '../../../models/discount.model';
import { BillService } from '../../../service/api/bill.service';
import { DiscountService } from '../../../service/api/discount.service';
import { SignalrService } from '../../../service/api/signalr.service';
import { TableService } from '../../../service/api/table.service';

@Component({
  selector: 'app-bill',
  imports: [
    MenuCashier,
    CommonModule,
    MatIconModule,
    FormsModule,
    Toast
  ],
  templateUrl: './bill.html',
  styleUrl: './bill.scss',
})
export class BillingList implements OnInit, OnDestroy {
  activeBills: Bill[] = [];
  discounts: Discount[] = [];
  searchText: string = '';

  // สำหรับ Modal ชำระเงิน
  selectedBillForPayment: any = null;
  showPaymentModal: boolean = false;

  // 🟢 เก็บ Subscriptions เพื่อป้องกัน Memory Leak
  private subscriptions: Subscription[] = [];

  constructor(
    private billService: BillService,
    private discountService: DiscountService,
    private tableService: TableService,
    private messageService: MessageService,
    private signalrService: SignalrService,
    private router: Router
  ) { }

  ngOnInit() {
    this.loadDiscounts();
    this.loadActiveBills();

    // 🟢 1. ดักฟัง Event เมื่อมีการอัปเดตบิลสดๆ (สร้าง/แก้ไข/ลบ/เช็คบิล)
    if (this.signalrService.billUpdated$) {
      const subBill = this.signalrService.billUpdated$.subscribe(() => {
        console.log('SignalR: บิลมีการเปลี่ยนแปลง ดึงข้อมูลบิลใหม่...');
        this.loadActiveBills();
      });
      this.subscriptions.push(subBill);
    }

    // 🟢 2. ดักฟัง Event เมื่อมีการอัปเดตสถานะโต๊ะสดๆ
    if (this.signalrService.tableStatus$) {
      const subTable = this.signalrService.tableStatus$.subscribe(() => {
        console.log('SignalR: โต๊ะมีการเปลี่ยนแปลง โหลดข้อมูลบิลใหม่...');
        this.loadActiveBills();
      });
      this.subscriptions.push(subTable);
    }
  }

  ngOnDestroy() {
    // 🟢 Unsubscribe เคลียร์หน่วยความจำป้องกันการรันซ้ำซ้อน
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  // โหลดรายการส่วนลดเพื่อนำมาแมปชื่อโปรโมชั่น
  loadDiscounts() {
    this.discountService.getDiscount().subscribe({
      next: (response: Discount[]) => {
        this.discounts = response;
      },
      error: (err) => {
        console.error('โหลดข้อมูลส่วนลดไม่สำเร็จ:', err);
      }
    });
  }

  // โหลดรายการบิลที่ยังเปิดอยู่
  loadActiveBills() {
    this.billService.getBill().subscribe({
      next: (response: any[]) => {
        this.activeBills = response;

        this.activeBills.forEach(bill => {
          bill.tableNumbers = 'กำลังโหลด...';
          bill.allTables = [];

          if (bill.bill_id) {
            this.tableService.getTableByBillId(bill.bill_id).subscribe({
              next: (tables: any[]) => {
                if (tables && tables.length > 0) {
                  bill.allTables = tables;
                  const tableNames = tables.map(t => t.table_Number).filter(name => name);

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
              }
            });
          } else {
            bill.tableNumbers = 'ไม่มีรหัสบิล';
          }
        });
      },
      error: (err) => {
        console.error('โหลดข้อมูลบิลไม่สำเร็จ:', err);
      }
    });
  }

  // แปลง discount_id เป็นชื่อส่วนลด
  getdiscountName(discountId: number | null): string {
    if (discountId === null) return 'ไม่มีส่วนลด';
    const discount = this.discounts.find(d => d.discount_id === discountId);
    return discount ? discount.discount_Name : 'ไม่มีส่วนลด';
  }

  // Getter ระบบค้นหาโต๊ะ
  get filteredActiveBills(): Bill[] {
    if (!this.searchText.trim()) {
      return this.activeBills;
    }

    const search = this.searchText.toLowerCase().trim();

    return this.activeBills.filter(bill => {
      const matchText = bill.tableNumbers && bill.tableNumbers.toLowerCase().includes(search);
      const matchInAllTables = bill.allTables && bill.allTables.some(t =>
        t.table_Number && t.table_Number.toLowerCase().includes(search)
      );

      return matchText || matchInAllTables;
    });
  }

  // ฟังก์ชันเปิด Modal ชำระเงิน (ไปหน้ารายละเอียดการชำระเงิน)
  openPayment(bill: any) {
    const billId = bill.bill_id || bill.billId;

    if (billId) {
      this.router.navigate(['/CheckOut', billId]);
    } else {
      console.error('ไม่พบ billId ในข้อมูลที่ส่งมา:', bill);
    }
  }
}