import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnDestroy, OnInit, QueryList, ViewChildren } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../service/api/auth.service';

@Component({
  selector: 'app-reset-password',
  imports: [CommonModule, ReactiveFormsModule, RouterModule],
  templateUrl: './reset-password.html',
  styleUrl: './reset-password.scss',
})
export class ResetPassword implements OnInit, OnDestroy {
  currentStep: number = 1;
  isLoading: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';

  showNewPassword: boolean = false;
  showConfirmPassword: boolean = false;

  resendCountdown: number = 60;
  private timerInterval: any;
  canResendOtp: boolean = false;

  emailForm!: FormGroup;
  otpForm!: FormGroup;
  passwordForm!: FormGroup;

  otpKeys = ['digit1', 'digit2', 'digit3', 'digit4', 'digit5', 'digit6'];

  @ViewChildren('otpInput') otpInputs!: QueryList<ElementRef>;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.initForms();
  }

  ngOnDestroy(): void {
    this.stopTimer();
  }

  // --- INITIALIZATION ---
  private initForms(): void {
    this.emailForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });

    this.otpForm = this.fb.group({
      digit1: ['', [Validators.required, Validators.pattern('^[0-9]$')]],
      digit2: ['', [Validators.required, Validators.pattern('^[0-9]$')]],
      digit3: ['', [Validators.required, Validators.pattern('^[0-9]$')]],
      digit4: ['', [Validators.required, Validators.pattern('^[0-9]$')]],
      digit5: ['', [Validators.required, Validators.pattern('^[0-9]$')]],
      digit6: ['', [Validators.required, Validators.pattern('^[0-9]$')]]
    });

    this.passwordForm = this.fb.group({
      newPassword: ['', [Validators.required, this.strongPasswordValidator]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  // --- PASSWORD VALIDATION GETTERS ---
  get newPasswordValue(): string {
    return this.passwordForm.get('newPassword')?.value || '';
  }

  get hasMinLength(): boolean {
    return this.newPasswordValue.length >= 8;
  }

  get hasUpperCase(): boolean {
    return /[A-Z]/.test(this.newPasswordValue);
  }

  get hasLowerCase(): boolean {
    return /[a-z]/.test(this.newPasswordValue);
  }

  get hasNumeric(): boolean {
    return /[0-9]/.test(this.newPasswordValue);
  }

  get hasSpecialChar(): boolean {
    return /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(this.newPasswordValue);
  }

  private strongPasswordValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.value;
    if (!password) return null;

    const isValid = 
      password.length >= 8 &&
      /[A-Z]/.test(password) &&
      /[a-z]/.test(password) &&
      /[0-9]/.test(password) &&
      /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

    return isValid ? null : { passwordInvalid: true };
  }

  private passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
    const password = group.get('newPassword')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { passwordMismatch: true };
  }

  // --- STEP 1: EMAIL ---
  onSendOtp(): void {
    if (this.emailForm.invalid) {
      this.emailForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const email = this.emailForm.get('email')?.value;
   
    this.authService.sendOtp(email).subscribe({
      next: () => {
        this.isLoading = false;
        this.currentStep = 2;
        this.startResendTimer();
        setTimeout(() => this.focusOtpInput(0), 100);
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = typeof error.error === 'string' 
          ? error.error 
          : (error.error?.message || 'เกิดข้อผิดพลาดในการส่ง OTP');
      }
    });
  }

  // --- STEP 2: OTP LOGIC & RESTRICTIONS ---
  
  // 🟢 บล็อกแป้นพิมพ์ที่ไม่ใช่ตัวเลข (อนุญาตเฉพาะ 0-9 และปุ่มควบคุม)
  onOtpKeyDown(event: KeyboardEvent, index: number): void {
    const inputElement = event.target as HTMLInputElement;

    const allowedKeys = ['Backspace', 'Tab', 'Delete', 'ArrowLeft', 'ArrowRight'];
    if (allowedKeys.includes(event.key)) {
      if (event.key === 'Backspace' && !inputElement.value && index > 0) {
        this.focusOtpInput(index - 1);
      }
      return;
    }

    if (!/^[0-9]$/.test(event.key)) {
      event.preventDefault();
    }
  }

  // 🟢 กรองอักขระ/ตัวหนังสือออก และเลื่อนโฟกัสอัตโนมัติ
  onOtpInput(event: Event, index: number): void {
    const inputElement = event.target as HTMLInputElement;
    const cleanValue = inputElement.value.replace(/[^0-9]/g, '');

    inputElement.value = cleanValue;
    this.otpForm.get(this.otpKeys[index])?.setValue(cleanValue, { emitEvent: false });

    if (cleanValue.length === 1 && index < 5) {
      this.focusOtpInput(index + 1);
    }

    if (this.otpForm.valid) {
      this.onVerifyOtp();
    }
  }

  onOtpPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const clipboardData = event.clipboardData?.getData('text');
    if (clipboardData && /^\d{6}$/.test(clipboardData.trim())) {
      const digits = clipboardData.trim().split('');
      this.otpKeys.forEach((key, i) => {
        this.otpForm.get(key)?.setValue(digits[i]);
      });
      this.focusOtpInput(5);
      if (this.otpForm.valid) {
        this.onVerifyOtp();
      }
    }
  }

  private focusOtpInput(index: number): void {
    const inputArray = this.otpInputs?.toArray();
    if (inputArray && inputArray[index]) {
      inputArray[index].nativeElement.focus();
    }
  }

  onVerifyOtp(): void {
    if (this.otpForm.invalid) {
      this.otpForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    const email = this.emailForm.get('email')?.value;
    const otp = Object.values(this.otpForm.value).join('');

    this.authService.verifyOtp(email, otp).subscribe({
      next: () => {
        this.isLoading = false;
        this.currentStep = 3;
        this.stopTimer();
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error.error?.message || 'รหัส OTP ไม่ถูกต้องหรือหมดอายุ';
      }
    });
  }

  resendOtp(): void {
    if (!this.canResendOtp) return;

    this.isLoading = true;
    this.errorMessage = '';
    const email = this.emailForm.get('email')?.value;

    this.authService.sendOtp(email).subscribe({
      next: () => {
        this.isLoading = false;
        this.otpForm.reset();
        this.startResendTimer();
        this.focusOtpInput(0);
        this.successMessage = 'ส่งรหัส OTP ใหม่เรียบร้อยแล้ว';
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err.error?.message || 'ไม่สามารถส่ง OTP ใหม่ได้ กรุณาลองอีกครั้ง';
      }
    });
  }

  private startResendTimer(): void {
    this.stopTimer();
    this.resendCountdown = 60;
    this.canResendOtp = false;

    this.timerInterval = setInterval(() => {
      this.resendCountdown--;
      if (this.resendCountdown <= 0) {
        this.canResendOtp = true;
        this.stopTimer();
      }
    }, 1000);
  }

  private stopTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
    }
  }

  // --- STEP 3: NEW PASSWORD ---
  onResetPassword(): void {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const email = this.emailForm.get('email')?.value;
    const newPassword = this.passwordForm.get('newPassword')?.value;

    this.authService.resetPassword(email, newPassword).subscribe({
      next: () => {
        this.isLoading = false;
        this.currentStep = 4;
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error.error?.message || 'ไม่สามารถเปลี่ยนรหัสผ่านได้ กรุณาลองใหม่อีกครั้ง';
      }
    });
  }

  // --- HELPERS ---
  toggleShowNewPassword(): void {
    this.showNewPassword = !this.showNewPassword;
  }

  toggleShowConfirmPassword(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }
}