import { inject } from '@angular/core';
import { Auth, onAuthStateChanged } from '@angular/fire/auth';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';

export const authGuard = () => {
  const auth = inject(Auth);
  const router = inject(Router);

  return new Observable<boolean>((observer) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        observer.next(true);
        observer.complete();
      } else {
        router.navigate(['/sign-in']);
        observer.next(false);
        observer.complete();
      }
    });

    return () => unsubscribe();
  });
}; 