import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Auth, onAuthStateChanged, signOut } from '@angular/fire/auth';
import { Firestore, collection, onSnapshot, query, where } from '@angular/fire/firestore';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Router, RouterModule } from '@angular/router';
import { LogoutConfirmationComponent } from '../../components/logout-confirmation/logout-confirmation.component';

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
  private unsubscribe: (() => void) | null = null;
  private authUnsubscribe: (() => void) | null = null;

  constructor(
    private router: Router,
    private auth: Auth,
    private firestore: Firestore,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    console.log('Profile component initialized');
    this.authUnsubscribe = onAuthStateChanged(this.auth, (user) => {
      if (user) {
        console.log('User authenticated:', user.uid);
        this.loadUserReports(user.uid);
      } else {
        console.log('No user authenticated');
        this.router.navigate(['/sign-in']);
      }
    });
  }

  ngOnDestroy() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
    if (this.authUnsubscribe) {
      this.authUnsubscribe();
    }
  }

  private loadUserReports(userId: string): void {
    console.log('Loading reports for user:', userId);
    try {
      const reportsRef = collection(this.firestore, 'reports');
      const q = query(
        reportsRef,
        where('userId', '==', userId)
      );
      
      this.unsubscribe = onSnapshot(q, 
        (snapshot) => {
          console.log('Received snapshot with', snapshot.size, 'documents');
          try {
            this.reports = snapshot.docs.map(doc => {
              const data = doc.data();
              console.log('Processing document:', doc.id, data);
              
              // Handle images array and imageUrl
              const images = data['images'] || [];
              const imageUrl = data['imageUrl'] || (images.length > 0 ? images[0] : null);
              
              // Handle location and address
              const location = data['location'] || data['address'] || '';
              const address = data['address'] || data['location'] || '';
              
              return {
                id: doc.id,
                title: data['title'],
                description: data['description'],
                category: data['category'],
                status: data['status'],
                createdAt: data['createdAt'],
                userId: data['userId'],
                userEmail: data['userEmail'],
                location: location,
                address: address,
                images: images,
                upvotes: data['upvotes'] || 0,
                isUpvoted: data['isUpvoted'] || false,
                timestamp: data['timestamp'] || data['createdAt'],
                imageUrl: imageUrl,
                latitude: data['latitude'],
                longitude: data['longitude']
              } as Report;
            });
            
            this.reports.sort((a, b) => {
              const timeA = a.timestamp?.toDate?.() || new Date(0);
              const timeB = b.timestamp?.toDate?.() || new Date(0);
              return timeB.getTime() - timeA.getTime();
            });
            console.log('Successfully processed reports:', this.reports);
          } catch (error: any) {
            console.error('Error processing reports:', error);
            this.snackBar.open('Error processing reports data: ' + error.message, 'Close', { duration: 3000 });
          }
        },
        (error: any) => {
          console.error('Firestore error:', error);
          this.snackBar.open('Error loading your reports: ' + error.message, 'Close', { duration: 5000 });
        }
      );
    } catch (error: any) {
      console.error('Error setting up reports query:', error);
      this.snackBar.open('Error setting up reports query: ' + error.message, 'Close', { duration: 5000 });
    }
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
