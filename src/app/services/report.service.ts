import { Injectable } from '@angular/core';
import { Firestore, collection, doc, onSnapshot, orderBy, query, updateDoc } from '@angular/fire/firestore';
import { BehaviorSubject, Observable } from 'rxjs';
import { Report } from '../interfaces/report.interface';

@Injectable({
  providedIn: 'root'
})
export class ReportService {
  private reportsSubject = new BehaviorSubject<Report[]>([]);
  public reports$ = this.reportsSubject.asObservable();

  constructor(private firestore: Firestore) {
    // Subscribe to reports collection changes
    const reportsQuery = query(
      collection(this.firestore, 'reports'),
      orderBy('timestamp', 'desc')
    );

    onSnapshot(reportsQuery, (snapshot) => {
      const reports: Report[] = [];
      snapshot.forEach((doc) => {
        reports.push({ id: doc.id, ...doc.data() } as Report);
      });
      this.reportsSubject.next(reports);
    });
  }

  getReports(): Observable<Report[]> {
    return new Observable<Report[]>(observer => {
      const reportsRef = collection(this.firestore, 'reports');
      const q = query(reportsRef, orderBy('timestamp', 'desc'));
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const reports: Report[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          reports.push({
            id: doc.id,
            ...data,
            createdAt: data['createdAt']?.toDate() || new Date()
          } as Report);
        });
        observer.next(reports);
      }, (error) => {
        observer.error(error);
      });

      return () => unsubscribe();
    });
  }

  async updateReportStatus(reportId: string, newStatus: 'pending' | 'in_progress' | 'resolved'): Promise<void> {
    const reportRef = doc(this.firestore, 'reports', reportId);
    await updateDoc(reportRef, {
      status: newStatus,
      updatedAt: new Date()
    });
  }
} 