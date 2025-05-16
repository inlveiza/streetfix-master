import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { UserService } from '../../services/user.service';
import { EmailVerificationComponent } from '../../components/email-verification/email-verification.component';
import { signOut } from '@angular/fire/auth';

@Component({
  selector: 'app-sign-up',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, EmailVerificationComponent],
  templateUrl: './sign-up.component.html',
  styleUrls: ['./sign-up.component.css']
})

export class SignUpComponent implements OnInit {
  signUpForm: FormGroup;
  isLoading = false;
  showPassword = false;
  showConfirmPassword = false;
  successMessage = '';
  errorMessage = '';
  showVerificationDialog = false;
  userEmail = '';

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
        this.userEmail = email; // Store the email for the verification dialog
        
        // Create user account
        await this.userService.signUp(email, password, {
          fullName,
          address
        });

        // Sign out the user but don't redirect (we'll use Auth directly to avoid the redirection)
        try {
          await signOut(this.userService.getAuth());
        } catch (signOutError) {
          console.error('Error signing out:', signOutError);
        }

        // Set success message
        this.successMessage = 'Account created successfully!';
        
        // Show verification dialog immediately
        this.showVerificationDialog = true;
        console.log('Verification dialog should be visible', this.showVerificationDialog, this.userEmail);
        
      } catch (error: any) {
        this.errorMessage = error.message || 'An error occurred during sign up.';
      } finally {
        this.isLoading = false;
      }
    } else {
      this.errorMessage = 'Please fill in all required fields correctly.';
    }
  }

  onVerificationConfirmed() {
    console.log('Verification confirmed, redirecting to sign-in');
    this.showVerificationDialog = false;
    this.router.navigate(['/sign-in']);
  }
}
