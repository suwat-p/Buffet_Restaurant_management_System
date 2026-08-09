import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Constants } from '../../config/contants';

@Injectable({
  providedIn: 'root',
})
export class OrderService {
  constructor(
    private constants: Constants,
    private http: HttpClient,
  ) {}

  public PlaceOrder(payload: any): Observable<any> {
    try {
      const url = this.constants.API_ENDPOINT + '/Order/checkout';
      const response = this.http.post(url, payload);
      return response;
    } catch (error) {
      console.error('Error occurred while placing order:', error);
      throw error;
    }
  }
  public GetOrderPrice(billId: number): Observable<any> {
    try {
      const url = this.constants.API_ENDPOINT + `/Order/getBillPricedItems/${billId}`;
      const response = this.http.get(url);
      return response;
    } catch (error) {
      console.error('Error occurred while getting order price:', error);
      throw error;
    }
  }

  // 🍳 ดึงรายละเอียดตั๋วครัว (โต๊ะ / รายการอาหาร / จำนวน / QR สำหรับเสิร์ฟ) จาก Order_id
  public GetKitchenTicket(orderId: number): Observable<any> {
    try {
      const url = this.constants.API_ENDPOINT + `/Order/getKitchenTicket/${orderId}`;
      const response = this.http.get(url);
      return response;
    } catch (error) {
      console.error('Error occurred while getting kitchen ticket:', error);
      throw error;
    }
  }

  // 📲 ดึงโต๊ะ + รายการอาหาร สำหรับหน้า /serve-action

  public GetServeInfo(orderId: number): Observable<any> {
    try {
      const url = this.constants.API_ENDPOINT + `/Order/getServeInfo/${orderId}`;
      const response = this.http.post(url, {});
      return response;
    } catch (error) {
      console.error('Error occurred while getting serve info:', error);
      throw error;
    }
  }

  // 📲 เสิร์ฟกดยืนยันจากหน้า /serve-action หลังสแกน QR
  public ServeOrder(orderId: number): Observable<any> {
    try {
      const url = this.constants.API_ENDPOINT + `/Order/${orderId}/serve`;
      const response = this.http.post(url, {});
      return response;
    } catch (error) {
      console.error('Error occurred while marking order as serving:', error);
      throw error;
    }
  }
}
