import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { jwtDecode } from 'jwt-decode'; // นำเข้า jwt-decode
import { MessageService } from 'primeng/api';
import { Toast } from 'primeng/toast';
import { AuthService } from '../../service/api/auth.service';

@Component({
  selector: 'app-login-employee',
  imports: [CommonModule, MatIconModule, FormsModule, Toast],
  providers: [MessageService],
  templateUrl: './login-employee.html',
  styleUrl: './login-employee.scss',
})
export class LoginEmployee implements OnInit {
  constructor(
    private authService: AuthService,
    private http: HttpClient,
    private messageService: MessageService,
    private router: Router,
  ) {}

  email: string = '';
  password: string = '';
  phone: string = '';
  rememberMe: boolean = false;

  ngOnInit() {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');

    if (token) {
      try {
        // ใช้ jwtDecode ถอดรหัส Token
        const decoded: any = jwtDecode(token);
        const role = decoded.role;
        console.log('Role จาก Token (ngOnInit):', role);

        if (role) {
          this.navigateByRole(role);
        }
      } catch (error) {
        console.error('Token ไม่ถูกต้อง หรือหมดอายุ', error);
        localStorage.removeItem('token');
        sessionStorage.removeItem('token');
      }
    }
  }

  onLogin() {
    const forms = new FormData();
    forms.append('Phone', this.phone);
    forms.append('Password', this.password);

    this.authService.loginEmployee(forms).subscribe(
      (res: any) => {
        console.log(res);

        const token = res.token;
        let userRole = '';

        try {
          // ใช้ jwtDecode ถอดรหัส Token จาก Response ทันที
          const decoded: any = jwtDecode(token);
          userRole = decoded.role;
          console.log('Role จาก Token (onLogin):', userRole);
        } catch (error) {
          console.error('ไม่สามารถถอดรหัส Token ได้:', error);
        }

        if (this.rememberMe) {
          localStorage.setItem('token', token);
          if (userRole) localStorage.setItem('role', userRole);
        } else {
          sessionStorage.setItem('token', token);
          if (userRole) sessionStorage.setItem('role', userRole);
        }

        this.messageService.add({
          severity: 'success',
          summary: 'Login Successful',
          detail: 'กำลังพาคุณเข้าสู่ระบบ...',
        });

        setTimeout(() => {
          this.navigateByRole(userRole);
        }, 1500);
      },
      (err) => {
        const errorMessage = err.error?.message || 'An error occurred during login.';
        console.log(err);
        this.messageService.add({
          severity: 'error',
          summary: 'Login Failed',
          detail: errorMessage,
        });
      },
    );
  }

  // จัดการ Routing ตาม Role
  private navigateByRole(role: string) {
    let targetRoute = '';

    // เช็ค role แบบตัดช่องว่างออก
    switch (role?.trim()) {
      case 'เจ้าของร้าน':
        targetRoute = '/Dashboard';
        break;
      case 'พนักงานครัว':
        targetRoute = '/KitchenDashboard';
        break;
      case 'พนักงานเสิร์ฟ':
        targetRoute = '/CreateBill';
        break;
      case 'พนักงานแคชเชียร์':
        targetRoute = '/BillingList';
        break;
      default:
        targetRoute = '/Dashboard'; // Fallback route
        break;
    }

    this.router.navigate([targetRoute]).then((success) => {
      if (success) {
        console.log(`2. เปลี่ยนหน้าสำเร็จ! ไปที่ ${targetRoute} ด้วย Role: ${role}`);
      } else {
        console.error(`3. เปลี่ยนหน้าล้มเหลว! ไปที่ ${targetRoute} (อาจจะติด Guard)`);
      }
    });
  }

  forgotPassword() {}

  onRegisterMember() {
    this.router.navigate(['/Registermember']);
  }

  onRegisterEmployee() {
    this.router.navigate(['/Registeremployee']);
  }
}
