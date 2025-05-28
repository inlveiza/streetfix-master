import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-success-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="success-dialog" *ngIf="show">
      <div class="dialog-content">
        <img src="assets/streetfix-logo.png" alt="StreetFix Logo" class="dialog-logo">
        <h3>Report Submitted!</h3>
        <p>Your report has been submitted successfully.</p>
        <div class="dialog-actions">
          <button (click)="onConfirm()" class="ok-btn">OK</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .success-dialog {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 1000;
    }

    .dialog-content {
      background: #ffffed; /* Light yellow background */
      padding: 30px;
      border-radius: 12px;
      min-width: 300px;
      max-width: 400px;
      text-align: center;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
    }

    .dialog-logo {
      width: 80px;
      height: 80px;
      margin-bottom: 15px;
    }

    .dialog-content h3 {
      color: #333;
      font-size: 1.5rem;
      margin-bottom: 10px;
    }

    .dialog-content p {
      color: #555;
      font-size: 1rem;
      margin-bottom: 20px;
    }

    .dialog-actions {
      display: flex;
      justify-content: center;
    }

    .ok-btn {
      padding: 10px 20px;
      border-radius: 8px; /* More rounded corners */
      border: none;
      cursor: pointer;
      font-weight: 600;
      background: #3D8D7A; /* Greenish color from the image */
      color: white;
      transition: background-color 0.2s;
    }

    .ok-btn:hover {
      background: #2c7561;
    }
  `]
})
export class SuccessDialogComponent {
  @Input() show = false;
  @Output() confirm = new EventEmitter<void>();

  onConfirm() {
    this.confirm.emit();
  }
} 