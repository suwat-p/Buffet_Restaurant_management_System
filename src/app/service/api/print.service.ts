import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Constants } from '../../config/contants';
@Injectable({
  providedIn: 'root',
})
export class PrintService {
  constructor(private constants: Constants, private http: HttpClient) {}
  printReceipt(billID:number) {
    const url = `${this.constants.API_ENDPOINT}/Print/print/${billID}`;
    return this.http.get(url);
  }
}
