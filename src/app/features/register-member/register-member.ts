import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Toast } from 'primeng/toast';
import { lastValueFrom } from 'rxjs';
import { AuthService } from '../../service/api/auth.service';

@Component({
  selector: 'app-register-member',
  standalone: true,
  imports: [Toast, CommonModule, MatIconModule, FormsModule],
  providers: [MessageService],
  templateUrl: './register-member.html',
  styleUrl: './register-member.scss',
})
export class RegisterMember {
  constructor(
    private authService: AuthService,
    private http: HttpClient,
    private messageService: MessageService,
    private router: Router,
  ) { }

  fullname: string = '';
  email: string = '';
  phone: string = '';
  password: string = '';
  birthday: string = '';

  showPassword: boolean = false;
  isCheckingEmail: boolean = false; // สถานะขณะยิง API เช็คอีเมล

  // ตัวแปรสำหรับเก็บ Error Message รายบุคคล
  fullnameError: string = '';
  emailError: string = '';
  phoneError: string = '';
  passwordError: string = '';
  birthdayError: string = '';

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  // --- Inline Validations ---
  validateFullname(): boolean {
    if (!this.fullname.trim()) {
      this.fullnameError = 'กรุณากรอกชื่อ-นามสกุล';
      return false;
    }
    this.fullnameError = '';
    return true;
  }

  clearEmailError(): void {
    this.emailError = '';
  }

  // ฟังก์ชันยิง API เช็คตัวตนอีเมลผ่าน Abstract API + เช็คอีเมลซ้ำ
  async validateEmailWithAPI(): Promise<boolean> {
    if (!this.email.trim()) {
      this.emailError = 'กรุณากรอกอีเมล';
      return false;
    }

    // 1. เช็ค Syntax เบื้องต้นก่อนยิง API เพื่อประหยัด Credits
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(this.email)) {
      this.emailError = 'รูปแบบอีเมลไม่ถูกต้อง';
      return false;
    }

    this.isCheckingEmail = true;
    this.emailError = '';

