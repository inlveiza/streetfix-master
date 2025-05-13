import { provideHttpClient } from '@angular/common/http';
import { ApplicationConfig } from '@angular/core';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { provideClientHydration } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideClientHydration(),
    provideFirebaseApp(() => initializeApp({
      apiKey: "AIzaSyDxQn8QzQzQzQzQzQzQzQzQzQzQzQzQzQzQ",
      authDomain: "streetfix-4c0c0.firebaseapp.com",
      projectId: "streetfix-4c0c0",
      storageBucket: "streetfix-4c0c0.firebasestorage.app",
      messagingSenderId: "123456789012",
      appId: "1:123456789012:web:1234567890123456789012"
    })),
    provideFirestore(() => getFirestore()),
    provideAuth(() => getAuth()),
    provideHttpClient()
  ]
};
