import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { ButtonModule } from 'primeng/button';
import { RippleModule } from 'primeng/ripple';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { TagModule } from 'primeng/tag';
import { MenuManager } from '../../../../components/menu-bar/menu-manager/menu-manager';
import { Discount } from '../../../../models/discount.model';
import { DiscountService } from '../../../../service/api/discount.service';

interface DiscountForm {
  discount_id: number | null;
  discount_Name: string;
  discount_amount: number | null;
  discount_Type: string;
  startDate: string;
  endDate: string;
}

@Component({
  selector: 'app-manage-discount',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MenuManager,
    ToastModule,
    ButtonModule,
    RippleModule,
    ConfirmDialogModule,
    TableModule,
    DialogModule,
    TagModule,
  ],
  templateUrl: './manage-discount.html',
  styleUrl: './manage-discount.scss',
  providers: [ConfirmationService],
})
export class ManageDiscount implements OnInit {
  discounts: Discount[] = [];
  isLoading = false;
  isSaving = false;

  showDialog = false;
  isEditMode = false;

  minDate: string = this.toDateInputString(new Date());

  form: DiscountForm = this.emptyForm();

  constructor(
    private discountService: DiscountService,
    private messageService: MessageService,
    private confirmationService: ConfirmationService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.loadDiscounts();
  }

  goBackToShop(): void {
    this.router.navigate(['/ManageShop']);
  }

  emptyForm(): DiscountForm {
    const todayStr = this.toDateInputString(new Date());
    return {
      discount_id: null,
      discount_Name: '',
      discount_amount: null,
      discount_Type: 'percent',
      startDate: todayStr,
      endDate: todayStr,
    };
  }

  // ป้องกันการพิมพ์เครื่องหมาย -, +, e, E ตั้งแต่กดคีย์บอร์ด
  preventNegativeKey(event: KeyboardEvent): void {
    if (['-', '+', 'e', 'E'].includes(event.key)) {
      event.preventDefault();
    }
  }

  private toDateInputString(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  loadDiscounts(): void {
    this.isLoading = true;
    this.discountService.getDiscount().subscribe({
      next: (data) => {
        this.discounts = data;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'ผิดพลาด',
          detail: 'โหลดข้อมูลส่วนลดไม่สำเร็จ',
        });
      },
    });
  }

  openAddDialog(): void {
    this.isEditMode = false;
    this.form = this.emptyForm();
    this.showDialog = true;
  }

  openEditDialog(item: Discount): void {
    this.isEditMode = true;
    this.form = {
      discount_id: item.discount_id,
      discount_Name: item.discount_Name,
      discount_amount: item.discount_amount,
      discount_Type: item.discount_Type,
      startDate: this.toDateInputString(new Date(item.startDate)),
      endDate: this.toDateInputString(new Date(item.endDate)),
    };
    this.showDialog = true;
  }

  closeDialog(): void {
    this.showDialog = false;
  }

  saveDiscount(): void {
    if (!this.form.discount_Name?.trim()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'กรอกข้อมูลไม่ครบ',
        detail: 'กรุณากรอกชื่อส่วนลด',
      });
      return;
    }
    if (!this.form.discount_amount || this.form.discount_amount <= 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'กรอกข้อมูลไม่ครบ',
        detail: 'มูลค่าส่วนลดต้องมากกว่า 0',
      });
      return;
    }
    if (!this.form.startDate || !this.form.endDate) {
      this.messageService.add({
        severity: 'warn',
        summary: 'กรอกข้อมูลไม่ครบ',
        detail: 'กรุณาเลือกวันเริ่มและวันสิ้นสุด',
      });
      return;
    }
    if (new Date(this.form.startDate) > new Date(this.form.endDate)) {
      this.messageService.add({
        severity: 'warn',
        summary: 'วันที่ไม่ถูกต้อง',
        detail: 'วันเริ่มต้องมาก่อนวันสิ้นสุด',
      });
      return;
    }
    if (!this.isEditMode && this.form.startDate < this.minDate) {
      this.messageService.add({
        severity: 'warn',
        summary: 'วันที่ไม่ถูกต้อง',
        detail: 'ไม่สามารถเลือกวันเริ่มย้อนหลังได้',
      });
      return;
    }

    const payload = {
      Discount_Name: this.form.discount_Name,
      Discount_amount: this.form.discount_amount,
      Discount_Type: this.form.discount_Type,
      StartDate: this.form.startDate,
      EndDate: this.form.endDate,
    };

    this.isSaving = true;

    const request$ =
      this.isEditMode && this.form.discount_id
        ? this.discountService.updateDiscount(this.form.discount_id, payload)
        : this.discountService.addDiscount(payload);

    request$.subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'สำเร็จ',
          detail: this.isEditMode ? 'แก้ไขส่วนลดเรียบร้อย' : 'เพิ่มส่วนลดเรียบร้อย',
        });
        this.isSaving = false;
        this.showDialog = false;
        this.loadDiscounts();
      },
      error: () => {
        this.isSaving = false;
        this.messageService.add({
          severity: 'error',
          summary: 'ผิดพลาด',
          detail: 'บันทึกไม่สำเร็จ กรุณาลองใหม่',
        });
      },
    });
  }

  deleteDiscount(item: Discount): void {
    this.confirmationService.confirm({
      message: `ต้องการลบส่วนลด "${item.discount_Name}" ใช่ไหม?`,
      header: 'ยืนยันการลบ',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'ลบเลย',
      rejectLabel: 'ยกเลิก',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-text',
      accept: () => {
        this.discountService.deleteDiscount(item.discount_id).subscribe({
          next: () => {
            this.messageService.add({
              severity: 'info',
              summary: 'ลบแล้ว',
              detail: 'ลบส่วนลดเรียบร้อย',
            });
            this.discounts = this.discounts.filter((d) => d.discount_id !== item.discount_id);
          },
          error: () => {
            this.messageService.add({
              severity: 'error',
              summary: 'ผิดพลาด',
              detail: 'ลบไม่สำเร็จ',
            });
          },
        });
      },
    });
  }

  isActive(item: Discount): boolean {
    const now = new Date();
    const start = new Date(item.startDate);
    const end = new Date(item.endDate);
    return now >= start && now <= end;
  }

  formatType(type: string): string {
    return type === 'percent' ? '%' : ' บาท';
  }
}