    try {
      // 2. เรียกใช้ Abstract API (URL และ API Key ตามที่คุณให้มา)
      const abstractApiUrl = `https://emailreputation.abstractapi.com/v1/?api_key=95447c2830c24726a08c83228443e563&email=${encodeURIComponent(this.email)}`;

      const apiRes: any = await lastValueFrom(this.http.get(abstractApiUrl));
      console.log('Abstract API Response:', apiRes);

      // เช็คว่าอีเมลส่งถึงได้หรือไม่ (DELIVERABLE / HIGH Deliverability)
      const status = apiRes?.email_deliverability?.status;             // 'deliverable'
      const isSmtpValid = apiRes?.email_deliverability?.is_smtp_valid; // true
      const isDisposable = apiRes?.email_quality?.is_disposable;

      if (status !== 'deliverable' || !isSmtpValid) {
        this.emailError = 'อีเมลนี้ไม่มีอยู่จริง';
        this.isCheckingEmail = false;
        return false;
      }

      if (isDisposable) {
        this.emailError = 'ไม่อนุญาตให้ใช้อีเมลชั่วคราว (Disposable Email)';
        this.isCheckingEmail = false;
        return false;
      }

      // 3. (Optional) เช็คว่าอีเมลซ้ำใน Database ของเราเองหรือไม่
      // try {
      //   const dbRes: any = await lastValueFrom(this.authService.checkEmailExists(this.email)).catch(() => null);
      //   if (dbRes && dbRes.isExist) {
      //     this.emailError = 'อีเมลนี้ถูกใช้งานในระบบแล้ว';
      //     this.isCheckingEmail = false;
      //     return false;
      //   }
      // } catch (e) {
      //   // ข้ามหากยังไม่ได้สร้าง endpoint นี้ใน backend
      // }

      this.emailError = '';
      this.isCheckingEmail = false;
      return true;

    } catch (error) {
      console.error('Error verifying email:', error);
      // กรณี API ล่ม หรือติด CORS/Quota ให้แจ้งเตือน หรือปล่อยผ่านตาม Policy
      this.isCheckingEmail = false;
      return true;
    }
  }

  validatePhone(): boolean {
    if (!this.phone) {
      this.phoneError = 'กรุณากรอกเบอร์โทรศัพท์';
      return false;
    }
    if (isNaN(Number(this.phone))) {
      this.phoneError = 'เบอร์โทรศัพท์ต้องเป็นตัวเลขเท่านั้น';
      return false;
    }
    if (this.phone.charAt(0) !== '0') {
      this.phoneError = 'เบอร์โทรศัพท์ต้องขึ้นต้นด้วย "0"';
      return false;
    }
    if (this.phone.length !== 10) {
      this.phoneError = 'เบอร์โทรศัพท์ต้องมี 10 หลัก';
      return false;
    }
    this.phoneError = '';
    return true;
  }
  // --- PASSWORD CHECK GETTERS FOR TEMPLATE ---
  get hasMinLength(): boolean {
    return (this.password || '').length >= 8;
  }

  get hasUpperCase(): boolean {
    return /[A-Z]/.test(this.password || '');
  }

  get hasLowerCase(): boolean {
    return /[a-z]/.test(this.password || '');
  }

  get hasNumeric(): boolean {
    return /[0-9]/.test(this.password || '');
  }

  get hasSpecialChar(): boolean {
    return /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(this.password || '');
  }
  validatePassword(): boolean {
    if (!this.password) {
      this.passwordError = 'กรุณากรอกรหัสผ่าน';
      return false;
    }

    const hasMinLength = this.password.length >= 8;
    const hasUpperCase = /[A-Z]/.test(this.password);
    const hasLowerCase = /[a-z]/.test(this.password);
    const hasNumeric = /[0-9]/.test(this.password);
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(this.password);

    if (!hasMinLength) {
      this.passwordError = 'รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร';
      return false;
    }
    if (!hasUpperCase) {
      this.passwordError = 'รหัสผ่านต้องมีตัวอักษรพิมพ์ใหญ่ (A-Z) อย่างน้อย 1 ตัว';
      return false;
    }
    if (!hasLowerCase) {
      this.passwordError = 'รหัสผ่านต้องมีตัวอักษรพิมพ์เล็ก (a-z) อย่างน้อย 1 ตัว';
      return false;
    }
    if (!hasNumeric) {
      this.passwordError = 'รหัสผ่านต้องมีตัวเลข (0-9) อย่างน้อย 1 ตัว';
      return false;
    }
    if (!hasSpecialChar) {
      this.passwordError = 'รหัสผ่านต้องมีอักขระพิเศษอย่างน้อย 1 ตัว';
      return false;
    }

    this.passwordError = '';
    return true;
  }

  validateBirthday(): boolean {
    if (!this.birthday) {
      this.birthdayError = 'กรุณาเลือกวันเกิด';
      return false;
    }
    this.birthdayError = '';
    return true;
  }

  async onSubmit() {
    const isNameValid = this.validateFullname();
    const isEmailValid = await this.validateEmailWithAPI();
    const isPhoneValid = this.validatePhone();
    const isPasswordValid = this.validatePassword();
    const isBirthdayValid = this.validateBirthday();

    if (!isNameValid || !isEmailValid || !isPhoneValid || !isPasswordValid || !isBirthdayValid) {
      this.messageService.add({
        severity: 'error',
        summary: 'ข้อมูลไม่ถูกต้อง',
        detail: 'กรุณาตรวจสอบและแก้ไขข้อมูลในช่องที่มีข้อผิดพลาด',
      });
      return;
    }

    const memberdata = {
      Fullname: this.fullname,
      Email: this.email,
      Phone: this.phone,
      Password: this.password,
      Birthday: this.birthday,
    };

    try {
      const response = await lastValueFrom(this.authService.registerMember(memberdata));
      if (response) {
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'สมัครสมาชิกสำเร็จ',
        });
        setTimeout(() => {
          this.router.navigate(['/Loginmember']);
        }, 1500);
      }
    } catch (error: any) {
      const errorMessage = error?.error?.message || 'เกิดข้อผิดพลาดในการสมัครสมาชิก';
      this.messageService.add({
        severity: 'error',
        summary: 'เกิดข้อผิดพลาด',
        detail: errorMessage,
      });
    }
  }

  goBack() {
    window.history.back();
  }

  goLogin() {
    this.router.navigate(['/Loginmember']);
  }
}