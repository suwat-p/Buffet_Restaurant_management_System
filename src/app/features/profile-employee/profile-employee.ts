import { CommonModule, Location } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { DialogModule } from 'primeng/dialog';
import { Toast } from 'primeng/toast';
import { lastValueFrom } from 'rxjs';

import { Employee } from '../../models/employee.model';
import { AuthService } from '../../service/api/auth.service';

@Component({
  selector: 'app-profile-employee',
  standalone: true,
  imports: [CommonModule, MatIconModule, FormsModule, Toast, DialogModule],
  providers: [MessageService],
  templateUrl: './profile-employee.html',
  styleUrl: './profile-employee.scss',
})
export class ProfileEmployee implements OnInit {
  displayEditModal: boolean = false;
  isLoading: boolean = false;
  isFetchingData: boolean = true;
  isCheckingEmail: boolean = false;
  showPassword: boolean = false;

  selectedFileName: string = '';
  selectedFile: File | null = null;

  // Raw Data จาก API
  rawEmployeeData?: Employee;

  // โครงสร้างข้อมูลสำหรับแสดงผลบน UI
  employee = {
    empCode: '',
    fullName: '',
    role: '',
    phone: '',
    gender: '',
    birthDate: '-',
    idCard: '',
    address: '',
    department: '',
    startDate: '-',
    paymentType: 'รายวัน',
    workDuration: '-',
    status: '',
    empType: '',
    workTime: '-',
    dailyWage: '-',
    email: '',
    profileImg: '',
  };

  // ตัวแปรสำหรับผูกฟอร์มใน Modal
  editData = {
    fullname: '',
    email: '',
    phone: '',
    password: '',
    image_Profile: '',
    address: '',
  };

  // 🟢 Inline Validation Error Messages
  fullnameError: string = '';
  emailError: string = '';
  phoneError: string = '';
  passwordError: string = '';
  addressError: string = '';
  fileError: string = '';

