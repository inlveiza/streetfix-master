import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { Auth, onAuthStateChanged, signOut } from '@angular/fire/auth';
import { Firestore, collection, deleteDoc, doc, getDoc, increment, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc } from '@angular/fire/firestore';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Router, RouterLink, RouterModule } from '@angular/router';
import { LogoutConfirmationComponent } from '../../components/logout-confirmation/logout-confirmation.component';

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
    MatSnackBarModule
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
    this.authUnsubscribe = onAuthStateChanged(this.auth, (user) => {
      if (user) {
        localStorage.setItem('authToken', user.uid);
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
}
