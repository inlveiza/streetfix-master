import { inject } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { Firestore, doc, getDoc } from '@angular/fire/firestore';
import { Router } from '@angular/router';

export const adminGuard = () => {
  const auth = inject(Auth);
  const firestore = inject(Firestore);
  const router = inject(Router);

  return new Promise((resolve) => {
    auth.onAuthStateChanged(async (user) => {
      if (user) {
        try {
          // Get user document from Firestore
          const userDoc = await getDoc(doc(firestore, 'users', user.uid));
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            console.log('User role from Firestore:', userData['role']);
            
            if (userData['role'] === 'admin') {
              // Update localStorage to match Firestore role
              localStorage.setItem('userRole', 'admin');
              resolve(true);
            } else {
              console.log('User is not an admin, redirecting to profile');
              localStorage.setItem('userRole', userData['role']);
              router.navigate(['/profile']);
              resolve(false);
            }
          } else {
            console.log('User document not found, redirecting to sign-in');
            router.navigate(['/sign-in']);
            resolve(false);
          }
        } catch (error) {
          console.error('Error checking admin status:', error);
          router.navigate(['/sign-in']);
          resolve(false);
        }
      } else {
        console.log('No user logged in, redirecting to sign-in');
        router.navigate(['/sign-in']);
        resolve(false);
      }
    });
  });
}; 