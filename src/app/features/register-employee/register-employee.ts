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
  selector: 'app-register-employee',
  standalone: true,
  imports: [Toast, CommonModule, MatIconModule, FormsModule],
  providers: [MessageService],
  templateUrl: './register-employee.html',
  styleUrl: './register-employee.scss',
})
export class RegisterEmployee {
  constructor(
    private authService: AuthService,
    private http: HttpClient,
    private messageService: MessageService,
    private router: Router,
  ) {}

  // Form Models
  fullname: string = '';
  email: string = '';
  phone: string = '';
  password: string = '';
  gender: string = '';
  idCard: string = '';
  address: string = '';
  employeeType: string = '';
  department: string = '';
  selectedFile: File | null = null;
  selectedFileName: string = '';

  // UI Control States
  showPassword: boolean = false;
  isCheckingEmail: boolean = false;

  // Inline Error Messages
  fullnameError: string = '';
  emailError: string = '';
  phoneError: string = '';
  passwordError: string = '';
  idCardError: string = '';
  fileError: string = '';
  genderError: string = '';
  addressError: string = '';
  departmentError: string = '';
  employeeTypeError: string = '';

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  onFileSelected(event: any) {
    const file: File = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      this.selectedFileName = file.name;
      this.fileError = '';
    } else {
      this.fileError = 'กรุณาเลือกรูปภาพพนักงาน';
    }
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

  async validateEmailWithAPI(): Promise<boolean> {
    if (!this.email.trim()) {
      this.emailError = 'กรุณากรอกอีเมล';
      return false;
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(this.email)) {
      this.emailError = 'รูปแบบอีเมลไม่ถูกต้อง';
      return false;
    }

    this.isCheckingEmail = true;
    this.emailError = '';

    try {
      const abstractApiUrl = `https://emailreputation.abstractapi.com/v1/?api_key=95447c2830c24726a08c83228443e563&email=${encodeURIComponent(this.email)}`;
      const apiRes: any = await lastValueFrom(this.http.get(abstractApiUrl));

      const status = apiRes?.email_deliverability?.status;
      const isSmtpValid = apiRes?.email_deliverability?.is_smtp_valid;
      const isDisposable = apiRes?.email_quality?.is_disposable;

      if (status !== 'deliverable' || !isSmtpValid) {
        this.emailError = 'อีเมลนี้ไม่มีอยู่จริง ';
        this.isCheckingEmail = false;
        return false;
      }

      if (isDisposable) {
        this.emailError = 'ไม่อนุญาตให้ใช้อีเมลชั่วคราว (Disposable Email)';
        this.isCheckingEmail = false;
        return false;
      }

      this.emailError = '';
      this.isCheckingEmail = false;
      return true;

    } catch (error) {
      console.error('Error verifying email:', error);
      this.isCheckingEmail = false;
      return true; // ปล่อยผ่านกรณี API มีปัญหา
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

  validateIdCard(): boolean {
    if (!this.idCard) {
      this.idCardError = 'กรุณากรอกรหัสบัตรประชาชน';
      return false;
    }
    if (!/^\d+$/.test(this.idCard)) {
      this.idCardError = 'รหัสบัตรประชาชนต้องเป็นตัวเลขเท่านั้น';
      return false;
    }
    if (this.idCard.length !== 13) {
      this.idCardError = 'กรุณากรอกรหัสบัตรประชาชนให้ครบ 13 หลัก';
      return false;
    }
    this.idCardError = '';
    return true;
  }

  validateFile(): boolean {
    if (!this.selectedFile) {
      this.fileError = 'กรุณาเลือกรูปภาพพนักงาน';
      return false;
    }
    this.fileError = '';
    return true;
  }

  validateGender(): boolean {
    if (!this.gender) {
      this.genderError = 'กรุณาเลือกเพศ';
      return false;
    }
    this.genderError = '';
    return true;
  }

  validateAddress(): boolean {
    if (!this.address.trim()) {
      this.addressError = 'กรุณากรอกที่อยู่';
      return false;
    }
    this.addressError = '';
    return true;
  }

  validateDepartment(): boolean {
    if (!this.department) {
      this.departmentError = 'กรุณาเลือกแผนก';
      return false;
    }
    this.departmentError = '';
    return true;
  }

  validateEmployeeType(): boolean {
    if (!this.employeeType) {
      this.employeeTypeError = 'กรุณาเลือกประเภทพนักงาน';
      return false;
    }
    this.employeeTypeError = '';
    return true;
  }

  async onSubmit() {
    // รัน Validation ทุกช่องเพื่อโชว์ Error
    const isNameValid = this.validateFullname();
    const isEmailValid = await this.validateEmailWithAPI();
    const isPhoneValid = this.validatePhone();
    const isPasswordValid = this.validatePassword();
    const isIdCardValid = this.validateIdCard();
    const isFileValid = this.validateFile();
    const isGenderValid = this.validateGender();
    const isAddressValid = this.validateAddress();
    const isDeptValid = this.validateDepartment();
    const isEmpTypeValid = this.validateEmployeeType();

    if (
      !isNameValid ||
      !isEmailValid ||
      !isPhoneValid ||
      !isPasswordValid ||
      !isIdCardValid ||
      !isFileValid ||
      !isGenderValid ||
      !isAddressValid ||
      !isDeptValid ||
      !isEmpTypeValid
    ) {
      this.messageService.add({
        severity: 'error',
        summary: 'ข้อมูลไม่ถูกต้อง',
        detail: 'กรุณาตรวจสอบและกรอกข้อมูลในช่องที่มีข้อผิดพลาดให้ครบถ้วน',
      });
      return;
    }

    const formData = new FormData();
    formData.append('Fullname', this.fullname);
    formData.append('Email', this.email);
    formData.append('Phone', this.phone);
    formData.append('Password', this.password);
    formData.append('Gender', this.gender);
    formData.append('Identification_Number', this.idCard);
    formData.append('Address', this.address);
    formData.append('Department', this.department);
    formData.append('Employee_Type', this.employeeType);

    if (this.selectedFile) {
      formData.append('Image_Profile', this.selectedFile, this.selectedFile.name);
    }

    try {
      const response = await lastValueFrom(this.authService.registerEmployee(formData));

      if (response) {
        this.messageService.add({
          severity: 'success',
          summary: 'สำเร็จ',
          detail: 'สมัครสมาชิกพนักงานเรียบร้อยแล้ว',
        });
      }
      setTimeout(() => {
        this.router.navigate(['/Loginemployee']);
      }, 2000);
    } catch (error: any) {
      const errorMessage = error.error?.message || 'ไม่สามารถลงทะเบียนได้ กรุณาลองใหม่';
      this.messageService.add({
        severity: 'error',
        summary: 'ข้อผิดพลาด',
        detail: errorMessage,
      });
      console.error('Registration Error:', error);
    }
  }

  goBack() {
    window.history.back();
  }

  goLogin() {
    this.router.navigate(['/Loginemployee']);
  }
}