import { Injectable } from '@angular/core';
import {
  Auth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  UserCredential
} from '@angular/fire/auth';
import {
  doc,
  Firestore,
  FirestoreError,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc
} from '@angular/fire/firestore';
import { Router } from '@angular/router';
import { FirebaseError } from 'firebase/app';
import { User } from '../interfaces/user.interface';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  constructor(
    private auth: Auth,
    private firestore: Firestore,
    private router: Router
  ) {}

  private handleError(error: any): string {
    console.error('Detailed error:', error);
    
    if (error instanceof FirebaseError) {
      console.error('Firebase error code:', error.code);
      switch (error.code) {
        case 'auth/email-already-in-use':
          return 'This email is already registered. Please use a different email.';
        case 'auth/invalid-email':
          return 'Please enter a valid email address.';
        case 'auth/operation-not-allowed':
          return 'Email/password accounts are not enabled. Please contact support.';
        case 'auth/weak-password':
          return 'Password is too weak. Please use a stronger password.';
        case 'auth/network-request-failed':
          return 'Network error. Please check your internet connection.';
        case 'auth/too-many-requests':
          return 'Too many attempts. Please try again later.';
        case 'auth/invalid-verification-code':
          return 'Invalid verification code. Please try again.';
        default:
          return `Authentication error: ${error.message}`;
      }
    }

    if (error instanceof FirestoreError) {
      console.error('Firestore error code:', error.code);
      switch (error.code) {
        case 'permission-denied':
          return 'Permission denied. Please make sure you have the right permissions.';
        case 'unauthenticated':
          return 'You must be logged in to perform this action.';
        case 'not-found':
          return 'The requested resource was not found.';
        case 'already-exists':
          return 'This resource already exists.';
        case 'resource-exhausted':
          return 'Quota exceeded. Please try again later.';
        default:
          return `Database error: ${error.message}`;
      }
    }

    return error.message || 'An unexpected error occurred. Please try again.';
  }

  private generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async signUp(email: string, password: string, userData: Partial<User>): Promise<{ userCredential: UserCredential; otp: string }> {
    try {
      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
      
      // Generate OTP
      const otp = this.generateOTP();
      
      // Create user document in Firestore
      const userDoc = doc(this.firestore, 'users', userCredential.user.uid);
      const newUser: User = {
        uid: userCredential.user.uid,
        email: email,
        fullName: userData.fullName || '',
        address: userData.address || '',
        createdAt: serverTimestamp() as any,
        lastLoginAt: serverTimestamp() as any,
        isActive: true,
        role: 'user',
        permissions: ['submit_report'],
        reportsSubmitted: 0,
        reportsResolved: 0,
        emailVerified: false,
        verificationCode: otp,
        verificationCodeExpiry: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes expiry
      };
      
      await setDoc(userDoc, newUser);
      
      // Send OTP email using your email service
      await this.sendOTPEmail(email, otp);
      
      return { userCredential, otp };
    } catch (error) {
      throw new Error(this.handleError(error));
    }
  }

  private async sendOTPEmail(email: string, otp: string): Promise<void> {
    // Implement your email sending logic here
    // You can use services like SendGrid, AWS SES, or your own SMTP server
    console.log(`Sending OTP ${otp} to ${email}`);
  }

  async verifyOTP(uid: string, otp: string): Promise<void> {
    try {
      const userDoc = doc(this.firestore, 'users', uid);
      const userSnap = await getDoc(userDoc);
      
      if (!userSnap.exists()) {
        throw new Error('User not found');
      }

      const userData = userSnap.data() as User;
      
      if (userData.verificationCode !== otp) {
        throw new Error('Invalid verification code');
      }

      if (new Date(userData.verificationCodeExpiry.toDate()) < new Date()) {
        throw new Error('Verification code has expired');
      }

      // Update user document with verified status
      await updateDoc(userDoc, {
        emailVerified: true,
        verificationCode: null,
        verificationCodeExpiry: null
      });
    } catch (error) {
      throw new Error(this.handleError(error));
    }
  }

  async signIn(email: string, password: string): Promise<UserCredential> {
    try {
      const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
      
      // Check if user document exists and is verified
      const userDoc = doc(this.firestore, 'users', userCredential.user.uid);
      const userSnap = await getDoc(userDoc);

      if (!userSnap.exists()) {
        throw new Error('User not found');
      }

      const userData = userSnap.data() as User;
      if (!userData.emailVerified) {
        throw new Error('Please verify your email before signing in');
      }

      // Update last login timestamp
      await updateDoc(userDoc, {
        lastLoginAt: serverTimestamp()
      });

      return userCredential;
    } catch (error) {
      throw new Error(this.handleError(error));
    }
  }

  async signOut(): Promise<void> {
    try {
      await signOut(this.auth);
      this.router.navigate(['/sign-in']);
    } catch (error) {
      throw new Error(this.handleError(error));
    }
  }

  async getUserData(uid: string): Promise<User | null> {
    try {
      const userDoc = doc(this.firestore, 'users', uid);
      const userSnap = await getDoc(userDoc);
      return userSnap.exists() ? (userSnap.data() as User) : null;
    } catch (error) {
      throw new Error(this.handleError(error));
    }
  }
} 