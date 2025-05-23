import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { Auth, onAuthStateChanged, signOut } from '@angular/fire/auth';
import { Firestore, collection, deleteDoc, doc, getDoc, getDocs, increment, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc } from '@angular/fire/firestore';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Router, RouterLink, RouterModule } from '@angular/router';
import { LogoutConfirmationComponent } from '../../components/logout-confirmation/logout-confirmation.component';
import { StatusConfirmationDialogComponent } from './components/status-confirmation-dialog/status-confirmation-dialog.component';

interface Report {
  id: string;
  username: string;
  status: 'pending' | 'in_progress' | 'resolved';
  imageUrl: string | null;
  category: string;
  location: string;
  description: string;
  latitude: number;
  longitude: number;
  upvotes: number;
  isUpvoted: boolean;
  timestamp: any;
  userId: string;
  userEmail: string;
}

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    LogoutConfirmationComponent,
    RouterLink,
    FormsModule,
    ReactiveFormsModule,
    MatSnackBarModule,
    StatusConfirmationDialogComponent
  ],
  templateUrl: './reports.component.html',
  styleUrls: ['./reports.component.css']
})
export class ReportsComponent implements OnInit, OnDestroy {
  reports: Report[] = [];
  isSortMenuOpen = false;
  currentSort = 'votes-high';
  showLogoutDialog = false;
  isSubmitting = false;
  defaultAvatarPath = 'assets/profile.png';
  isAdmin = false;
  showAdminSetup = false;
  showStatusConfirmationDialog = false;
  reportToUpdate: Report | null = null;
  newStatusToConfirm: 'pending' | 'in_progress' | 'resolved' | null = null;
  private unsubscribe: (() => void) | null = null;
  private authUnsubscribe: (() => void) | null = null;
  console = console;

  constructor(
    private router: Router,
    private auth: Auth,
    private firestore: Firestore,
    private cdr: ChangeDetectorRef,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.authUnsubscribe = onAuthStateChanged(this.auth, async (user) => {
      if (user) {
        localStorage.setItem('authToken', user.uid);
        await this.checkUserRole(user.uid);
        this.loadReports();
      } else {
        localStorage.removeItem('authToken');
        this.router.navigate(['/sign-in']);
      }
    });
  }

  ngOnDestroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
    if (this.authUnsubscribe) {
      this.authUnsubscribe();
    }
  }

  private loadReports(): void {
    console.log('Setting up Firestore subscription...');
    const reportsRef = collection(this.firestore, 'reports');
    const q = query(reportsRef, orderBy('timestamp', 'desc'));
    
    this.unsubscribe = onSnapshot(q, (snapshot) => {
      console.log('=== Reports Loading Debug ===');
      console.log('1. Received snapshot from Firestore:', snapshot.size, 'documents');
      
      const newReports = snapshot.docs.map(doc => {
        const data = doc.data();
        console.log('2. Processing document:', doc.id);
        console.log('3. Document data:', data);
        
        // Ensure imageUrl is properly handled
        const imageUrl = data['imageUrl'];
        console.log('4. Image URL from Firestore:', imageUrl);
        
        const report = {
          id: doc.id,
          username: data['userEmail']?.split('@')[0] || 'Anonymous',
          status: data['status'] || 'pending',
          imageUrl: imageUrl,
          category: data['category'],
          location: data['location'],
          description: data['description'],
          latitude: data['latitude'],
          longitude: data['longitude'],
          upvotes: data['upvotes'] || 0,
          isUpvoted: false,
          timestamp: data['timestamp'],
          userId: data['userId'],
          userEmail: data['userEmail']
        } as Report;
        
        console.log('5. Processed report:', report);
        return report;
      });
      
      console.log('6. New reports array:', newReports);
      this.reports = newReports;
      this.applyCurrentSort();
      this.cdr.detectChanges();
    }, (error) => {
      console.error('Error fetching reports:', error);
    });
  }

  isUserLoggedIn(): boolean {
    return !!this.auth.currentUser;
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
    this.applyCurrentSort();
  }

  private applyCurrentSort(): void {
    if (!this.reports.length) return;

    this.reports.sort((a, b) => {
      if (this.currentSort === 'votes-high') {
        return (b.upvotes || 0) - (a.upvotes || 0);
      } else {
        return (a.upvotes || 0) - (b.upvotes || 0);
      }
    });
  }

  async upvoteReport(report: Report): Promise<void> {
    if (this.isSubmitting) return;
    
    try {
      this.isSubmitting = true;
      
      // Get the current user
      const user = this.auth.currentUser;
      if (!user) {
        this.snackBar.open('Please log in to upvote reports', 'Close', { duration: 3000 });
        return;
      }

      const reportRef = doc(this.firestore, 'reports', report.id);
      const upvotesRef = collection(this.firestore, 'reports', report.id, 'upvotes');
      const userUpvoteRef = doc(upvotesRef, user.uid);

      // Check if user has already upvoted
      const upvoteDoc = await getDoc(userUpvoteRef);
      
      if (upvoteDoc.exists()) {
        // Remove upvote
        await deleteDoc(userUpvoteRef);
        await updateDoc(reportRef, {
          upvotes: increment(-1)
        });
        report.upvotes = (report.upvotes || 0) - 1;
        report.isUpvoted = false;
      } else {
        // Add upvote
        await setDoc(userUpvoteRef, {
          userId: user.uid,
          timestamp: serverTimestamp()
        });
        await updateDoc(reportRef, {
          upvotes: increment(1)
        });
        report.upvotes = (report.upvotes || 0) + 1;
        report.isUpvoted = true;
      }

      this.snackBar.open(
        report.isUpvoted ? 'Report upvoted!' : 'Upvote removed',
        'Close',
        { duration: 2000 }
      );
    } catch (error) {
      console.error('Error upvoting report:', error);
      this.snackBar.open('Error upvoting report', 'Close', { duration: 3000 });
    } finally {
      this.isSubmitting = false;
    }
  }

  getUpvoteIcon(report: Report): string {
    return report.isUpvoted ? 'assets/upvote-select.png' : 'assets/upvote.png';
  }

  getAvatarPath(avatar: string | null): string {
    return avatar || this.defaultAvatarPath;
  }

  reportIssue(): void {
    this.router.navigate(['/report-an-issue']);
  }

  handleLogout(): void {
    this.showLogoutDialog = true;
  }

  onLogoutConfirmed(): void {
    signOut(this.auth).then(() => {
      localStorage.removeItem('authToken');
      this.router.navigate(['/sign-in']);
    }).catch((error) => {
      console.error('Error signing out:', error);
    });
  }

  onLogoutCancelled(): void {
    this.showLogoutDialog = false;
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

  handleStatusChange(report: Report, newStatus: 'pending' | 'in_progress' | 'resolved'): void {
    if (!this.isAdmin) {
      this.snackBar.open('Only administrators can update report status', 'Close', { duration: 3000 });
      return;
    }

    // Prevent the status from changing immediately
    const selectElement = event?.target as HTMLSelectElement;
    if (selectElement) {
      selectElement.value = report.status;
    }

    // Store the report and new status for confirmation
    this.reportToUpdate = report;
    this.newStatusToConfirm = newStatus;
    this.showStatusConfirmationDialog = true;
  }

  async onStatusChangeConfirmed(): Promise<void> {
    if (!this.reportToUpdate || !this.newStatusToConfirm) {
      this.onStatusChangeCancelled();
      return;
    }

    try {
      const reportRef = doc(this.firestore, 'reports', this.reportToUpdate.id);

      if (this.newStatusToConfirm === 'resolved') {
        // Delete the report if status is resolved
        await deleteDoc(reportRef);
        console.log('Report deleted:', this.reportToUpdate.id);
        this.snackBar.open('Report resolved and deleted successfully', 'Close', { duration: 2000 });



      } else {
        // Otherwise, just update the status
        await updateDoc(reportRef, {
          status: this.newStatusToConfirm
        });

        // Update local state only after successful Firestore update
        // The local state will be updated automatically by the Firestore subscription for deletion.
        // For status updates, we manually update the local state for immediate feedback.
        const index = this.reports.findIndex(r => r.id === this.reportToUpdate?.id);
        if (index !== -1 && this.reportToUpdate) {
          this.reports[index].status = this.newStatusToConfirm;
          this.cdr.detectChanges();
        }

        this.snackBar.open('Report status updated successfully', 'Close', { duration: 2000 });
      }

    } catch (error) {
      console.error('Error updating/deleting report status:', error);
      this.snackBar.open('Error updating report status', 'Close', { duration: 3000 });
    } finally {
      this.onStatusChangeCancelled();
    }
  }

  onStatusChangeCancelled(): void {
    this.showStatusConfirmationDialog = false;
    this.reportToUpdate = null;
    this.newStatusToConfirm = null;
  }

  // Function to create an admin user
  async createAdminUser(userId: string): Promise<void> {
    try {
      const adminRef = doc(this.firestore, 'admins', userId);
      await setDoc(adminRef, {
        role: 'admin',
        addedAt: serverTimestamp(),
        email: this.auth.currentUser?.email || 'unknown'
      });
      
      this.snackBar.open('Admin user created successfully', 'Close', { duration: 2000 });
      this.isAdmin = true;
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error creating admin user:', error);
      this.snackBar.open('Error creating admin user', 'Close', { duration: 3000 });
    }
  }

  // Function to check if current user is admin
  async checkIfCurrentUserIsAdmin(): Promise<boolean> {
    const user = this.auth.currentUser;
    if (!user) return false;

    try {
      const adminDoc = await getDoc(doc(this.firestore, 'admins', user.uid));
      return adminDoc.exists();
    } catch (error) {
      console.error('Error checking admin status:', error);
      return false;
    }
  }

  private async checkAdminStatus(userId: string): Promise<void> {
    try {
      const adminDoc = await getDoc(doc(this.firestore, 'admins', userId));
      this.isAdmin = adminDoc.exists();
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error checking admin status:', error);
      this.isAdmin = false;
    }
  }

  private async checkInitialAdminSetup(): Promise<void> {
    try {
      // Check if there are any admins in the collection
      const adminsRef = collection(this.firestore, 'admins');
      const adminsSnapshot = await getDocs(adminsRef);
      
      if (adminsSnapshot.empty) {
        // No admins exist, show the setup button
        this.showAdminSetup = true;
      } else {
        // Admins exist, check if current user is admin
        await this.checkAdminStatus(this.auth.currentUser?.uid || '');
      }
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error checking initial admin setup:', error);
      this.showAdminSetup = false;
    }
  }

  async setupInitialAdmin(): Promise<void> {
    const user = this.auth.currentUser;
    if (!user) {
      this.snackBar.open('You must be logged in to setup admin', 'Close', { duration: 3000 });
      return;
    }

    try {
      await this.createAdminUser(user.uid);
      this.showAdminSetup = false;
      this.snackBar.open('Initial admin setup complete', 'Close', { duration: 2000 });
    } catch (error) {
      console.error('Error setting up initial admin:', error);
      this.snackBar.open('Error setting up admin', 'Close', { duration: 3000 });
    }
  }

  private async checkUserRole(userId: string): Promise<void> {
    try {
      const userDoc = await getDoc(doc(this.firestore, 'users', userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        this.isAdmin = userData['role'] === 'admin';
        this.cdr.detectChanges();
      }
    } catch (error) {
      console.error('Error checking user role:', error);
      this.isAdmin = false;
    }
  }
}
