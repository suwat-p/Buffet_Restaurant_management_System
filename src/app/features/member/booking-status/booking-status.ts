import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { BookingService } from '../../../service/api/booking.service';
import { AuthService } from '../../../service/api/auth.service';
import { SignalrService } from '../../../service/api/signalr.service';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';

interface BookingDetail {
  booking_id: number;
  tableNumbers: string[];
  childCount: number;
  adultCount: number;

  date: string;
  time: string;
  status: string;
  qrUrl: SafeUrl | string;
  rawDateTime: string;
}

@Component({
  selector: 'app-booking-status',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './booking-status.html',
  styleUrl: './booking-status.scss',
})
export class BookingStatus implements OnInit {
  bookingList: BookingDetail[] = [];
  activeQrBookingId: number | null = null;

  loading = false;
  errorMessage = '';

  showCheckInSuccessAlert = false;

  showEditModal = false;
  isEditing = false;
  editingBookingId: number | null = null;
  editFormData = {
    adultCount: 0,
    childCount: 0,
    time: '',
  };

  // วันที่ของ booking ที่กำลังแก้ไข (yyyy-MM-dd) ใช้เช็คว่าเวลาที่เลือกเป็นอดีตหรือไม่
  editBookingDate: string = '';

  availableTimeSlots: string[] = [];

  constructor(
    private bookingService: BookingService,
    private authService: AuthService,
    private router: Router,
    private signalrService: SignalrService,
    private sanitizer: DomSanitizer,
  ) {}

  ngOnInit() {
    this.loadLatestBooking();
    this.generateTimeSlots();
    this.signalrService.on('BookingStatusUpdated', (data: any) => {
      const newStatus = data.status ? data.status.toLowerCase() : '';

      if (newStatus === 'completed' || newStatus === 'checkedin') {
        if (this.activeQrBookingId === data.bookingId) {
          this.activeQrBookingId = null;
        }

        this.bookingList = this.bookingList.filter((b) => b.booking_id !== data.bookingId);

        this.showSuccessAlert();
      } else {
        this.loadLatestBooking();
      }
    });
  }

  generateTimeSlots() {
    const slots = [];
    for (let hour = 10; hour <= 21; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
      slots.push(`${hour.toString().padStart(2, '0')}:30`);
    }
    this.availableTimeSlots = slots;
  }

