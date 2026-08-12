import { CommonModule, Location } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { DialogModule } from 'primeng/dialog';
import { Toast } from 'primeng/toast';
import { finalize, forkJoin } from 'rxjs';
import { MenuManager } from '../../../../components/menu-bar/menu-manager/menu-manager';
import { Table } from '../../../../models/table.model';
import { TableService } from '../../../../service/api/table.service';
@Component({
  selector: 'app-edit-delete-tables',
  imports: [MenuManager, MatIconModule, CommonModule, Toast, DialogModule, FormsModule],
  templateUrl: './edit-delete-tables.html',
  styleUrl: './edit-delete-tables.scss',
})
export class EditDeleteTables implements OnInit {
  tables: Table[] = [];
  totalTable: number = 0;
  displayconfirm: boolean = false;
  displayEditTable: boolean = false;
  showAddTableModal: boolean = false;
  tableNumber: string = '';
  selectedTable: any;
  tableNumberold: string = '';

  tablePrefix: string = '';
  startTableNum: number | null = null;
  endTableNum: number | null = null;
  isLoading: boolean = false;
  constructor(
    private tableService: TableService,
    private route: Router,
    private messageService: MessageService,
    private location: Location,
  ) {}
  ngOnInit(): void {
    this.loadTables();
  }
  // โหลดข้อมูลโต๊ะทั
loadTables() {
    console.log('โต๊ะทั้งหมด' + this.totalTable);
    this.tableService.getAlltables().subscribe({
      next: (response: Table[]) => {
        // เรียงลำดับเลขโต๊ะแบบ Natural Sort
        this.tables = response.sort((a, b) => {
          const numA = a.table_Number || (a as any).table_number || '';
          const numB = b.table_Number || (b as any).table_number || '';
          return numA.localeCompare(numB, undefined, { numeric: true, sensitivity: 'base' });
        });

        this.totalTable = this.tables.length;
        console.log('table', this.totalTable);
        console.log('ข้อมูลโต๊ะทั้งหมดถูกโหลดแล้ว:', this.tables);
      },
      error: (err) => {
        console.error('โหลดข้อมูลไม่สำเร็จ:', err);
      },
    });
  }
  goBack() {
    this.location.back();
  }

    toggleAddTableModal(show: boolean) {
    this.showAddTableModal = show;
    if (show) {
      this.tablePrefix = '';
      this.startTableNum = null;
      this.endTableNum = null;
    }
  }
  confirmAddBatchTables() {
      if (this.startTableNum === null || this.endTableNum === null) {
        this.messageService.add({
          severity: 'warn',
          summary: 'แจ้งเตือน',
          detail: 'กรุณาระบุเลขเริ่มต้นและเลขสิ้นสุด',
        });
        return;
      }
  
      if (this.startTableNum < 1 || this.endTableNum < 1) {
        this.messageService.add({
          severity: 'warn',
          summary: 'แจ้งเตือน',
          detail: 'เลขโต๊ะต้องมีค่าตั้งแต่ 1 ขึ้นไปเท่านั้น',
        });
        return;
      }
  
      if (this.startTableNum > this.endTableNum) {
        this.messageService.add({
          severity: 'warn',
          summary: 'แจ้งเตือน',
          detail: 'เลขเริ่มต้นต้องน้อยกว่าหรือเท่ากับเลขสิ้นสุด',
        });
        return;
      }
  
      const prefix = this.tablePrefix.trim().toUpperCase();
      const requests = [];
  
      for (let i = this.startTableNum; i <= this.endTableNum; i++) {
        const tableNum = `${prefix}${i}`;
        const payload = {
          Table_number: tableNum,
        };
        requests.push(this.tableService.addTable(payload));
      }
  
      this.isLoading = true;
  
      // 🟢 ใช้ pipe(finalize(...)) เพื่อให้ปลดปุ่มกำลังบันทึกแน่นอนไม่ว่าจะสำเร็จหรือซ้ำ/ล้มเหลว
      forkJoin(requests)
        .pipe(
          finalize(() => {
            this.isLoading = false; // ปลดล็อคปุ่มเสมอ
          })
        )
        .subscribe({
          next: () => {
            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: `เพิ่มโต๊ะสำเร็จ จำนวน ${requests.length} โต๊ะ`,
              life: 3000,
            });
            this.loadTables();
            this.toggleAddTableModal(false);
          },
          error: (err) => {
            const errorMessage =
              err?.error?.message || 'เกิดข้อผิดพลาดในการเพิ่มโต๊ะ (อาจมีเลขโต๊ะที่ซ้ำกัน)';
            this.messageService.add({
              severity: 'error',
              summary: 'เกิดข้อผิดพลาด',
              detail: errorMessage,
            });
          },
        });
    }
  
  addTable() {
    this.toggleAddTableModal(true);
  }
  // แก้ไขโต๊ะ
  editTable(table_id: number) {
    this.selectedTable = this.tables.find((t) => t.table_id === table_id);
    if (this.selectedTable) {
      console.log('ข้อมูลโต๊ะที่เลือก:', this.selectedTable);
      this.tableNumberold = this.selectedTable.table_Number;
      this.displayEditTable = true;
    }
  }
  // ยืนยันการลบโต๊ะ
  confirm(table_id: number) {
    this.selectedTable = this.tables.find((t) => t.table_id === table_id);
    if (this.selectedTable) {
      this.displayconfirm = true;
    }
  }

  //ลบโต๊ะ
  deleteTable(table_id: number) {
    this.tableService.deleteTable(table_id).subscribe({
      next: (res) => {
        if (res) {
          this.messageService.add({
            severity: 'success',
            summary: 'Deleted Successfully',
            detail: 'ลบข้อมูลโต๊ะเรียบร้อยแล้ว',
            life: 3000,
          });
          this.displayconfirm = false;
          this.ngOnInit();
        }
      },
      error: (err) => {
        const errorMessage = err?.error?.message || 'เกิดข้อผิดพลาดในการสมัครสมาชิก';
        this.messageService.add({
          severity: 'error',
          summary: 'เกิดข้อผิดพลาด',
          detail: errorMessage,
        });
      },
    });
  }
  //บันทึกการแก้ไขโต๊ะ
  saveTableChanges(table_id: number) {
    this.tableService.updateTable(table_id, this.tableNumber).subscribe({
      next: (res) => {
        if (res) {
          this.messageService.add({
            severity: 'success',
            summary: 'Updated Successfully',
            detail: 'อัปเดตข้อมูลโต๊ะเรียบร้อยแล้ว',
            life: 3000,
          });
          this.ngOnInit();
          this.displayEditTable = false;
        }
      },
      error: (err) => {
        const errorMessage = err?.error?.message || 'เกิดข้อผิดพลาดในการอัปเดตข้อมูล';
        this.messageService.add({
          severity: 'error',
          summary: 'เกิดข้อผิดพลาด',
          detail: errorMessage,
        });
      },
    });
  }
}
