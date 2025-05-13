import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { LogoutComponent } from '../logout/logout.component';
import { StatusConfirmationComponent } from './status-confirmation/status-confirmation.component';

interface Report {
  id: string;
  username: string;
  userAvatar: string | null;
  status: 'PENDING' | 'IN_PROGRESS' | 'RESOLVED';
  image: string | null;
  category: string;
  location: string;
  description: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  upvotes: number;
  createdAt: Date;
}

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, RouterModule, LogoutComponent, StatusConfirmationComponent],
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.css']
})
export class AdminComponent implements OnInit {
  reports: Report[] = [
    {
      id: '1',
      username: 'User',
      userAvatar: null,
      status: 'PENDING',
      image: null,
      category: 'Road Damage',
      location: 'Sta Rita',
      description: 'A pothole has formed in this area, causing a potential hazard for vehicles and pedestrians. The road surface is damaged, with a visible hole that may grow larger if not addressed. This issue could lead to accidents, and traffic disruptions.',
      coordinates: {
        lat: 14.5995,
        lng: 120.9842
      },
      upvotes: 0,
      createdAt: new Date()
    }
  ];

  isSortMenuOpen = false;
  currentSort = '';
  showLogoutDialog = false;
  showStatusDialog = false;
  defaultAvatarPath = 'assets/profile.png';
  
  // Properties for status update
  selectedReport: Report | null = null;
  pendingStatus: 'PENDING' | 'IN_PROGRESS' | 'RESOLVED' | null = null;

  constructor(private router: Router) {}

  ngOnInit(): void {
    // Check if user is logged in and is admin
    if (!this.isAdminLoggedIn()) {
      this.router.navigate(['/login']);
    }
  }

  getAvatarPath(userAvatar: string | null): string {
    return userAvatar || this.defaultAvatarPath;
  }

  isAdminLoggedIn(): boolean {
    // Check if user is logged in and has admin role
    const authToken = localStorage.getItem('authToken');
    const userRole = localStorage.getItem('userRole');
    return !!authToken && userRole === 'admin';
  }

  toggleSortMenu(): void {
    this.isSortMenuOpen = !this.isSortMenuOpen;
  }

  sortReports(sortType: string, event?: Event): void {
    if (event) {
      event.preventDefault();
    }
    
    this.currentSort = sortType;
    this.isSortMenuOpen = false;

    // Sort the reports based on upvotes
    this.reports.sort((a, b) => {
      if (sortType === 'votes-high') {
        return b.upvotes - a.upvotes;
      } else {
        return a.upvotes - b.upvotes;
      }
    });
  }

  formatStatus(status: 'PENDING' | 'IN_PROGRESS' | 'RESOLVED'): string {
    switch (status) {
      case 'PENDING':
        return 'Pending';
      case 'IN_PROGRESS':
        return 'In Progress';
      case 'RESOLVED':
        return 'Resolved';
      default:
        return status;
    }
  }

  initiateStatusUpdate(report: Report, newStatus: 'PENDING' | 'IN_PROGRESS' | 'RESOLVED'): void {
    this.selectedReport = report;
    this.pendingStatus = newStatus;
    this.showStatusDialog = true;
  }

  confirmStatusUpdate(): void {
    if (this.selectedReport && this.pendingStatus) {
      this.selectedReport.status = this.pendingStatus;
      // Here you would typically make an API call to update the status in the backend
    }
    this.closeStatusDialog();
  }

  closeStatusDialog(): void {
    this.showStatusDialog = false;
    this.selectedReport = null;
    this.pendingStatus = null;
  }

  toggleLogoutDialog(): void {
    this.showLogoutDialog = !this.showLogoutDialog;
  }

  handleLogout(): void {
    this.showLogoutDialog = true;
  }

  onLogoutConfirmed(): void {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userRole');
    this.router.navigate(['/login']);
  }

  onLogoutCancelled(): void {
    this.showLogoutDialog = false;
  }
}
