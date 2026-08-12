import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Constants } from '../../config/contants'; // ตรวจสอบ path ให้ตรงกับเครื่องคุณ

@Injectable({
  providedIn: 'root',
})
export class CartService {
  constructor(
    private http: HttpClient,
    private constants: Constants,
  ) {}

  // 1. เพิ่มรายการลงตะกร้า
  public addToCart(data: any) {
    const url = this.constants.API_ENDPOINT + '/Cart/add-item';
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');

    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`, // ส่ง Token เผื่อในอนาคตต้องเช็คสิทธิ์
      }),
    };

    const response = this.http.post<any>(url, data, httpOptions);
    return response;
  }

  // 2. ดึงรายการในตะกร้า
  // - ถ้ามี bookingId (สั่งล่วงหน้า) -> ยิงไปที่ endpoint get-items-by-booking/{bookingId}
  // - ถ้าไม่มี bookingId (สั่งหน้าร้าน) -> ยิงไปที่ endpoint get-items/{tableId} ตามเดิม
  public getCartItems(tableId?: number, bookingId?: number) {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');

    const url = bookingId
      ? this.constants.API_ENDPOINT + `/Cart/get-items-by-booking/${bookingId}`
      : this.constants.API_ENDPOINT + `/Cart/get-items/${tableId ?? 0}`;

    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      }),
    };

    return this.http.get<any>(url, httpOptions);
  }
  public deleteItem(cartItemId: number) {
    const url = this.constants.API_ENDPOINT + `/Cart/delete-item/${cartItemId}`;
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      }),
    };
    return this.http.delete<any>(url, httpOptions);
  }
  // 3. ยืนยันการสั่งอาหาร (Place Order)
  public placeOrder(cartId: number) {
    const url = this.constants.API_ENDPOINT + `/Cart/place-order/${cartId}`;
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');

    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      }),
    };

    const response = this.http.post<any>(url, {}, httpOptions);
    return response;
  }
}
