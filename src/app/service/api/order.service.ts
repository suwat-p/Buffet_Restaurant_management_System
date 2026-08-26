import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import * as signalR from '@microsoft/signalr';
import { Constants } from '../../config/contants';

export interface OrderStatusItem {
  menuId: number;
  menuName: string;
  quantity: number;
}

export interface OrderStatusResponse {
  orderId: number;
  orderStatus: string;
  items: OrderStatusItem[];
}

export interface OrderStatusUpdatedEvent {
  orderId: number;
  status: string;
}

@Injectable({
  providedIn: 'root',
})
export class OrderService {
  private hubConnection?: signalR.HubConnection;
  private statusUpdated$ = new Subject<OrderStatusUpdatedEvent>();

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

  // 📡 ดึงสถานะ + รายการสินค้าปัจจุบัน สำหรับหน้า Track Order ของลูกค้า (เรียกครั้งเดียวตอนโหลดหน้า)
  public GetOrderStatus(orderId: number): Observable<OrderStatusResponse> {
    try {
      const url = this.constants.API_ENDPOINT + `/Order/getOrderStatus/${orderId}`;
      const response = this.http.get<OrderStatusResponse>(url);
      return response;
    } catch (error) {
      console.error('Error occurred while getting order status:', error);
      throw error;
    }
  }

  // 📡 เชื่อมต่อ SignalR แล้วคืน Observable ที่ยิงทุกครั้งที่มีการอัปเดตสถานะ (ของ order ไหนก็ได้)
  // ผู้เรียกต้อง filter เอาเองว่าเป็น orderId ที่ตัวเองสนใจหรือไม่
  public connect(): Observable<OrderStatusUpdatedEvent> {
    if (!this.hubConnection) {
      // Hub ถูก map ไว้ที่ root ("/tableStatusHub") ไม่ได้อยู่ใต้ "/api" ตาม Program.cs
      // จึงตัด "/api" ท้าย API_ENDPOINT ออกก่อนต่อ hub
      const baseUrl = this.constants.API_ENDPOINT.replace(/\/api\/?$/, '');
      const hubUrl = `${baseUrl}/tableStatusHub`;

      this.hubConnection = new signalR.HubConnectionBuilder()
        .withUrl(hubUrl, { withCredentials: true })
        .withAutomaticReconnect()
        .build();

      this.hubConnection.on('OrderStatusUpdated', (payload: OrderStatusUpdatedEvent) => {
        this.statusUpdated$.next(payload);
      });

      this.hubConnection.start().catch((err) => {
        console.error('เชื่อมต่อ SignalR ไม่สำเร็จ:', err);
      });
    }

    return this.statusUpdated$.asObservable();
  }

  public disconnect(): void {
    this.hubConnection?.stop();
    this.hubConnection = undefined;
  }

  public GetActiveOrdersByBill(billId: number): Observable<any[]> {
    try {
      const url = this.constants.API_ENDPOINT + `/Order/getActiveOrdersByBill/${billId}`;
      return this.http.get<any[]>(url);
    } catch (error) {
      console.error('Error occurred while getting active orders by bill:', error);
      throw error;
    }
  }
}
