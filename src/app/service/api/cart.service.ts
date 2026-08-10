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

  // 2. ดึงรายการในตะกร้า (ตาม Table ID)
  public getCartItems(tableId: number) {
    const url = this.constants.API_ENDPOINT + `/Cart/get-items/${tableId}`;
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');

    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      }),
    };

    const response = this.http.get<any>(url, httpOptions);
    return response;
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
