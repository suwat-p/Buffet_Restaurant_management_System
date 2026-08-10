import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
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

  // 2. ดึงรายการในตะกร้า (ตาม Table ID)
  public getCartItems(tableId?: number, bookingId?: number) {
    // กำหนด URL พื้นฐาน
    let url = this.constants.API_ENDPOINT + `/Cart/get-items/${tableId ?? 0}`;
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');

    let params = new HttpParams();
    if (bookingId) {
      params = params.set('bookingId', bookingId.toString());
    }

    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      }),
      params: params,
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
