import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Constants } from '../../config/contants';

export interface ShopLocation {
  latitude: number;
  longitude: number;
}

@Injectable({
  providedIn: 'root',
})
export class ShopLocationService {
  constructor(
    private http: HttpClient,
    private constants: Constants,
  ) {}

  public getLocation(): Observable<ShopLocation> {
    const url = this.constants.API_ENDPOINT + '/ManagerLocation/get-location';
    return this.http.get<ShopLocation>(url);
  }

  public updateLocation(latitude: number, longitude: number): Observable<any> {
    const url = this.constants.API_ENDPOINT + '/ManagerLocation/set-location';
    return this.http.post(url, { latitude, longitude });
  }
}
