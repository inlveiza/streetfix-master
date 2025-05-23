import { inject } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { Router } from '@angular/router';
import { UserService } from '../services/user.service';

export const authGuard = () => {
  const auth = inject(Auth);
  const router = inject(Router);
  const userService = inject(UserService);

  return new Promise((resolve) => {
    auth.onAuthStateChanged((user) => {
      if (user) {
        // Check if we have the necessary auth data
        const authToken = localStorage.getItem('authToken');
        const userRole = localStorage.getItem('userRole');
        
        if (!authToken || !userRole) {
          console.log('Missing auth data, redirecting to sign-in');
          localStorage.clear(); // Clear any partial data
          router.navigate(['/sign-in']);
          resolve(false);
          return;
        }
        
        resolve(true);
      } else {
        console.log('No user logged in, redirecting to sign-in');
        localStorage.clear(); // Clear any stale data
        router.navigate(['/sign-in']);
        resolve(false);
      }
    });
  });
}; 