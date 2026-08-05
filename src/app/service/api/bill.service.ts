import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Constants } from '../../config/contants';
import { Bill } from '../../models/bill.model';
@Injectable({
  providedIn: 'root',
})
export class BillService {
  constructor(
    private http: HttpClient,
    private constants: Constants,
  ){}
  public createWalkInBill(payload: any): Observable<any> {
      return this.http.post(`${this.constants.API_ENDPOINT}/Bill/walk-in`, payload);
    }
  public getBill(){
    const url = `${this.constants.API_ENDPOINT}/Bill/getBill`;
    return this.http.get<Bill[]>(url)
  }
  public getReceipt(){
    const url = `${this.constants.API_ENDPOINT}/Bill/getReceipt`;
    return this.http.get<Bill[]>(url)
  }
  public updateBill(billId: number, payload: any): Observable<any> {
    const url = `${this.constants.API_ENDPOINT}/Bill/update/${billId}`;
    return this.http.put(url, payload);
  }
  public deleteBill(billId: number): Observable<any> {
    const url = `${this.constants.API_ENDPOINT}/Bill/delete/${billId}`;
    return this.http.delete(url);
  }
  public closeBill(billId: number, payload: any): Observable<any> {
    const url = `${this.constants.API_ENDPOINT}/Bill/close/${billId}`;
    return this.http.put(url, payload);
  }
  public getBillById(billId: number): Observable<any> {
    const url = `${this.constants.API_ENDPOINT}/Bill/getBillById/${billId}`;
    return this.http.get(url);
  }
  public getBillByTableId(tableId: number): Observable<any> {
    const url = `${this.constants.API_ENDPOINT}/Bill/active-by-table/${tableId}`;
    return this.http.get(url);
  }
  public createBillfromBooking(bookingid: number, payload: any): Observable<any> {
    const url = `${this.constants.API_ENDPOINT}/Bill/CreateBillFromBooking/${bookingid}`;
    return this.http.post(url, payload);
  }
}
