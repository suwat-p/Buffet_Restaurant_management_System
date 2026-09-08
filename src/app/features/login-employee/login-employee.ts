import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router } from '@angular/router';
import { jwtDecode } from 'jwt-decode';
import { AuthService } from '../../service/api/auth.service';

@Component({
  selector: 'app-login-employee',
  standalone: true,
  imports: [CommonModule, MatIconModule, FormsModule],
  templateUrl: './login-employee.html',
  styleUrl: './login-employee.scss',
})
export class LoginEmployee implements OnInit {
  constructor(
    private authService: AuthService,
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute,
  ) { }

  email: string = '';
  password: string = '';
  phone: string = '';
  rememberMe: boolean = false;
  returnUrl: string = '';
  isLoading: boolean = false;

  // Alert Modal State
  showAlert: boolean = false;
  alertType: 'success' | 'error' | 'warning' = 'error';
  alertTitle: string = '';
  alertMessage: string = '';
  private alertCallback: (() => void) | null = null;

  ngOnInit() {
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '';

    const token = localStorage.getItem('token') || sessionStorage.getItem('token');

    if (token) {
      try {
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

  // Alert Control
 triggerAlert(type: 'success' | 'error' | 'warning', title: string, message: string, callback?: () => void) {
    this.alertType = type;
    this.alertTitle = title;
    this.alertMessage = message;
    this.showAlert = true;

    setTimeout(() => {
      this.showAlert = false;
      if (callback) {
        callback();
      }
    }, 1500);
  }



  onLogin() {
    const forms = new FormData();
    forms.append('Phone', this.phone);
    forms.append('Password', this.password);
    this.isLoading = true;
    
    this.authService.loginEmployee(forms).subscribe(
      (res: any) => {
        console.log(res);

        const token = res.token;
        let userRole = '';

        try {
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

        // แจ้งเตือนสำเร็จ แล้วเปลี่ยนหน้า
        this.triggerAlert('success', 'เข้าสู่ระบบสำเร็จ', 'กำลังพาคุณเข้าสู่ระบบ...', () => {
          this.navigateByRole(userRole);
        });
      },
      (err) => {
        const errorMessage = err.error?.message || 'เกิดข้อผิดพลาดระหว่างเข้าสู่ระบบ';
        console.log(err);
        
        // แจ้งเตือนข้อผิดพลาด
        this.triggerAlert('error', 'เข้าสู่ระบบไม่สำเร็จ', errorMessage);
      },
    ).add(() => {
      this.isLoading = false;
    });
  }

  private navigateByRole(role: string) {
    if (this.returnUrl) {
      this.router.navigateByUrl(this.returnUrl).then((success) => {
        if (success) {
          console.log(`กลับไปยัง URL ดั้งเดิม: ${this.returnUrl}`);
          return;
        }
        this.fallbackNavigateByRole(role);
      });
    } else {
      this.fallbackNavigateByRole(role);
    }
  }

  private fallbackNavigateByRole(role: string) {
    let targetRoute = '';

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
        targetRoute = '/Dashboard';
        break;
    }

    this.router.navigate([targetRoute]).then((success) => {
      if (success) {
        console.log(`เปลี่ยนหน้าสำเร็จ! ไปที่ ${targetRoute} ด้วย Role: ${role}`);
      } else {
        console.error(`เปลี่ยนหน้าล้มเหลว! ไปที่ ${targetRoute}`);
      }
    });
  }

  forgotPassword() {
    this.router.navigate(['reset-password']);
  }

  onRegisterMember() {
    this.router.navigate(['/Registermember']);
  }

  onRegisterEmployee() {
    this.router.navigate(['/Registeremployee']);
  }
}