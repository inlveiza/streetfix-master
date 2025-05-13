import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { LogoutComponent } from '../../logout/logout.component';


interface Report {
  id: number;
  description: string;
  status: string;
  // Add other properties as needed
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, RouterModule, LogoutComponent],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})

export class ProfileComponent implements OnInit {
  reports: Report[] = []; // This will store the user's reports
  showLogoutDialog = false;

  constructor(private router: Router) {}

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

  onLogoutConfirmed() {
    // Handle logout logic here
    this.showLogoutDialog = false;
    this.router.navigate(['/login']);
  }

  onLogoutCancelled() {
    this.showLogoutDialog = false;
  }
}
