import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-sign-in',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './sign-in.component.html',
  styleUrls: ['./sign-in.component.css']
})
export class SignInComponent implements OnInit {
  signInForm: FormGroup;
  isLoading = false;
  showPassword = false;
  showConfirmPassword = false;
  successMessage = '';
  errorMessage = '';
  isEmailUnverified = false;

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private userService: UserService
  ) {
    this.signInForm = this.formBuilder.group({
      email: ['', [Validators.required, this.strictEmailValidator.bind(this)]],
      password: ['', [Validators.required, Validators.minLength(8)]]
    });
  }

  ngOnInit() {
    // Clear any stale auth data on component initialization
    localStorage.clear();
    console.log('Cleared localStorage on sign-in page load');
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

  getErrorMessage(field: string): string {
    const control = this.signInForm.get(field);
    if (!control || (!control.errors && !this.signInForm.errors)) return '';

    if (control.errors?.['required']) return `${field} is required`;
    if (control.errors?.['invalidEmail']) return 'Please enter a valid email (e.g., user@domain.com)';
    if (control.errors?.['minlength']) {
      const minLength = control.errors['minlength'].requiredLength;
      return `${field} must be at least ${minLength} characters`;
    }
    return '';
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }

  async onSubmit() {
    this.successMessage = '';
    this.errorMessage = '';
    this.isEmailUnverified = false;
    this.signInForm.markAllAsTouched();

    if (this.signInForm.valid) {
      this.isLoading = true;
      try {
        const { email, password } = this.signInForm.value;
        
        // Clear any existing auth data before signing in
        localStorage.clear();
        
        // Attempt to sign in
        await this.userService.signIn(email, password);
        
        // Check if user is admin and route accordingly
        const userRole = localStorage.getItem('userRole');
        console.log('User role after sign in:', userRole);
        
        if (userRole === 'admin') {
          console.log('User is admin, navigating to admin dashboard');
          await this.router.navigate(['/admin-dashboard']);
        } else {
          console.log('User is not admin, navigating to profile');
          await this.router.navigate(['/profile']);
        }
      } catch (error: any) {
        console.error('Sign in error:', error);
        // Handle specific error cases
        if (error.message === 'auth/unverified-email') {
          this.isEmailUnverified = true;
          this.errorMessage = 'Please verify your email address before signing in. Check your inbox for the verification link.';
        } else if (error.message === 'auth/wrong-password' || error.message === 'auth/user-not-found') {
          this.errorMessage = 'Invalid email or password. Please try again.';
        } else if (error.message === 'auth/too-many-requests') {
          this.errorMessage = 'Too many failed attempts. Please try again later.';
        } else {
          this.errorMessage = error.message || 'An error occurred while signing in.';
        }
        // Clear any partial auth data on error
        localStorage.clear();
      } finally {
        this.isLoading = false;
      }
    } else {
      this.errorMessage = 'Please fill in all required fields correctly.';
    }
  }
}