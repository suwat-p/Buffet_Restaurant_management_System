import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { jwtDecode } from 'jwt-decode';
import { Constants } from '../../config/contants';
import { Employee } from '../../models/employee.model';
@Injectable({
  providedIn: 'root',
})
export class AuthService {
  constructor(
    private http: HttpClient,
    private constants: Constants,
  ) { }
  public registerEmployee(options?: any) {
    const url = this.constants.API_ENDPOINT + '/Auth/register-employee';
    const response = this.http.post<any>(url, options);
    return response;
  }

  public registerMember(options?: any) {
    const url = this.constants.API_ENDPOINT + '/Auth/register-member';
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
      }),
    };
    const response = this.http.post<any>(url, options, httpOptions);
    return response;
  }

  public loginEmployee(options?: any) {
    const url = this.constants.API_ENDPOINT + '/Auth/login-employee';
    const response = this.http.post<any>(url, options);
    return response;
  }

  public loginMember(options?: any) {
    const url = this.constants.API_ENDPOINT + '/Auth/login-member';
    const response = this.http.post<any>(url, options);
    return response;
  }

  public getMember() {
    let token: string | null = null;

    try {
      token = localStorage.getItem('token');
    } catch (e) { }
    if (!token) {
      try {
        token = sessionStorage.getItem('token');
      } catch (e) { }
    }

    if (token) {
      try {
        const decoded: any = jwtDecode(token);
        return { id: decoded.sub, fullname: decoded.name };
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  public getEmployeebyId(empId: number) {
    const url = this.constants.API_ENDPOINT + '/Manager/getEmployeeById?empId=' + empId;
    const response = this.http.get<Employee[]>(url);
    return response;
  }
  public sendOtp(email: string) {
    const url = this.constants.API_ENDPOINT + '/Auth/send-otp?email=' + email;
    const response = this.http.post<any>(url, email);
    return response;
  }
  public verifyOtp(email: string, otp: string) {
    const url = this.constants.API_ENDPOINT + '/Auth/verify-otp';
    const payload = {
      email: email,
      otpCode: otp
    };
    const response = this.http.post<any>(url, payload);
    return response;
  }
  public resetPassword(email: string, newPassword: string) {
    const url = this.constants.API_ENDPOINT + '/Auth/reset-password';
    const payload = { email: email, newPassword: newPassword };
    const response = this.http.post<any>(url, payload);
    return response;
  }
}
