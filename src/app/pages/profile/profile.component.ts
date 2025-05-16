import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { LogoutConfirmationComponent } from '../../components/logout-confirmation/logout-confirmation.component';
import { Auth, signOut } from '@angular/fire/auth';

interface Report {
  id: number;
  description: string;
  status: string;
  // Add other properties as needed
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterModule, LogoutConfirmationComponent],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})

export class ProfileComponent implements OnInit {
  reports: Report[] = []; // This will store the user's reports
  showLogoutDialog = false;

  constructor(
    private router: Router,
    private auth: Auth
  ) {}

  ngOnInit() {
    // Here you would typically fetch the user's reports from a service
    // For now, we'll leave it empty to show the "no reports" message
  }

  navigateToReports() {
    this.router.navigate(['/reports']);
  }

  reportIssue() {
    this.router.navigate(['/report-an-issue']);
  }

  handleLogout() {
    this.showLogoutDialog = true;
  }

  async onLogoutConfirmed() {
    try {
      await signOut(this.auth);
      localStorage.removeItem('authToken');
      this.router.navigate(['/sign-in']);
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      this.showLogoutDialog = false;
    }
  }

  onLogoutCancelled() {
    this.showLogoutDialog = false;
  }
}
