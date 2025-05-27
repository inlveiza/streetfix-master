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
      if (!user) {
        console.log('No user logged in, redirecting to sign-in');
        router.navigate(['/sign-in']);
        resolve(false);
        return;
      }

      try {
        // Check user document for role
        const userDoc = await getDoc(doc(firestore, 'users', user.uid));
        if (!userDoc.exists()) {
          console.log('User document not found, redirecting to sign-in');
          router.navigate(['/sign-in']);
          resolve(false);
          return;
        }

        const userData = userDoc.data();
        if (userData['role'] === 'admin') {
          localStorage.setItem('userRole', 'admin');
          resolve(true);
        } else {
          console.log('User is not an admin, redirecting to profile');
          localStorage.setItem('userRole', userData['role']);
          router.navigate(['/profile']);
          resolve(false);
        }
      } catch (error) {
        console.error('Error checking admin status:', error);
        router.navigate(['/sign-in']);
        resolve(false);
      }
    });
  });
}; 