import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Constants } from '../../config/contants';

@Injectable({
  providedIn: 'root',
})
export class OrderService {
  constructor(private constants: Constants,
    private http: HttpClient
  ) { }

  public PlaceOrder(payload: any): Observable<any> {
    try {
      const url = this.constants.API_ENDPOINT + '/Order/checkout';
      const response = this.http.post(url, payload);
      return response;
    }
    catch (error) {
      console.error('Error occurred while placing order:', error);
      throw error;
    }
  }
  public GetOrderPrice(billId: number): Observable<any> {
    try {
      const url = this.constants.API_ENDPOINT + `/Order/getBillPricedItems/${billId}`;
      const response = this.http.get(url);
      return response;
    }
    catch (error) {
      console.error('Error occurred while getting order price:', error);
      throw error;
    }
  }
}
