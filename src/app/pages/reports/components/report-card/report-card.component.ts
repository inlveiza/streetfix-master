import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Report {
  id: string;
  title: string;
  description: string;
  location: string;
  status: 'pending' | 'in-progress' | 'resolved';
  timestamp: Date;
  imageUrl?: string;
  authorName: string;
  votes?: number;
}

@Component({
  selector: 'app-report-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="report-card">
      <div class="report-header">
        <div class="author-info">
          <div class="author-avatar"></div>
          <div class="author-details">
            <h3>{{ report.authorName }}</h3>
            <p class="timestamp">{{ report.timestamp | date:'medium' }}</p>
          </div>
        </div>
        <div class="status-badge" [class]="report.status">
          {{ report.status }}
        </div>
      </div>

      <div class="report-content">
        <h2>{{ report.title }}</h2>
        <p>{{ report.description }}</p>
        <div class="location">
          <i class="fas fa-map-marker-alt"></i>
          {{ report.location }}
        </div>
        <img *ngIf="report.imageUrl" [src]="report.imageUrl" [alt]="report.title" class="report-image">
      </div>

      <div class="report-actions">
        <div class="vote-buttons">
          <button class="vote-button upvote" (click)="upvote()">
            <i class="fas fa-arrow-up"></i>
          </button>
          <span class="vote-count">{{ report.votes || 0 }}</span>
          <button class="vote-button downvote" (click)="downvote()">
            <i class="fas fa-arrow-down"></i>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .report-card {
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      padding: 1rem;
      margin-bottom: 1rem;
    }

    .report-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .author-info {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .author-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background-color: #e0e0e0;
    }

    .author-details h3 {
      margin: 0;
      font-size: 1rem;
    }

    .timestamp {
      color: #666;
      font-size: 0.8rem;
      margin: 0;
    }

    .status-badge {
      padding: 0.25rem 0.5rem;
      border-radius: 12px;
      font-size: 0.8rem;
      text-transform: capitalize;
    }

    .status-badge.pending {
      background-color: #fff3cd;
      color: #856404;
    }

    .status-badge.in-progress {
      background-color: #cce5ff;
      color: #004085;
    }

    .status-badge.resolved {
      background-color: #d4edda;
      color: #155724;
    }

    .report-content {
      margin-bottom: 1rem;
    }

    .report-content h2 {
      margin: 0 0 0.5rem 0;
      font-size: 1.2rem;
    }

    .location {
      color: #666;
      font-size: 0.9rem;
      margin-top: 0.5rem;
    }

    .report-image {
      width: 100%;
      border-radius: 8px;
      margin-top: 0.5rem;
    }

    .report-actions {
      display: flex;
      justify-content: flex-end;
      border-top: 1px solid #eee;
      padding-top: 0.5rem;
    }

    .vote-buttons {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .vote-button {
      background: none;
      border: none;
      color: #666;
      cursor: pointer;
      padding: 0.5rem;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .vote-button:hover {
      background-color: #f5f5f5;
    }

    .vote-button.upvote:hover {
      color: #4CAF50;
    }

    .vote-button.downvote:hover {
      color: #f44336;
    }

    .vote-count {
      font-size: 1rem;
      color: #666;
      min-width: 2rem;
      text-align: center;
    }
  `]
})
export class ReportCardComponent {
  @Input() report!: Report;

  upvote() {
    // Implement upvote logic
  }

  downvote() {
    // Implement downvote logic
  }
} 