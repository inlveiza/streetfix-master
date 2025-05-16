import { Component, Output, EventEmitter, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-email-verification',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="verification-overlay" (click)="onOverlayClick($event)">
      <div class="verification-dialog">
        <div class="logo-container">
          <img src="assets/streetfix-logo.png" alt="StreetFix Logo" class="logo" />
        </div>
        <h2>Email Verification</h2>
        <p>We have sent a verification link to <strong>{{ email }}</strong>. Please check your inbox and verify your email to continue.</p>
        <div class="button-container">
          <button class="confirm-button" (click)="confirmVerification()">OK</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .verification-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 1000;
    }

    .verification-dialog {
      background: #FBFFE4;
      border-radius: 20px;
      padding: 2rem;
      text-align: center;
      max-width: 400px;
      width: 90%;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    }

    .logo-container {
      width: 100px;
      height: 100px;
      margin: 0 auto 1.5rem;
    }

    .logo {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }

    h2 {
      color: #333;
      font-size: 1.5rem;
      margin-bottom: 1rem;
    }

    p {
      color: #666;
      margin-bottom: 2rem;
      line-height: 1.5;
    }

    strong {
      color: #333;
      font-weight: 600;
    }

    .button-container {
      display: flex;
      gap: 1rem;
      justify-content: center;
    }

    .confirm-button {
      padding: 0.8rem 2rem;
      border-radius: 8px;
      border: none;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      background: #3D8D7A;
      color: white;
    }

    .confirm-button:hover {
      background: #2e7d6a;
    }
  `]
})
export class EmailVerificationComponent implements OnInit {
  @Input() email: string = '';
  @Output() confirm = new EventEmitter<void>();

  ngOnInit() {
    console.log('Email verification component initialized with email:', this.email);
  }

  confirmVerification() {
    console.log('Verification confirmed');
    this.confirm.emit();
  }

  onOverlayClick(event: MouseEvent) {
    // Close dialog when clicking the overlay (outside the dialog)
    if ((event.target as HTMLElement).classList.contains('verification-overlay')) {
      this.confirm.emit();
    }
  }
} 