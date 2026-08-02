import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Constants } from '../../config/contants';
import { Observable } from 'rxjs';
@Injectable({
  providedIn: 'root',
})
export class ManagerService {
  add(arg0: { severity: string; summary: string; detail: string }) {
    throw new Error('Method not implemented.');
  }
  constructor(
    private http: HttpClient,
    private constants: Constants,
  ) {}
  public getAllEmployees() {
    const url = this.constants.API_ENDPOINT + '/Manager/getAllEmployees';
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

  public getEmployeesNotApproved() {
    const url = this.constants.API_ENDPOINT + '/Manager/getEmployeesNotApproved';
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
  public approveEmployee(employeeId: number) {
    const url = this.constants.API_ENDPOINT + `/Manager/approveEmployee?empId=${employeeId}`;
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    console.log(url);
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      }),
    };
    const response = this.http.post<any>(url, {}, httpOptions);
    return response;
  }
  public rejectEmployee(employeeId: number) {
    const url = this.constants.API_ENDPOINT + `/Manager/rejectEmployee?empId=${employeeId}`;
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    console.log(url);
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      }),
    };
    const response = this.http.post<any>(url, {}, httpOptions);
    return response;
  }

  public updateWageStartTimeEndTimeEmp(payload: any): Observable<any> {
    const url = this.constants.API_ENDPOINT + '/Manager/updateWageStartTimeEndTimeEmp';
    const response = this.http.put(url, payload);
    return response;
  }
  public updateDepartmentEmp(payload: any): Observable<any> {
    const url = this.constants.API_ENDPOINT + '/Manager/updateDepartmentEmp';
    const response = this.http.put(url, payload);
    return response;
  }
  public updateStatusEmp(payload: any): Observable<any> {
    const url = this.constants.API_ENDPOINT + '/Manager/updateStatusEmp';
    const response = this.http.put(url, payload);
    return response;
  }
  public updateTypeEmp(payload: any): Observable<any> {
    const url = this.constants.API_ENDPOINT + '/Manager/updateTypeEmp';
    const response = this.http.put(url, payload);
    return response;
  }
  public getEmployeeSalaryReport(
    empId: number,
    startDate: string,
    endDate: string,
  ): Observable<any> {
    const url = `${this.constants.API_ENDPOINT}/Manager/getEmployeeSalaryReport?empId=${empId}&startDate=${startDate}&endDate=${endDate}`;
    const response = this.http.get(url);
    return response;
  }
}