  // แปลง Date เป็น yyyy-MM-dd ตามเวลา "ท้องถิ่น" ห้ามใช้ toISOString()
  // เพราะ toISOString() แปลงเป็น UTC ก่อน ถ้าเวลาปัจจุบัน/เวลาจองเป็นช่วงเช้ามืด (00:00-06:59 ในโซนไทย UTC+7)
  // จะถอยวันที่ผิดไป 1 วัน ทำให้ logic เทียบ "วันนี้" พังและปิดปุ่มเวลาทั้งหมดโดยไม่ตั้งใจ
  private toLocalDateStr(d: Date): string {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  private getTodayStr(): string {
    return this.toLocalDateStr(new Date());
  }

  // เวลาที่เร็วที่สุดที่จองได้ (ตอนนี้ + 30 นาที) ให้ตรงกับ logic หน้าจอง (booking.ts)
  private getMinTimeStr(): string {
    const later = new Date(Date.now() + 30 * 60 * 1000);
    const hh = String(later.getHours()).padStart(2, '0');
    const mm = String(later.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  }

  // ห้ามแก้ไปเวลาที่ผ่านไปแล้ว: ใช้วันที่ของ booking เดิมเทียบกับวันนี้ + เวลาขั้นต่ำแบบเดียวกับหน้าจอง
  isEditSlotDisabled(slot: string): boolean {
    const today = this.getTodayStr();
    const bookingDate = this.editBookingDate || today;
    if (bookingDate < today) return true;
    if (bookingDate === today) return slot < this.getMinTimeStr();
    return false;
  }

  selectTime(slot: string) {
    if (this.isEditSlotDisabled(slot)) return;
    this.editFormData.time = slot;
  }

  showSuccessAlert() {
    this.showCheckInSuccessAlert = true;
    setTimeout(() => {
      this.showCheckInSuccessAlert = false;
    }, 3000);
  }

  loadLatestBooking() {
    const member = this.authService.getMember();
    if (!member) {
      this.errorMessage = 'กรุณาเข้าสู่ระบบก่อน';
      return;
    }

    this.loading = true;
    this.bookingService.getByMember(Number(member.id)).subscribe({
      next: (response: any) => {
        this.loading = false;

        let resArray: any[] = [];
        if (Array.isArray(response)) {
          resArray = response;
        } else if (response && Array.isArray(response.data)) {
          resArray = response.data;
        }

        const activeBookings = resArray.filter((b: any) => {
          const status = (b.booking_Status || '').toLowerCase();
          return status === 'confirmed';
        });

        if (activeBookings.length === 0) {
          this.errorMessage = 'ไม่มีการจองที่รอดำเนินการ';
          this.bookingList = [];
          return;
        }

        this.errorMessage = '';
        this.bookingList = activeBookings.map((b: any) => {
          // backend อาจส่งชื่อ field มาไม่ตรง casing เป๊ะ ๆ เช่น booking_datetime (ตัวเล็ก)
          // ถ้าไม่กันไว้ วันเวลาจะกลายเป็น undefined แล้วขึ้น "-" ทุกครั้ง
          const rawDateTime =
            b.booking_DateTime ||
            b.booking_datetime ||
            b.Booking_DateTime ||
            b.BookingDateTime ||
            '';

          return {
            booking_id: b.booking_id || 0,
            tableNumbers: b.tables_Booked || [],
            childCount: b.child_Count || 0,
            adultCount: b.adult_Count || 0,
            date: this.formatDate(rawDateTime),
            time: this.formatTime(rawDateTime),
            status: this.mapStatus(b.booking_Status),
            qrUrl: b.qR_Url || b.qr_Url || b.QR_Url || this.loadQrFromStorage(b.booking_id),
            rawDateTime,
          };
        });
      },
      error: (err: any) => {
        this.loading = false;
        this.errorMessage = err.error?.message || 'โหลดข้อมูลไม่สำเร็จ';
      },
    });
  }

  loadQrFromStorage(bookingId: number): SafeUrl | string {
    try {
      const raw = localStorage.getItem(`qr_${bookingId}`);
      if (!raw) return '';
      let url: string;
      try {
        url = JSON.parse(raw);
      } catch {
        url = raw;
      }
      if (!url) return '';
      return this.sanitizer.bypassSecurityTrustUrl(url);
    } catch (e) {
      return '';
    }
  }

  formatDate(dateTimeStr: string): string {
    if (!dateTimeStr || dateTimeStr.startsWith('0001')) return '-';

    const dateObj = new Date(dateTimeStr);

    if (isNaN(dateObj.getTime())) return '-';

    return dateObj.toLocaleDateString('th-TH', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  formatTime(dateTimeStr: string): string {
    if (!dateTimeStr || dateTimeStr.startsWith('0001')) return '-';

    const dateObj = new Date(dateTimeStr);

    if (isNaN(dateObj.getTime())) return '-';

    return (
      dateObj.toLocaleTimeString('th-TH', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }) + ' น.'
    );
  }

  mapStatus(status: string): string {
    if (!status) return 'ไม่มีสถานะ';
    switch (status.toLowerCase()) {
      case 'pending':
        return 'รอชำระเงิน';
      case 'confirmed':
        return 'จองสำเร็จ';
      case 'completed':
        return 'เช็คอินแล้ว';
      case 'cancelled':
        return 'ยกเลิกแล้ว';
      default:
        return status;
    }
  }

  toggleQrModal(bookingId: number | null) {
    this.activeQrBookingId = bookingId;
  }

  onEditBooking(booking: BookingDetail) {
    this.editingBookingId = booking.booking_id;

    const dateObj = booking.rawDateTime ? new Date(booking.rawDateTime) : null;
    this.editBookingDate = dateObj && !isNaN(dateObj.getTime()) ? this.toLocalDateStr(dateObj) : '';

    this.editFormData = {
      adultCount: booking.adultCount,
      childCount: booking.childCount,
      time: booking.time && booking.time !== '-' ? booking.time.substring(0, 5) : '',
    };
    this.showEditModal = true;
  }

  closeEditModal() {
    this.showEditModal = false;
    this.editingBookingId = null;
    this.editBookingDate = '';
  }

  saveEditBooking() {
    if (!this.editingBookingId) return;

    const adults = Number(this.editFormData.adultCount) || 0;
    const children = Number(this.editFormData.childCount) || 0;

    if (adults < 1) {
      alert('ต้องมีผู้ใหญ่อย่างน้อย 1 คน');
      return;
    }
    if (children < 0) {
      alert('จำนวนเด็กต้องไม่ติดลบ');
      return;
    }
    if (!this.editFormData.time) {
      alert('กรุณาเลือกเวลาที่ต้องการแก้ไข');
      return;
    }
    if (this.isEditSlotDisabled(this.editFormData.time)) {
      alert('ไม่สามารถแก้ไขไปยังเวลาที่ผ่านไปแล้วได้ กรุณาเลือกเวลาที่ยังไม่ถึง');
      return;
    }

    this.isEditing = true;

    // 🟢 รวม วันที่ (YYYY-MM-DD) + เวลา (HH:mm) เข้าด้วยกัน ให้เป็น ISO DateTime string
    // ตัวอย่าง: "2026-08-28T18:00:00"
    const updatedDateTime = `${this.editBookingDate}T${this.editFormData.time}:00`;

    // 🟢 ส่ง payload ในชื่อฟิลด์ที่ตรงกับ C# DTO (Booking_DateTime)
    const payload = {
      AdultCount: adults,
      ChildCount: children,
      Booking_DateTime: updatedDateTime,
    };

    this.bookingService.updateBooking(this.editingBookingId, payload).subscribe({
      next: () => {
        alert('อัปเดตข้อมูลการจองสำเร็จ');
        this.isEditing = false;
        this.closeEditModal();
        this.loadLatestBooking();
      },
      error: (err) => {
        this.isEditing = false;
        if (err.status === 409) {
          alert('เวลาใหม่ที่คุณเลือก มีคิวอื่นจองไปแล้ว กรุณาเลือกเวลาอื่นครับ');
        } else {
          alert('เกิดข้อผิดพลาดในการอัปเดต: ' + (err.error?.message || 'กรุณาลองใหม่'));
        }
      },
    });
  }
  onCancelBooking(booking: BookingDetail) {
    const confirmDelete = confirm(`ยืนยันที่จะยกเลิกการจอง #${booking.booking_id}?`);
    if (!confirmDelete) return;

    this.bookingService.cancelBooking(booking.booking_id).subscribe({
      next: () => {
        try {
          localStorage.removeItem(`qr_${booking.booking_id}`);
        } catch (e) {}
        alert('ยกเลิกการจองสำเร็จ');
        this.loadLatestBooking();
      },
      error: (err: any) => {
        alert('ยกเลิกไม่สำเร็จ: ' + (err.error?.message || 'กรุณาลองใหม่'));
      },
    });
  }

  goBack() {
    this.router.navigate(['/Booking']);
  }

  goPreOrder(booking: BookingDetail) {
    this.router.navigate(['/PreOrder'], {
      queryParams: { bookingId: booking.booking_id },
    });
  }
}
