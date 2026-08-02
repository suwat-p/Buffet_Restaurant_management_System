import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Constants } from '../../config/contants';

@Injectable({ providedIn: 'root' })
export class BookingService {
  constructor(
    private http: HttpClient,
    private constants: Constants,
  ) {}

  createBooking(payload: any): Observable<any> {
    return this.http.post(`${this.constants.API_ENDPOINT}/Booking/create`, payload);
  }

  getBooking(id: number): Observable<any> {
    return this.http.get(`${this.constants.API_ENDPOINT}/Booking/${id}`);
  }

  getByMember(memberId: number): Observable<any> {
    return this.http.get(`${this.constants.API_ENDPOINT}/Booking/member/${memberId}`);
  }

  cancelBooking(bookingId: number): Observable<any> {
    return this.http.delete(`${this.constants.API_ENDPOINT}/Booking/${bookingId}`);
  }
  updateBooking(bookingId: number, data: any) {
    return this.http.put(`${this.constants.API_ENDPOINT}/Booking/update/${bookingId}`, data);
  }
  updateBookingStatus(bookingId: number, status: string): Observable<any> {
    return this.http.patch(`${this.constants.API_ENDPOINT}/Booking/${bookingId}/status`, {
      booking_Status: status,
    });
  }
  getCheckinInfo(bookingId: number, tableId: number): Observable<any> {
    return this.http.get(`${this.constants.API_ENDPOINT}/Booking/checkin-info`, {
      params: {
        bookingId: bookingId.toString(),
        tableId: tableId.toString(),
      },
    });
  }
confirmCheckin(payload: any): Observable<any> {
  return this.http.post(`${this.constants.API_ENDPOINT}/Booking/checkin`, payload);
}
}