  constructor(
    private location: Location,
    private messageService: MessageService,
    private authService: AuthService,
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.fetchProfileData();
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  // 🟢 Password Requirement Indicators
  get hasMinLength(): boolean {
    return (this.editData.password || '').length >= 8;
  }

  get hasUpperCase(): boolean {
    return /[A-Z]/.test(this.editData.password || '');
  }

  get hasLowerCase(): boolean {
    return /[a-z]/.test(this.editData.password || '');
  }

  get hasNumeric(): boolean {
    return /[0-9]/.test(this.editData.password || '');
  }

  get hasSpecialChar(): boolean {
    return /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(this.editData.password || '');
  }

  // 🟢 --- Validation Functions ---
  validateFullname(): boolean {
    if (!this.editData.fullname.trim()) {
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
    if (!this.editData.email.trim()) {
      this.emailError = 'กรุณากรอกอีเมล';
      return false;
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(this.editData.email)) {
      this.emailError = 'รูปแบบอีเมลไม่ถูกต้อง';
      return false;
    }

    // ถ้าไม่ได้เปลี่ยนอีเมล ไม่ต้องตรวจ Abstract API ซ้ำ
    if (this.rawEmployeeData && this.editData.email === this.rawEmployeeData.email) {
      this.emailError = '';
      return true;
    }

    this.isCheckingEmail = true;
    this.emailError = '';

    try {
      const abstractApiUrl = `https://emailreputation.abstractapi.com/v1/?api_key=95447c2830c24726a08c83228443e563&email=${encodeURIComponent(
        this.editData.email
      )}`;
      const apiRes: any = await lastValueFrom(this.http.get(abstractApiUrl));

      const status = apiRes?.email_deliverability?.status;
      const isSmtpValid = apiRes?.email_deliverability?.is_smtp_valid;
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

      this.emailError = '';
      this.isCheckingEmail = false;
      return true;
    } catch (error) {
      console.error('Error verifying email:', error);
      this.isCheckingEmail = false;
      return true; // ปล่อยผ่านกรณี API ตรวจสอบมีปัญหา
    }
  }

  validatePhone(): boolean {
    if (!this.editData.phone) {
      this.phoneError = 'กรุณากรอกเบอร์โทรศัพท์';
      return false;
    }
    if (isNaN(Number(this.editData.phone))) {
      this.phoneError = 'เบอร์โทรศัพท์ต้องเป็นตัวเลขเท่านั้น';
      return false;
    }
    if (this.editData.phone.charAt(0) !== '0') {
      this.phoneError = 'เบอร์โทรศัพท์ต้องขึ้นต้นด้วย "0"';
      return false;
    }
    if (this.editData.phone.length !== 10) {
      this.phoneError = 'เบอร์โทรศัพท์ต้องมี 10 หลัก';
      return false;
    }
    this.phoneError = '';
    return true;
  }

  validatePassword(): boolean {
    // กรณีแก้ไขโปรไฟล์: ถ้ารหัสผ่านเป็นค่าว่าง ถือว่าไม่ต้องการเปลี่ยนรหัสผ่าน
    if (!this.editData.password) {
      this.passwordError = '';
      return true;
    }

    if (!this.hasMinLength) {
      this.passwordError = 'รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร';
      return false;
    }
    if (!this.hasUpperCase) {
      this.passwordError = 'รหัสผ่านต้องมีตัวอักษรพิมพ์ใหญ่ (A-Z) อย่างน้อย 1 ตัว';
      return false;
    }
    if (!this.hasLowerCase) {
      this.passwordError = 'รหัสผ่านต้องมีตัวอักษรพิมพ์เล็ก (a-z) อย่างน้อย 1 ตัว';
      return false;
    }
    if (!this.hasNumeric) {
      this.passwordError = 'รหัสผ่านต้องมีตัวเลข (0-9) อย่างน้อย 1 ตัว';
      return false;
    }
    if (!this.hasSpecialChar) {
      this.passwordError = 'รหัสผ่านต้องมีอักขระพิเศษอย่างน้อย 1 ตัว';
      return false;
    }

    this.passwordError = '';
    return true;
  }

  validateAddress(): boolean {
    if (!this.editData.address.trim()) {
      this.addressError = 'กรุณากรอกที่อยู่';
      return false;
    }
    this.addressError = '';
    return true;
  }

  // 🟢 โหลดข้อมูลพนักงาน
  fetchProfileData(): void {
    const member = this.authService.getMember();

    if (member && member.id) {
      const empId = Number(member.id);
      this.isFetchingData = true;

      this.authService.getEmployeebyId(empId).subscribe({
        next: (res: any) => {
          if (res) {
            const emp: Employee = Array.isArray(res) ? res[0] : res;
            this.rawEmployeeData = emp;

            let formattedWorkTime = '-';
            if (emp.start_Time && emp.end_Time) {
              formattedWorkTime = `${emp.start_Time} - ${emp.end_Time}`;
            }

            this.employee = {
              empCode: `EMP${String(emp.emp_id || '').padStart(3, '0')}`,
              fullName: emp.fullname || '-',
              role: emp.department || 'พนักงาน',
              phone: emp.phone || '-',
              gender: emp.gender || '-',
              birthDate: '-',
              idCard: emp.identification_Number || '-',
              address: emp.address || '-',
              department: emp.department || '-',
              startDate: emp.hire_Date ? new Date(emp.hire_Date).toLocaleDateString('th-TH') : '-',
              paymentType: 'รายวัน',
              workDuration: this.calculateWorkDuration(emp.hire_Date),
              status: emp.employee_Status || 'ทำงานปัจจุบัน',
              empType: emp.employee_Type || 'ประจำ',
              workTime: formattedWorkTime,
              dailyWage: emp.wage !== null && emp.wage !== undefined ? `${emp.wage} ฿` : '-',
              email: emp.email || '-',
              profileImg: emp.image_Profile || '',
            };

            this.resetEditForm();
          }
          this.isFetchingData = false;
        },
        error: (err) => {
          console.error('Error fetching employee:', err);
          this.isFetchingData = false;
          this.messageService.add({
            severity: 'error',
            summary: 'ผิดพลาด',
            detail: 'ไม่สามารถดึงข้อมูลพนักงานได้',
          });
        },
      });
    } else {
      this.isFetchingData = false;
      this.messageService.add({
        severity: 'warn',
        summary: 'แจ้งเตือน',
        detail: 'ไม่พบข้อมูลการเข้าสู่ระบบ',
      });
    }
  }

  calculateWorkDuration(hireDate?: Date | null): string {
    if (!hireDate) return '-';
    const start = new Date(hireDate);
    const now = new Date();

    let years = now.getFullYear() - start.getFullYear();
    let months = now.getMonth() - start.getMonth();

    if (months < 0) {
      years--;
      months += 12;
    }

    if (years > 0 && months > 0) return `${years} ปี ${months} เดือน`;
    if (years > 0) return `${years} ปี`;
    if (months > 0) return `${months} เดือน`;
    return 'น้อยกว่า 1 เดือน';
  }

  goBack(): void {
    this.location.back();
  }

  openEditModal(): void {
    this.resetEditForm();
    this.clearValidationErrors();
    this.selectedFileName = '';
    this.selectedFile = null;
    this.displayEditModal = true;
  }

  resetEditForm(): void {
    if (this.rawEmployeeData) {
      this.editData = {
        fullname: this.rawEmployeeData.fullname || '',
        email: this.rawEmployeeData.email || '',
        phone: this.rawEmployeeData.phone || '',
        password: '',
        image_Profile: this.rawEmployeeData.image_Profile || '',
        address: this.rawEmployeeData.address || '',
      };
    }
  }

  clearValidationErrors(): void {
    this.fullnameError = '';
    this.emailError = '';
    this.phoneError = '';
    this.passwordError = '';
    this.addressError = '';
    this.fileError = '';
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      this.selectedFileName = file.name;
      this.fileError = '';
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.editData.image_Profile = e.target.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  // 🟢 บันทึกข้อมูลแก้ไขโปรไฟล์ พร้อม Validation
  async saveProfile(): Promise<void> {
    if (!this.rawEmployeeData) return;

    this.isLoading = true;

    // รัน Validation ทั้งหมด
    const isNameValid = this.validateFullname();
    const isEmailValid = await this.validateEmailWithAPI();
    const isPhoneValid = this.validatePhone();
    const isPasswordValid = this.validatePassword();
    const isAddressValid = this.validateAddress();

    if (!isNameValid || !isEmailValid || !isPhoneValid || !isPasswordValid || !isAddressValid) {
      this.isLoading = false;
      this.messageService.add({
        severity: 'error',
        summary: 'ข้อมูลไม่ถูกต้อง',
        detail: 'กรุณาตรวจสอบและกรอกข้อมูลในช่องที่มีข้อผิดพลาดให้ครบถ้วน',
      });
      return;
    }

    const formData = new FormData();
    formData.append('Emp_id', this.rawEmployeeData.emp_id.toString());
    formData.append('Fullname', this.editData.fullname);
    formData.append('Email', this.editData.email);
    formData.append('Phone', this.editData.phone);
    formData.append('Address', this.editData.address);

    if (this.editData.password) {
      formData.append('Password', this.editData.password);
    }

    if (this.selectedFile) {
      formData.append('Image_Profile', this.selectedFile);
    }

    this.authService.editProfileEmployee(formData).subscribe({
      next: (res) => {
        this.isLoading = false;
        this.displayEditModal = false;
        this.messageService.add({
          severity: 'success',
          summary: 'สำเร็จ',
          detail: 'แก้ไขข้อมูลโปรไฟล์เรียบร้อยแล้ว',
        });
        this.fetchProfileData(); // ดึงข้อมูลใหม่มาแสดง
      },
      error: (err) => {
        this.isLoading = false;
        this.messageService.add({
          severity: 'error',
          summary: 'ผิดพลาด',
          detail: err.error?.message || 'ไม่สามารถแก้ไขข้อมูลโปรไฟล์ได้',
        });
      },
    });
  }
}