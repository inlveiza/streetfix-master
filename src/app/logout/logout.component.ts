import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output } from '@angular/core';
import { Auth, signOut } from '@angular/fire/auth';
import { Firestore } from '@angular/fire/firestore';
import { Router } from '@angular/router';
import { doc, updateDoc } from 'firebase/firestore';

@Component({
  selector: 'app-logout',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="logout-overlay" (click)="onOverlayClick($event)">
      <div class="logout-dialog">
        <div class="logo-container">
          <img src="assets/streetfix-logo.png" alt="StreetFix Logo" class="logo">
        </div>
        <h2>Logout Confirmation</h2>
        <p>Are you sure you want to logout?</p>
        <div class="button-container">
          <button class="confirm-button" (click)="confirmLogout()">Confirm</button>
          <button class="cancel-button" (click)="cancelLogout()">Cancel</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .logout-overlay {
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

    .logout-dialog {
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
    }

    .button-container {
      display: flex;
      gap: 1rem;
      justify-content: center;
    }

    .confirm-button, .cancel-button {
      padding: 0.8rem 2rem;
      border-radius: 8px;
      border: none;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .confirm-button {
      background: #3D8D7A;
      color: white;
    }

    .confirm-button:hover {
      background: #2e7d6a;
    }

    .cancel-button {
      background: white;
      color: #3D8D7A;
      border: 1px solid #3D8D7A;
    }

    .cancel-button:hover {
      background: #f5f5f5;
    }
  `]
})
export class LogoutComponent {
  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  constructor(
    private router: Router,
    private auth: Auth,
    private firestore: Firestore
  ) {}

  async confirmLogout() {
    try {
      const user = this.auth.currentUser;
      if (user) {
        // Update user's online status in Firestore
        const userRef = doc(this.firestore, 'users', user.uid);
        await updateDoc(userRef, {
          isOnline: false,
          lastSeen: new Date()
        });

        // Sign out from Firebase Auth
        await signOut(this.auth);
        
        // Clear all local storage items
        localStorage.clear();
        sessionStorage.clear();
        
        // Navigate to sign-in page
        await this.router.navigate(['/sign-in']);
        
        // Emit confirm event after successful logout
        this.confirm.emit();
      }
    } catch (error) {
      console.error('Error during logout:', error);
      // Handle error appropriately
    }
  }

  cancelLogout() {
    this.cancel.emit();
  }

  onOverlayClick(event: MouseEvent) {
    // Close dialog when clicking the overlay (outside the dialog)
    if ((event.target as HTMLElement).classList.contains('logout-overlay')) {
      this.cancel.emit();
    }
  }
}