import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Constants } from '../../config/contants';

@Injectable({
  providedIn: 'root',
})
export class PaymentService {
  constructor(
    private http: HttpClient,
    private constants: Constants,
  ) { }

  CreateQr(bookingId: number): Observable<any> {
    const url = `${this.constants.API_ENDPOINT}/Payment/generate-qr`;
    return this.http.post(url, { bookingId: bookingId });
  }
  checkPaymentStatus(transactionId: string): Observable<any> {
    const url = `${this.constants.API_ENDPOINT}/Payment/check-status`;
    return this.http.post(url, JSON.stringify(transactionId), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
  CreateCheckoutQr(billId: number, amount: number): Observable<any> {
    const url = `${this.constants.API_ENDPOINT}/Payment/generate-checkout-qr`;
    return this.http.post(url, { BillId: billId, TotalAmount: amount });
  }
  verifyPayment(billId: number, transactionId: string): Observable<any> {
    const url = `${this.constants.API_ENDPOINT}/Payment/verify-payment`;
    const payload = {
      billId: billId,
      transactionId: transactionId
    };

    return this.http.post(url, payload);
  }
  updatePaymentMethod(billId: number, payload: any): Observable<any> {
    const url = `${this.constants.API_ENDPOINT}/Payment/update-payment-method/${billId}`;
    return this.http.put(url, payload);
  }
}
