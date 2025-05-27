import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Auth, onAuthStateChanged } from '@angular/fire/auth';
import { Firestore, collection, doc, getDoc, onSnapshot, query, updateDoc } from '@angular/fire/firestore';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Router, RouterModule } from '@angular/router';
import { LogoutConfirmationComponent } from '../components/logout-confirmation/logout-confirmation.component';

interface Report {
  id: string;
  title: string;
  description: string;
  category: string;
  status: 'pending' | 'in_progress' | 'resolved';
  createdAt: string;
  userId: string;
  userEmail: string;
  location: string;
  address: string;
  images: string[];
  upvotes?: number;
  timestamp?: any;
  imageUrl?: string;
  latitude?: number;
  longitude?: number;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, LogoutConfirmationComponent, MatSnackBarModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css']
})
export class AdminDashboardComponent implements OnInit {
  showLogoutDialog = false;
  reports: Report[] = [];
  pendingReports: Report[] = [];
  inProgressReports: Report[] = [];
  resolvedReports: Report[] = [];
  isAdmin = false;
  private unsubscribe: (() => void) | null = null;

  constructor(
    private auth: Auth,
    private firestore: Firestore,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    onAuthStateChanged(this.auth, async (user) => {
      if (user) {
        await this.checkAdminStatus(user.uid);
        if (this.isAdmin) {
          this.loadReports();
        } else {
          this.router.navigate(['/profile']);
        }
      } else {
        this.router.navigate(['/sign-in']);
      }
    });
  }

  private async checkAdminStatus(userId: string): Promise<void> {
    try {
      const adminDoc = await getDoc(doc(this.firestore, 'admins', userId));
      this.isAdmin = adminDoc.exists();
    } catch (error) {
      console.error('Error checking admin status:', error);
      this.isAdmin = false;
    }
  }

  private loadReports(): void {
    const reportsRef = collection(this.firestore, 'reports');
    const q = query(reportsRef);

    this.unsubscribe = onSnapshot(q, (snapshot) => {
      this.reports = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Report));

      // Filter reports by status
      this.pendingReports = this.reports.filter(report => report.status === 'pending');
      this.inProgressReports = this.reports.filter(report => report.status === 'in_progress');
      this.resolvedReports = this.reports.filter(report => report.status === 'resolved');
    });
  }

  async updateStatus(report: Report, newStatus: 'pending' | 'in_progress' | 'resolved'): Promise<void> {
    try {
      const reportRef = doc(this.firestore, 'reports', report.id);
      // Update the status
      await updateDoc(reportRef, {
        status: newStatus
      });
      this.snackBar.open('Report status updated successfully', 'Close', { duration: 2000 });
    } catch (error) {
      console.error('Error updating report status:', error);
      this.snackBar.open('Error updating report status', 'Close', { duration: 3000 });
    }
  }

  handleLogout(): void {
    this.showLogoutDialog = true;
  }

  onLogoutConfirmed(): void {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userRole');
    window.location.href = '/sign-in';
  }

  onLogoutCancelled(): void {
    this.showLogoutDialog = false;
  }

  ngOnDestroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }

  handleImageError(event: any) {
    console.error('=== Image Error Debug ===');
    console.error('1. Image load error:', event);
    console.error('2. Failed image URL:', event.target.src);
    
    // Try to load the image with HTTPS if it failed with HTTP
    const failedUrl = event.target.src;
    if (failedUrl.startsWith('http:')) {
      const httpsUrl = failedUrl.replace('http:', 'https:');
      console.log('3. Attempting to load with HTTPS:', httpsUrl);
      event.target.src = httpsUrl;
      return;
    }
    
    // If HTTPS also fails or if it was already HTTPS, show the placeholder
    event.target.style.display = 'none';
    const parent = event.target.parentElement;
    if (parent) {
      const placeholder = document.createElement('div');
      placeholder.className = 'no-image-placeholder';
      placeholder.innerHTML = `
        <i class="fas fa-image"></i>
        <span>Image not available</span>
        <small>URL: ${failedUrl}</small>
      `;
      parent.appendChild(placeholder);
    }
  }

  handleImageLoad(imageUrl: string) {
    console.log('Image loaded successfully:', imageUrl);
  }
}
