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
    return this.http.post<any>(url, options);
  }

  public registerMember(options?: any) {
    const url = this.constants.API_ENDPOINT + '/Auth/register-member';
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
      }),
    };
    return this.http.post<any>(url, options, httpOptions);
  }

  public loginEmployee(options?: any) {
    const url = this.constants.API_ENDPOINT + '/Auth/login-employee';
    return this.http.post<any>(url, options);
  }

  public loginMember(options?: any) {
    const url = this.constants.API_ENDPOINT + '/Auth/login-member';
    return this.http.post<any>(url, options);
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
        return {
          id: decoded.sub,
          fullname: decoded.name,
          role:
            decoded.role ||
            decoded['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ||
            decoded.position ||
            decoded.role_id,
        };
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  //  เพิ่มฟังก์ชันตรวจสอบบทบาทพนักงานเสิร์ฟ
  public isServer(): boolean {
    const member = this.getMember();
    if (!member || !member.role) return false;

    const roleUpper = String(member.role).toUpperCase();
    return (
      roleUpper === 'SERVER' ||
      roleUpper === 'SERVE' ||
      roleUpper === 'พนักงานเสิร์ฟ' ||
      member.role === 3
    );
  }

  public getEmployeebyId(empId: number) {
    const url = this.constants.API_ENDPOINT + '/Manager/getEmployeeById?empId=' + empId;
    return this.http.get<Employee[]>(url);
  }

  public sendOtp(email: string) {
    const url = this.constants.API_ENDPOINT + '/Auth/send-otp?email=' + email;
    return this.http.post<any>(url, email);
  }

  public verifyOtp(email: string, otp: string) {
    const url = this.constants.API_ENDPOINT + '/Auth/verify-otp';
    const payload = { email: email, otpCode: otp };
    return this.http.post<any>(url, payload);
  }

  public resetPassword(email: string, newPassword: string) {
    const url = this.constants.API_ENDPOINT + '/Auth/reset-password';
    const payload = { email: email, newPassword: newPassword };
    return this.http.post<any>(url, payload);
  }
  public editProfileEmployee(formData: FormData) {
    const url = this.constants.API_ENDPOINT + '/Auth/edit-profile-employee';
    return this.http.put<any>(url, formData);
  }
}
