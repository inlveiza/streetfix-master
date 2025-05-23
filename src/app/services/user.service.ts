import { Injectable } from '@angular/core';
import {
  Auth,
  createUserWithEmailAndPassword,
  sendEmailVerification,
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
        case 'auth/wrong-password':
          return 'auth/wrong-password';
        case 'auth/user-not-found':
          return 'auth/user-not-found';
        case 'auth/network-request-failed':
          return 'Network error. Please check your internet connection.';
        case 'auth/too-many-requests':
          return 'auth/too-many-requests';
        case 'auth/unverified-email':
          return 'auth/unverified-email';
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

  async signUp(email: string, password: string, userData: Partial<User>): Promise<UserCredential> {
    try {
      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
      
      // Send verification email
      await sendEmailVerification(userCredential.user);
      
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
        emailVerified: false
      };
      
      await setDoc(userDoc, newUser);
      return userCredential;
    } catch (error) {
      throw new Error(this.handleError(error));
    }
  }

  async signIn(email: string, password: string): Promise<UserCredential> {
    try {
      console.log('Starting sign in process...');
      const userCredential = await signInWithEmailAndPassword(this.auth, email, password);
      console.log('User authenticated:', userCredential.user.uid);
      
      // Check if email is verified
      if (!userCredential.user.emailVerified) {
        console.log('Email not verified');
        throw new Error('auth/unverified-email');
      }

      // Check if user document exists
      const userDoc = doc(this.firestore, 'users', userCredential.user.uid);
      const userSnap = await getDoc(userDoc);
      console.log('User document exists:', userSnap.exists());

      if (!userSnap.exists()) {
        console.log('Creating new user document...');
        // Create user document if it doesn't exist
        const newUser: User = {
          uid: userCredential.user.uid,
          email: email,
          fullName: '',
          address: '',
          createdAt: serverTimestamp() as any,
          lastLoginAt: serverTimestamp() as any,
          isActive: true,
          role: 'user',
          permissions: ['submit_report'],
          reportsSubmitted: 0,
          reportsResolved: 0,
          emailVerified: userCredential.user.emailVerified
        };
        await setDoc(userDoc, newUser);
        localStorage.setItem('userRole', 'user');
        console.log('New user document created with role: user');
      } else {
        console.log('Updating existing user document...');
        // Update last login timestamp and email verification status
        await updateDoc(userDoc, {
          lastLoginAt: serverTimestamp(),
          emailVerified: userCredential.user.emailVerified
        });
        // Store the user's role in localStorage
        const userData = userSnap.data();
        console.log('User data from Firestore:', userData);
        const userRole = userData['role'];
        console.log('Setting user role in localStorage:', userRole);
        localStorage.setItem('userRole', userRole);
      }

      // Store auth token
      localStorage.setItem('authToken', userCredential.user.uid);
      console.log('Auth token stored in localStorage');
      
      return userCredential;
    } catch (error) {
      console.error('Sign in error:', error);
      throw new Error(this.handleError(error));
    }
  }

  async signOut(): Promise<void> {
    try {
      console.log('Starting sign out process...');
      await signOut(this.auth);
      
      // Clear all auth-related data from localStorage
      localStorage.clear(); // This will clear all localStorage items
      
      // Or if you want to be more specific:
      // localStorage.removeItem('authToken');
      // localStorage.removeItem('userRole');
      // localStorage.removeItem('user');
      // localStorage.removeItem('userData');
      
      console.log('Cleared all localStorage data');
      this.router.navigate(['/sign-in']);
    } catch (error) {
      console.error('Sign out error:', error);
      throw new Error(this.handleError(error));
    }
  }

  // Returns the Auth instance without navigation
  getAuth(): Auth {
    return this.auth;
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

  isAdmin(): boolean {
    const role = localStorage.getItem('userRole');
    console.log('Checking admin status. Current role:', role);
    return role === 'admin';
  }
} 