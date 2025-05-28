import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
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
export class AdminDashboardComponent implements OnInit, OnDestroy {
  showLogoutDialog = false;
  reports: Report[] = [];
  pendingReports: Report[] = [];
  inProgressReports: Report[] = [];
  resolvedReports: Report[] = [];
  isAdmin = false;
  selectedCategory: 'pending' | 'in_progress' | 'resolved' | null = null;
  private unsubscribe: (() => void) | null = null;
  isLoading = true;

  constructor(
    private auth: Auth,
    private firestore: Firestore,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    console.log('AdminDashboardComponent initialized');
    this.initializeAuth();
  }

  private initializeAuth(): void {
    onAuthStateChanged(this.auth, async (user) => {
      console.log('Auth state changed:', user ? 'User logged in' : 'No user');
      if (user) {
        try {
          console.log('Checking admin status for user:', user.uid);
          await this.checkAdminStatus(user.uid);
          console.log('Admin status:', this.isAdmin);
          
          if (this.isAdmin) {
            console.log('Loading reports for admin');
            this.loadReports();
          } else {
            console.log('User is not admin, redirecting to profile');
            this.router.navigate(['/profile']);
          }
        } catch (error) {
          console.error('Error during initialization:', error);
          this.snackBar.open('Error initializing dashboard', 'Close', { duration: 3000 });
          this.router.navigate(['/sign-in']);
        }
      } else {
        console.log('No user found, redirecting to sign-in');
        this.router.navigate(['/sign-in']);
      }
    }, (error) => {
      console.error('Auth state change error:', error);
      this.snackBar.open('Authentication error', 'Close', { duration: 3000 });
      this.router.navigate(['/sign-in']);
    });
  }

  private async checkAdminStatus(userId: string): Promise<void> {
    try {
      console.log('Checking admin status in Firestore');
      const adminDoc = await getDoc(doc(this.firestore, 'admins', userId));
      this.isAdmin = adminDoc.exists();
      console.log('Admin document exists:', this.isAdmin);
    } catch (error) {
      console.error('Error checking admin status:', error);
      this.isAdmin = false;
      throw error;
    }
  }

  private loadReports(): void {
    try {
      console.log('Loading reports from Firestore');
      const reportsRef = collection(this.firestore, 'reports');
      const q = query(reportsRef);

      this.unsubscribe = onSnapshot(q, 
        (snapshot) => {
          console.log('Reports snapshot received:', snapshot.size, 'documents');
          this.reports = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          } as Report));

          // Filter reports by status
          this.pendingReports = this.reports.filter(report => report.status === 'pending');
          this.inProgressReports = this.reports.filter(report => report.status === 'in_progress');
          this.resolvedReports = this.reports.filter(report => report.status === 'resolved');
          
          console.log('Reports filtered:', {
            pending: this.pendingReports.length,
            inProgress: this.inProgressReports.length,
            resolved: this.resolvedReports.length
          });

          this.isLoading = false;
        },
        (error) => {
          console.error('Error loading reports:', error);
          this.snackBar.open('Error loading reports', 'Close', { duration: 3000 });
          this.isLoading = false;
        }
      );
    } catch (error) {
      console.error('Error setting up reports listener:', error);
      this.snackBar.open('Error setting up reports', 'Close', { duration: 3000 });
      this.isLoading = false;
    }
  }

  async updateStatus(report: Report, newStatus: 'pending' | 'in_progress' | 'resolved'): Promise<void> {
    try {
      const reportRef = doc(this.firestore, 'reports', report.id);
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
    
    const failedUrl = event.target.src;
    if (failedUrl.startsWith('http:')) {
      const httpsUrl = failedUrl.replace('http:', 'https:');
      console.log('3. Attempting to load with HTTPS:', httpsUrl);
      event.target.src = httpsUrl;
      return;
    }
    
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

  filterReports(category: 'pending' | 'in_progress' | 'resolved'): void {
    this.selectedCategory = this.selectedCategory === category ? null : category;
  }
}
