import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Auth, signOut } from '@angular/fire/auth';
import { Firestore, collection, doc, getDoc, onSnapshot, query, where } from '@angular/fire/firestore';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Router, RouterModule } from '@angular/router';
import { LogoutConfirmationComponent } from '../../components/logout-confirmation/logout-confirmation.component';
import { ReportService } from '../../services/report.service';

interface Report {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  createdAt: string;
  userId: string;
  userEmail: string;
  location: string;
  address: string;
  images: string[];
  upvotes?: number;
  isUpvoted?: boolean;
  timestamp?: any;
  imageUrl?: string;
  latitude?: number;
  longitude?: number;
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    LogoutConfirmationComponent,
    MatSnackBarModule
  ],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit, OnDestroy {
  reports: Report[] = [];
  showLogoutDialog = false;
  isAdmin = false;
  private unsubscribe: (() => void) | null = null;
  private authUnsubscribe: (() => void) | null = null;

  constructor(
    private router: Router,
    private reportService: ReportService,
    private auth: Auth,
    private firestore: Firestore,
    private snackBar: MatSnackBar
  ) {}

  async ngOnInit() {
    // Check if user is admin
    const user = this.auth.currentUser;
    if (user) {
      const userDoc = await getDoc(doc(this.firestore, 'users', user.uid));
      this.isAdmin = userDoc.exists() && userDoc.data()['role'] === 'admin';
      this.loadUserReports(user.uid);
    } else {
      this.router.navigate(['/sign-in']);
    }
  }

  ngOnDestroy() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
    if (this.authUnsubscribe) {
      this.authUnsubscribe();
    }
  }

  private loadUserReports(userId: string) {
    const reportsQuery = query(
      collection(this.firestore, 'reports'),
      where('userId', '==', userId)
    );

    this.unsubscribe = onSnapshot(reportsQuery, (snapshot) => {
      this.reports = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Report[];
    }, (error) => {
      console.error('Error loading reports:', error);
      this.snackBar.open('Error loading reports', 'Close', { duration: 3000 });
    });
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
    } catch (error: any) {
      console.error('Error signing out:', error);
      this.snackBar.open('Error signing out: ' + error.message, 'Close', { duration: 3000 });
    } finally {
      this.showLogoutDialog = false;
    }
  }

  onLogoutCancelled() {
    this.showLogoutDialog = false;
  }

  handleImageError(event: any) {
    console.error('=== Profile Image Error Debug ===');
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
    
    // If HTTPS also fails or if it was already HTTPS, hide the image
    event.target.style.display = 'none';
    // Optionally add a placeholder here if needed
  }

  handleImageLoad(imageUrl: string) {
    console.log('Profile Image loaded successfully:', imageUrl);
  }
}
