import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { MessageService } from 'primeng/api';
import { DialogModule } from 'primeng/dialog';
import { Toast } from 'primeng/toast';
import { finalize, forkJoin } from 'rxjs'; // 🟢 เพิ่ม finalize เข้ามา
import { MenuManager } from '../../../components/menu-bar/menu-manager/menu-manager';
import { Table } from '../../../models/table.model';
import { SignalrService } from '../../../service/api/signalr.service';
import { TableService } from '../../../service/api/table.service';

@Component({
  selector: 'app-manage-tables',
  imports: [MenuManager, CommonModule, MatIconModule, FormsModule, Toast, DialogModule],
  templateUrl: './manage-tables.html',
  styleUrl: './manage-tables.scss',
})
export class ManageTables implements OnInit {
  tables: Table[] = [];
  totalTable: number = 0;
  showAddTableModal: boolean = false;
  displayShowQr: boolean = false;
  selectedTable: any;

  tablePrefix: string = '';
  startTableNum: number | null = null;
  endTableNum: number | null = null;
  isLoading: boolean = false;

  // 🟢 เพิ่มตัวแปรสำหรับโหมดเลือกและลบโต๊ะ
  isDeleteMode: boolean = false;
  selectedDeleteTables: Table[] = [];
  displayconfirmDelete: boolean = false;
  deleteTargetString: string = '';

  constructor(
    private tableService: TableService,
    private signalrService: SignalrService,
    private messageService: MessageService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.loadTables();

    this.signalrService.tableStatus$.subscribe((updatedTable) => {
      const index = this.tables.findIndex((t) => t.table_id === updatedTable.tableId);
      if (index !== -1) {
        this.tables[index].table_Status = updatedTable.status as 'ว่าง' | 'ติดจอง' | 'ไม่ว่าง';
        console.log(`โต๊ะที่ ${updatedTable.tableId} เปลี่ยนเป็น ${updatedTable.status}`);
      }
    });
  }

  loadTables() {
    console.log('โต๊ะทั้งหมด' + this.totalTable);
    this.tableService.getAlltables().subscribe({
      next: (response: Table[]) => {
        // เรียงลำดับชื่อ/เลขโต๊ะแบบ Natural Sort
        this.tables = response.sort((a, b) => {
          const numA = a.table_Number || (a as any).table_number || '';
          const numB = b.table_Number || (b as any).table_number || '';
          return numA.localeCompare(numB, undefined, { numeric: true, sensitivity: 'base' });
        });

        this.totalTable = this.tables.length;
        console.log('table', this.totalTable);
        console.log('ข้อมูลโต๊ะทั้งหมดถูกโหลดและเรียงลำดับแล้ว:', this.tables);
      },
      error: (err) => {
        console.error('โหลดข้อมูลไม่สำเร็จ:', err);
      },
    });
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

  gotoEditDleteTable() {
    this.router.navigate(['/EditDeleteTable']);
  }

  addTable() {
    this.toggleAddTableModal(true);
  }

  showQr(table_id: number) {
    this.selectedTable = this.tables.find((t) => t.table_id === table_id);
    if (this.selectedTable) {
      this.displayShowQr = true;
    }
  }

  downloadTablePDF() {
    const element = document.getElementById('print-section');
    if (element) {
      html2canvas(element, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        logging: true,
      }).then((canvas) => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');

        const width = 100;
        const height = 100;

        const x = 5;
        const y = 5;

        pdf.addImage(imgData, 'PNG', x, y, width, height);
        pdf.save(`Table_${this.selectedTable?.table_Number}.pdf`);
      });
    }
  }

  downloadAllTablesPDF() {
    window.print();
  }

  // 🟢 เพิ่มฟังก์ชันสำหรับการเลือกและลบโต๊ะ
  selectTableFordelete() {
    if (!this.isDeleteMode) {
      // เมื่อกดครั้งแรก ให้เปิดโหมดเลือกโต๊ะ
      this.isDeleteMode = true;
      this.selectedDeleteTables = [];
    } else {
      // เมื่อกดอีกครั้งเพื่อยืนยันลบ
      if (this.selectedDeleteTables.length === 0) {
        this.messageService.add({
          severity: 'warn',
          summary: 'แจ้งเตือน',
          detail: 'กรุณาเลือกโต๊ะที่ต้องการลบอย่างน้อย 1 โต๊ะ',
        });
        return;
      }
      this.deleteTargetString = this.selectedDeleteTables.map((t) => t.table_Number).join(', ');
      this.displayconfirmDelete = true;
    }
  }

  cancelDeleteMode() {
    this.isDeleteMode = false;
    this.selectedDeleteTables = [];
  }

  toggleDeleteSelection(table: Table) {
    const index = this.selectedDeleteTables.findIndex((t) => t.table_id === table.table_id);
    if (index > -1) {
      this.selectedDeleteTables.splice(index, 1);
    } else {
      this.selectedDeleteTables.push(table);
    }
  }

  isSelectedForDelete(table: Table): boolean {
    return this.selectedDeleteTables.some((t) => t.table_id === table.table_id);
  }

  executeDeleteTables() {
    if (this.selectedDeleteTables.length === 0) return;

    this.isLoading = true;
    const requests = this.selectedDeleteTables.map((t) => this.tableService.deleteTable(t.table_id));

    forkJoin(requests)
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.displayconfirmDelete = false;
        })
      )
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'ลบสำเร็จ',
            detail: `ลบข้อมูลโต๊ะเรียบร้อยแล้ว จำนวน ${this.selectedDeleteTables.length} โต๊ะ`,
            life: 3000,
          });
          this.cancelDeleteMode();
          this.loadTables();
        },
        error: (err) => {
          const errorMessage = err?.error?.message || 'เกิดข้อผิดพลาดในการลบข้อมูล';
          this.messageService.add({
            severity: 'error',
            summary: 'เกิดข้อผิดพลาด',
            detail: errorMessage,
          });
        },
      });
  }
}