import { Component, OnInit, OnDestroy } from '@angular/core';
import { MenuMember } from '../../../components/menu-bar/menu-member/menu-member';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TableService } from '../../../service/api/table.service';
import { BookingService } from '../../../service/api/booking.service';
import { PaymentService } from '../../../service/api/payment.service';
import { SignalrService } from '../../../service/api/signalr.service';
import { AuthService } from '../../../service/api/auth.service';
import { Table } from '../../../models/table.model';

interface BookingForm {
  NumAdults: number;
  NumChildren: number;
  BookingDate: string;
  BookingTime: string;
}

@Component({
  selector: 'app-booking',
  imports: [MenuMember, CommonModule, FormsModule, RouterLink],
  templateUrl: './booking.html',
  styleUrl: './booking.scss',
})
export class Booking implements OnInit, OnDestroy {
  tables: Table[] = [];
  selectedTables: Table[] = [];

  bookingForm: BookingForm = {
    NumAdults: 0,
    NumChildren: 0,
    BookingDate: '',
    BookingTime: '',
  };

  showBookingModal = false;
  showPaymentModal = false;
  showWaitingModal = false;
  paymentSuccess = false;

  isLoading = false;
  isVerifying = false;
  pendingBookingId: number | null = null;
  bookingId: number | null = null;
  bookedTableNames: string[] = [];
  qrUrl: string = '';

  promptPayQrUrl: string = '';
  depositAmount: number = 0;
  transactionId: string = '';

  minDate: string = '';
  minTime: string = '';
  currentMinTime: string = '';
  timeSlots: string[] = [];

  // ── ช่วงเวลา (Period tabs) ──
  periods: { key: string; label: string; range: string; start: string; end: string }[] = [
    { key: 'morning', label: 'เช้า', range: '10:00-12:00', start: '10:00', end: '12:00' },
    { key: 'afternoon', label: 'บ่าย', range: '12:30-16:30', start: '12:30', end: '16:30' },
    { key: 'evening', label: 'เย็น', range: '17:00-22:00', start: '17:00', end: '22:00' },
  ];
  activePeriod: string = 'morning';

  private pollingTimer: any;
  private isPolling = false;

  constructor(
    private signalrService: SignalrService,
    private tableService: TableService,
    private bookingService: BookingService,
    private paymentService: PaymentService,
    private authService: AuthService,
  ) {}

  ngOnInit() {
    this.setMinDate();
    this.generateTimeSlots();
    this.loadTables();
    this.signalrService.tableStatus$.subscribe((updatedTable) => {
      const index = this.tables.findIndex((t) => t.table_id === updatedTable.tableId);
      if (index !== -1) {
        this.tables[index].table_Status = updatedTable.status as 'ว่าง' | 'ติดจอง' | 'ไม่ว่าง';
      }
    });
  }

  ngOnDestroy() {
    this.stopPolling();
  }
  stopPolling() {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
    this.isPolling = false;
  }

