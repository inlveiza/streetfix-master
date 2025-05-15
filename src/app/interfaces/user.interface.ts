import { Timestamp } from '@angular/fire/firestore';

export interface User {
    uid: string;
    email: string;
    fullName: string;
    address: string;
    createdAt: Timestamp;
    lastLoginAt: Timestamp;
    isActive: boolean;
    role: 'user' | 'admin';
    permissions: string[];
    reportsSubmitted: number;
    reportsResolved: number;
    emailVerified: boolean;
    phoneNumber?: string;
    profilePicture?: string;
    location?: {
        latitude: number;
        longitude: number;
    };
} 