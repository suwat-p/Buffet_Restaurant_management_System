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
  billId?: number;
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

  public connect(billId?: number): Observable<OrderStatusUpdatedEvent> {
    if (!this.hubConnection) {
      const baseUrl = this.constants.API_ENDPOINT.replace(/\/api\/?$/, '');
      const hubUrl = `${baseUrl}/tableStatusHub`;

      this.hubConnection = new signalR.HubConnectionBuilder()
        .withUrl(hubUrl, { withCredentials: true })
        .withAutomaticReconnect()
        .build();

      this.hubConnection.on('OrderStatusUpdated', (data: any) => {
        console.log('⚡ SignalR Event [OrderStatusUpdated]:', data);
        const mappedEvent: OrderStatusUpdatedEvent = {
          orderId: Number(data.orderId ?? data.OrderId ?? data.order_Id),
          status: data.status ?? data.Status ?? data.orderStatus,
          billId: Number(data.billId ?? data.BillId),
        };
        this.statusUpdated$.next(mappedEvent);
      });

      this.hubConnection
        .start()
        .then(() => {
          console.log('SignalR OrderService Connected successfully.');
          if (billId) {
            this.joinBillRoom(billId);
          }
        })
        .catch((err) => {
          console.error('เชื่อมต่อ SignalR ไม่สำเร็จ:', err);
        });
    } else if (billId && this.hubConnection.state === signalR.HubConnectionState.Connected) {
      this.joinBillRoom(billId);
    }

    return this.statusUpdated$.asObservable();
  }

  //สั่งเข้า Room ของบิลเพื่อรับ Event Realtime
  public joinBillRoom(billId: number): void {
    if (this.hubConnection && this.hubConnection.state === signalR.HubConnectionState.Connected) {
      this.hubConnection.invoke('JoinBillRoom', billId.toString()).catch((err) => {
        console.error('JoinBillRoom Error:', err);
      });
    }
  }

  public disconnect(): void {
    if (this.hubConnection) {
      this.hubConnection.stop();
      this.hubConnection = undefined;
    }
  }

  public GetActiveOrdersByBill(billId: number): Observable<any[]> {
    const url = this.constants.API_ENDPOINT + `/Order/getActiveOrdersByBill/${billId}`;
    return this.http.get<any[]>(url);
  }
}
