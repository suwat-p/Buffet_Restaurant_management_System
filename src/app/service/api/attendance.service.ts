import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Constants } from '../../config/contants';

export interface ClockInOutRequest {
  employeeId: number;
  latitude: number;
  longitude: number;
}

export interface AttendanceRecord {
  employeeId: number;
  employeeName: string;
  clockInTime: string;
  clockOutTime: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class AttendanceService {
  constructor(
    private http: HttpClient,
    private constants: Constants,
  ) {}

  public clockIn(request: ClockInOutRequest): Observable<any> {
    const url = this.constants.API_ENDPOINT + '/Attendance/clock-in';
    return this.http.post(url, request);
  }

  public clockOut(request: ClockInOutRequest): Observable<any> {
    const url = this.constants.API_ENDPOINT + '/Attendance/clock-out';
    return this.http.post(url, request);
  }

  public getLogs(): Observable<any> {
    const url = this.constants.API_ENDPOINT + '/Attendance/logs';
    return this.http.get(url);
  }
}