  // แปลง Date เป็น yyyy-MM-dd ตามเวลาท้องถิ่น ห้ามใช้ toISOString() (แปลงเป็น UTC ทำให้วันที่ถอยผิดได้ในโซนไทย)
  private toLocalDateStr(d: Date): string {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  setMinDate() {
    const now = new Date();
    this.minDate = this.toLocalDateStr(now);
    const later = new Date(now.getTime() + 30 * 60 * 1000);
    const hh = String(later.getHours()).padStart(2, '0');
    const mm = String(later.getMinutes()).padStart(2, '0');
    this.minTime = `${hh}:${mm}`;
    this.updateCurrentMinTime();
  }

  updateCurrentMinTime() {
    const today = this.toLocalDateStr(new Date());
    if (!this.bookingForm.BookingDate || this.bookingForm.BookingDate === today) {
      this.currentMinTime = this.minTime;
    } else {
      this.currentMinTime = '00:00';
    }
  }

  onDateChange() {
    this.updateCurrentMinTime();
    const today = this.toLocalDateStr(new Date());
    if (
      this.bookingForm.BookingDate === today &&
      this.bookingForm.BookingTime &&
      this.bookingForm.BookingTime < this.minTime
    ) {
      this.bookingForm.BookingTime = '';
    }
  }

  generateTimeSlots() {
    const slots: string[] = [];
    for (let h = 10; h <= 22; h++) {
      for (let m = 0; m < 60; m += 30) {
        if (h === 22 && m > 0) break;
        slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
      }
    }
    this.timeSlots = slots;
  }

  isSlotDisabled(slot: string): boolean {
    const today = this.toLocalDateStr(new Date());
    if (!this.bookingForm.BookingDate || this.bookingForm.BookingDate > today) return false;
    if (this.bookingForm.BookingDate === today) return slot < this.minTime;
    return true;
  }

  selectSlot(slot: string) {
    if (this.isSlotDisabled(slot)) return;
    this.bookingForm.BookingTime = this.bookingForm.BookingTime === slot ? '' : slot;
  }

  // ── ช่วงเวลา (Period tabs) ──
  selectPeriod(key: string) {
    this.activePeriod = key;
  }

  getSlotsForPeriod(key: string): string[] {
    const period = this.periods.find((p) => p.key === key);
    if (!period) return [];
    return this.timeSlots.filter((slot) => slot >= period.start && slot <= period.end);
  }

  get visibleSlots(): string[] {
    return this.getSlotsForPeriod(this.activePeriod);
  }

  // เลือก tab อัตโนมัติตามเวลาที่เลือกไว้ (ถ้ามี)
  private syncPeriodWithSelectedTime() {
    if (!this.bookingForm.BookingTime) return;
    const match = this.periods.find(
      (p) => this.bookingForm.BookingTime >= p.start && this.bookingForm.BookingTime <= p.end,
    );
    if (match) this.activePeriod = match.key;
  }

  // ── นับจำนวนคน: กันติดลบ + ตรวจสอบแบบเรียลไทม์ ──
  onGuestCountChange() {
    const a = Number(this.bookingForm.NumAdults);
    const c = Number(this.bookingForm.NumChildren);
    this.bookingForm.NumAdults = isNaN(a) || a < 0 ? 0 : Math.floor(a);
    this.bookingForm.NumChildren = isNaN(c) || c < 0 ? 0 : Math.floor(c);
  }

  incrementAdults() {
    this.bookingForm.NumAdults = (Number(this.bookingForm.NumAdults) || 0) + 1;
  }
  decrementAdults() {
    this.bookingForm.NumAdults = Math.max(0, (Number(this.bookingForm.NumAdults) || 0) - 1);
  }
  incrementChildren() {
    this.bookingForm.NumChildren = (Number(this.bookingForm.NumChildren) || 0) + 1;
  }
  decrementChildren() {
    this.bookingForm.NumChildren = Math.max(0, (Number(this.bookingForm.NumChildren) || 0) - 1);
  }

  get adultsInvalid(): boolean {
    return Number(this.bookingForm.NumAdults) < 1;
  }

  get childrenInvalid(): boolean {
    return Number(this.bookingForm.NumChildren) < 0;
  }

  // ข้อความแจ้งเตือนแบบเรียลไทม์ ตรวจตั้งแต่เริ่มกรอก ไม่ต้องรอกดปุ่ม
  get guestError(): string | null {
    const adults = Number(this.bookingForm.NumAdults);
    const children = Number(this.bookingForm.NumChildren);
    if (adults < 0 || children < 0) return 'จำนวนคนต้องไม่ติดลบ';
    if (!adults || adults < 1) return 'ต้องมีผู้ใหญ่อย่างน้อย 1 คน';
    return null;
  }

  get isDateTimeValid(): boolean {
    return !!this.bookingForm.BookingDate && !!this.bookingForm.BookingTime;
  }

  // สถานะฟอร์มโดยรวม ใช้ปิด/เปิดปุ่มยืนยันแบบเรียลไทม์
  get isFormValid(): boolean {
    return !this.guestError && this.isDateTimeValid;
  }

  loadTables() {
    this.tableService.getAlltables().subscribe({
      next: (response: Table[]) => {
        this.tables = response;
      },
      error: (err) => {
        console.error('โหลดข้อมูลไม่สำเร็จ:', err);
      },
    });
  }

  toggleTableSelection(table: Table) {
    if (table.table_Status !== 'ว่าง') return;
    const index = this.selectedTables.findIndex((t) => t.table_id === table.table_id);
    if (index > -1) {
      this.selectedTables.splice(index, 1);
    } else {
      this.selectedTables.push(table);
    }
    this.selectedTables.sort((a, b) =>
      a.table_Number.localeCompare(b.table_Number, undefined, {
        numeric: true,
        sensitivity: 'base',
      }),
    );
  }

  isSelected(table: Table): boolean {
    return this.selectedTables.some((t) => t.table_id === table.table_id);
  }

  getSelectedTableString(): string {
    if (this.selectedTables.length === 0) return '-';
    return this.selectedTables.map((t) => t.table_Number).join(', ');
  }

  openBookingModal() {
    if (this.selectedTables.length === 0) {
      alert('กรุณาเลือกโต๊ะก่อนดำเนินการ');
      return;
    }
    this.setMinDate();
    this.syncPeriodWithSelectedTime();
    this.showBookingModal = true;
  }

  closeBookingModal() {
    this.showBookingModal = false;
  }

  closePaymentModal() {
    this.showPaymentModal = false;
    this.promptPayQrUrl = '';
    this.transactionId = '';
  }

  closeWaitingModal() {
    this.showWaitingModal = false;
    this.paymentSuccess = false;
    this.qrUrl = '';
    this.bookingId = null;
    this.bookedTableNames = [];
  }

  sendToCustomerDisplay(qrCodeUrl: string | null = null) {
    const payload = {
      tableNumbers: this.getSelectedTableString(),
      items: [
        {
          name: `มัดจำการจอง (ผู้ใหญ่ ${this.bookingForm.NumAdults} / เด็ก ${this.bookingForm.NumChildren})`,
          quantity: 1,
          subTotal: this.depositAmount,
        },
      ],
      fineAmount: 0,
      discountName: 'ไม่มีโปรโมชั่น',
      grandTotal: this.depositAmount,
      qrData: qrCodeUrl,
      isPaidSuccess: false,
    };

    if (this.signalrService.sendToCustomerDisplay) {
      this.signalrService.sendToCustomerDisplay(payload).catch((err: any) => {
        console.warn('ไม่สามารถส่งข้อมูลไปยัง Display ได้:', err);
      });
    }
  }

  proceedToPayment() {
    // การันตีความถูกต้องอีกชั้น แม้ปุ่มจะถูกปิดไว้แล้วเมื่อฟอร์มไม่ผ่าน
    if (this.guestError) {
      alert(this.guestError);
      return;
    }
    if (!this.isDateTimeValid) {
      alert('กรุณาระบุวันและเวลาจอง');
      return;
    }
    const adults = Number(this.bookingForm.NumAdults) || 0;
    const children = Number(this.bookingForm.NumChildren) || 0;

    const combinedDateTime = `${this.bookingForm.BookingDate}T${this.bookingForm.BookingTime}:00`;

    const member = this.authService.getMember();
    if (!member) {
      alert('กรุณาเข้าสู่ระบบก่อน');
      return;
    }

    this.isLoading = true;
    const createPayload = {
      member_id: Number(member.id),
      table_ids: this.selectedTables.map((t) => t.table_id),
      booking_datetime: combinedDateTime,
      adult_count: adults,
      child_count: children,
    };

    // สร้างการจองก่อน
    this.bookingService.createBooking(createPayload).subscribe({
      next: (res: any) => {
        this.pendingBookingId = res.booking_id;
        this.bookedTableNames = res.tables || this.selectedTables.map((t) => t.table_Number);
        this.depositAmount = res.deposit_amount;

        // เมื่อจองสำเร็จ เรียกเจน QR Pay ทันที
        this.generatePaymentQr(res.booking_id);
      },
      error: (err) => {
        this.isLoading = false;
        alert('การจองล้มเหลว: ' + (err.error?.message || 'โปรดลองอีกครั้ง'));
      },
    });
  }

  // ฟังก์ชันสำหรับเจน QR (ปรับแก้รองรับ Response Data Format ทุกรูปแบบ)
  generatePaymentQr(bookingId: number) {
    this.paymentService.CreateQr(bookingId).subscribe({
      next: (res: any) => {
        if (res && res.qr_data) {
          try {
            let rawQr = res.qr_data;

            // ถ้ารับข้อมูลมาเป็น JSON String ให้ Parse ออกมาก่อน
            if (typeof rawQr === 'string' && (rawQr.startsWith('{') || rawQr.startsWith('['))) {
              const parsedData = JSON.parse(rawQr);
              rawQr =
                parsedData.data?.qr_url || parsedData.data?.qrImage || parsedData.qr_data || rawQr;
            }

            // จัดการใส่ Prefix base64 หากไม่ใช่อยู่ในรูปแบบ Image URL
            if (
              rawQr &&
              typeof rawQr === 'string' &&
              !rawQr.startsWith('http') &&
              !rawQr.startsWith('data:image')
            ) {
              this.promptPayQrUrl = `data:image/png;base64,${rawQr}`;
            } else {
              this.promptPayQrUrl = rawQr;
            }

            this.transactionId = res.transaction_id || '';
            this.depositAmount = Number(res.amount_pay) || this.depositAmount;

            this.isLoading = false;
            this.showBookingModal = false;
            this.showPaymentModal = true;

            // สั่งส่งข้อมูล QR ขึ้น Customer Display
            this.sendToCustomerDisplay(this.promptPayQrUrl);

            this.startAutoCheckStatus();
          } catch (e) {
            console.error('Parsing error:', e);
            alert('ข้อมูล QR Code ผิดพลาด');
            this.isLoading = false;
          }
        }
      },
      error: (err) => {
        this.isLoading = false;
        alert('ไม่สามารถสร้าง QR Code ได้: ' + (err.error?.message || 'โปรดลองอีกครั้ง'));
      },
    });
  }

  startAutoCheckStatus() {
    if (this.isPolling) return;
    this.isPolling = true;

    // ตั้งให้เช็คทุก 3 วินาที
    this.pollingTimer = setInterval(() => {
      if (!this.transactionId) return;

      this.paymentService.checkPaymentStatus(this.transactionId).subscribe({
        next: (result: any) => {
          if (result.status === 'success') {
            this.stopPolling();
            this.handlePaymentSuccess();
          }
        },
        error: (err) => {
          console.error('Polling error:', err);
        },
      });
    }, 3000);
  }

  handlePaymentSuccess() {
    this.bookingId = this.pendingBookingId;

    // อัพเดตสถานะ Booking เป็น Confirmed
    this.bookingService.updateBookingStatus(this.pendingBookingId!, 'Confirmed').subscribe({
      next: (res: any) => {
        this.bookingService.getBooking(this.pendingBookingId!).subscribe({
          next: (booking: any) => {
            this.qrUrl = res.qr_url || '';
            this.paymentSuccess = true;
            this.showPaymentModal = false;
            this.showWaitingModal = true;
            this.bookingId = this.pendingBookingId;
            this.selectedTables = [];
            this.bookingForm = {
              NumAdults: 0,
              NumChildren: 0,
              BookingDate: '',
              BookingTime: '',
            };
            this.loadTables();
          },
        });
      },
    });
  }

  confirmPayment() {
    if (!this.transactionId) {
      alert('ไม่พบข้อมูล Transaction');
      return;
    }

    this.isVerifying = true;

    this.paymentService.checkPaymentStatus(this.transactionId).subscribe({
      next: (result: any) => {
        this.isVerifying = false;

        if (result.status === 'pending') {
          alert('ยังไม่ได้ชำระเงิน กรุณาชำระเงินก่อน');
        } else if (result.status === 'success') {
          this.stopPolling();
          this.handlePaymentSuccess();
        }
      },
      error: (err) => {
        this.isVerifying = false;
        console.error(err);
        alert('เกิดข้อผิดพลาดในการตรวจสอบสถานะ');
      },
    });
  }
}
