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

  selectTime(slot: string) {
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
        this.bookingList = activeBookings.map((b: any) => ({
          booking_id: b.booking_id || 0,
          tableNumbers: b.tables_Booked || [],
          childCount: b.child_Count || 0,
          adultCount: b.adult_Count || 0,
          date: this.formatDate(b.booking_DateTime),
          time: this.formatTime(b.booking_DateTime),
          status: this.mapStatus(b.booking_Status),
          qrUrl: b.qR_Url || b.qr_Url || b.QR_Url || this.loadQrFromStorage(b.booking_id),
          ConsoleLog: `Booking ID: ${b.booking_id}, QR URL: ${b.qR_Url || b.qr_Url || b.QR_Url}`,
        }));
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

    // สร้าง Object Date จาก String ที่ Backend ส่งมา
    const dateObj = new Date(dateTimeStr);

    // ตรวจสอบความถูกต้องของวันที่
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
    this.editFormData = {
      adultCount: booking.adultCount,
      childCount: booking.childCount,
      time: booking.time ? booking.time.substring(0, 5) : '',
    };
    this.showEditModal = true;
  }

  closeEditModal() {
    this.showEditModal = false;
    this.editingBookingId = null;
  }

  saveEditBooking() {
    if (!this.editingBookingId) return;

    this.isEditing = true;
    const payload = {
      adultCount: this.editFormData.adultCount,
      childCount: this.editFormData.childCount,
      time: this.editFormData.time,
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
    window.history.back();
  }

  goPreOrder() {
    this.router.navigate(['/PreOrder']);
  }
}
