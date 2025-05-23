import { Injectable } from '@angular/core';
import { Firestore, collection, doc, onSnapshot, query, updateDoc } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Report } from '../interfaces/report.interface';

@Injectable({
  providedIn: 'root'
})
export class ReportService {
  constructor(private firestore: Firestore) {}

  getReports(): Observable<Report[]> {
    return new Observable<Report[]>(observer => {
      const reportsRef = collection(this.firestore, 'reports');
      const q = query(reportsRef);
      
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

  async updateReportStatus(reportId: string, status: string): Promise<void> {
    try {
      const reportRef = doc(this.firestore, 'reports', reportId);
      await updateDoc(reportRef, {
        status: status,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error('Error updating report status:', error);
      throw error;
    }
  }
} 