import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-sign-up',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './sign-up.component.html',
  styleUrls: ['./sign-up.component.css']
})

export class SignUpComponent implements OnInit {
  signUpForm: FormGroup;
  otpForm: FormGroup;
  isLoading = false;
  showPassword = false;
  showConfirmPassword = false;
  successMessage = '';
  errorMessage = '';
  showOtpVerification = false;
  userId = '';

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private userService: UserService
  ) {
    this.signUpForm = this.formBuilder.group({
      fullName: ['', [Validators.required, Validators.minLength(9)]],
      email: ['', [Validators.required, this.strictEmailValidator.bind(this)]],
      address: ['', [Validators.required, Validators.minLength(10)]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });

    this.otpForm = this.formBuilder.group({
      otp: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]]
    });
  }

  ngOnInit() {
    // Component initialization
  }

  strictEmailValidator(control: AbstractControl): ValidationErrors | null {
    const email = control.value;
    if (!email) return null;

    // Stricter regex for most real-world emails
    const emailRegex = /^[a-zA-Z0-9](\.?[a-zA-Z0-9_-])*@[a-zA-Z0-9-]+(\.[a-zA-Z]{2,})+$/;
    if (!emailRegex.test(email)) {
      return { invalidEmail: true };
    }

    return null;
  }

  passwordMatchValidator(form: FormGroup) {
    const password = form.get('password')?.value;
    const confirmPassword = form.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { passwordMismatch: true };
  }

  getErrorMessage(field: string): string {
    const control = this.signUpForm.get(field);
    if (!control || (!control.errors && !this.signUpForm.errors)) return '';

    if (control.errors?.['required']) return `${field} is required`;
    if (control.errors?.['invalidEmail']) return 'Please enter a valid email (e.g., user@domain.com)';
    if (control.errors?.['minlength']) {
      const minLength = control.errors['minlength'].requiredLength;
      return `${field} must be at least ${minLength} characters`;
    }
    if (field === 'confirmPassword' && this.signUpForm.errors?.['passwordMismatch']) {
      return 'Passwords do not match';
    }
    return '';
  }

  getOtpErrorMessage(): string {
    const control = this.otpForm.get('otp');
    if (!control || !control.errors) return '';

    if (control.errors['required']) return 'OTP is required';
    if (control.errors['minlength'] || control.errors['maxLength']) return 'OTP must be 6 digits';
    return '';
  }

  togglePasswordVisibility(field: 'password' | 'confirmPassword') {
    if (field === 'password') {
      this.showPassword = !this.showPassword;
    } else {
      this.showConfirmPassword = !this.showConfirmPassword;
    }
  }

  async onSubmit() {
    this.successMessage = '';
    this.errorMessage = '';
    this.signUpForm.markAllAsTouched();

    if (this.signUpForm.valid) {
      this.isLoading = true;
      try {
        const { email, password, fullName, address } = this.signUpForm.value;
        
        // Create user account
        const { userCredential } = await this.userService.signUp(email, password, {
          fullName,
          address
        });

        this.userId = userCredential.user.uid;
        this.showOtpVerification = true;
        this.successMessage = 'Account created! Please enter the verification code sent to your email.';
      } catch (error: any) {
        this.errorMessage = error.message || 'An error occurred during sign up.';
      } finally {
        this.isLoading = false;
      }
    } else {
      this.errorMessage = 'Please fill in all required fields correctly.';
    }
  }

  async verifyOtp() {
    if (!this.otpForm.valid) {
      this.errorMessage = 'Please enter a valid verification code.';
      return;
    }

    this.isLoading = true;
    this.successMessage = '';
    this.errorMessage = '';

    try {
      await this.userService.verifyOTP(this.userId, this.otpForm.value.otp);
      this.successMessage = 'Email verified successfully! Redirecting to sign in...';
      
      // Sign out the user after verification
      await this.userService.signOut();
      
      // Redirect to sign-in page after a short delay
      setTimeout(() => {
        this.router.navigate(['/sign-in']);
      }, 2000);
    } catch (error: any) {
      this.errorMessage = error.message || 'Failed to verify OTP.';
    } finally {
      this.isLoading = false;
    }
  }
}
