import { Injectable } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { Subject } from 'rxjs';
import { Constants } from '../../config/contants';

@Injectable({
  providedIn: 'root',
})
export class SignalrService {
  public hubConnection!: signalR.HubConnection;

  public tableStatus$ = new Subject<any>();
  public resConfig$ = new Subject<any>();
  public resImageUpdate$ = new Subject<void>();

  public billUpdated$ = new Subject<any>();
  public orderUpdated$ = new Subject<any>();
  // 🟢 เพิ่ม Subject สำหรับรองรับการอัปเดตข้อมูลลูกค้าเรียลไทม์
  public customerUpdated$ = new Subject<any>();

  // 🍳 ออเดอร์ใหม่เข้ามา (ยิงจาก OrderController ตอน checkout สำเร็จ) — payload คือ Order_id
  public newKitchenOrder$ = new Subject<number>();
  // 🍽️ สถานะออเดอร์เปลี่ยน (เช่น เสิร์ฟสแกน QR แล้วเปลี่ยนเป็น "กำลังนำเสิร์ฟ")
  public orderStatusUpdated$ = new Subject<any>();

  constructor(private constants: Constants) {
    this.initConnection();
  }

  private initConnection() {
    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(this.constants.URL_signalR + 'tableStatusHub')
      .withAutomaticReconnect()
      .build();

    this.registerOnEvents();
    this.start();
  }

  private registerOnEvents() {
    // 1. สถานะโต๊ะ
    this.hubConnection.on('UpdateTable', (data) => {
      console.log('SignalR [UpdateTable]:', data);
      this.tableStatus$.next(data);
    });

    // 2. ข้อมูล Config ร้าน (ราคา/ค่าปรับ)
    this.hubConnection.on('UpdateResConfig', (data) => {
      console.log('SignalR [UpdateResConfig]:', data);
      this.resConfig$.next(data);
    });

    // 3. อัปเดตรูปภาพ
    this.hubConnection.on('UpdateResImage', () => {
      console.log('SignalR [UpdateResImage]');
      this.resImageUpdate$.next();
    });

    // 4. การอัปเดตบิล (เช่น เช็คบิล, เปลี่ยนส่วนลด, เปลี่ยนจำนวนคน)
    this.hubConnection.on('UpdateBill', (data) => {
      console.log('SignalR [UpdateBill]:', data);
      this.billUpdated$.next(data);
    });

    // 5. การอัปเดตรายการอาหารที่สั่งเพิ่ม
    this.hubConnection.on('UpdateOrder', (data) => {
      console.log('SignalR [UpdateOrder]:', data);
      this.orderUpdated$.next(data);
    });

    // 🟢 6. การอัปเดตข้อมูลลูกค้า (จำนวนลูกค้า / ข้อมูลสมาชิก)
    this.hubConnection.on('UpdateCustomer', (data) => {
      console.log('SignalR [UpdateCustomer]:', data);
      this.customerUpdated$.next(data);
    });

    // 🍳 7. ออเดอร์ใหม่ — backend ส่งมาแค่ Order_id เฉยๆ ฝั่งที่ subscribe ต้องยิง
    // OrderService.GetKitchenTicket(orderId) ต่อเองเพื่อได้รายละเอียดเต็ม
    this.hubConnection.on('NewKitchenOrder', (orderId) => {
      console.log('SignalR [NewKitchenOrder]:', orderId);
      this.newKitchenOrder$.next(orderId);
    });

    // 🍽️ 8. สถานะออเดอร์เปลี่ยน (เช่น เสิร์ฟกดยืนยันจากหน้า /serve-action)
    this.hubConnection.on('OrderStatusUpdated', (data) => {
      console.log('SignalR [OrderStatusUpdated]:', data);
      this.orderStatusUpdated$.next(data);
    });
  }

  // Helper method กรณีต้องการดักจับ event แบบไดนามิกโดยตรง
  public on(eventName: string, callback: (data: any) => void) {
    if (this.hubConnection) {
      this.hubConnection.on(eventName, callback);
    }
  }
  public sendToCustomerDisplay(data: any): Promise<void> {
    if (this.hubConnection) {
      return this.hubConnection.invoke('SendToCustomerDisplay', data);
    }
    return Promise.reject('SignalR connection is not established.');
  }

  public clearCustomerDisplay(): Promise<void> {
    if (this.hubConnection) {
      return this.hubConnection.invoke('ClearCustomerDisplay');
    }
    return Promise.reject('SignalR connection is not established.');
  }
  private async start() {
    try {
      await this.hubConnection.start();
      console.log('SignalR: Connected');
    } catch (err) {
      console.error('SignalR: Error while starting', err);
    }
  }
}
