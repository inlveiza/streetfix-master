import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-status-confirmation',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="status-confirmation-dialog" *ngIf="show">
      <div class="dialog-content">
        <h3>Update Status</h3>
        <p>Are you sure you want to change the status to "{{ status }}"?</p>
        <div class="dialog-actions">
          <button (click)="onConfirm()" class="confirm-btn">Confirm</button>
          <button (click)="onCancel()" class="cancel-btn">Cancel</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .status-confirmation-dialog {
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
      background: white;
      padding: 20px;
      border-radius: 8px;
      min-width: 300px;
    }

    .dialog-actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 20px;
    }

    button {
      padding: 8px 16px;
      border-radius: 4px;
      border: none;
      cursor: pointer;
    }

    .confirm-btn {
      background: #4CAF50;
      color: white;
    }

    .cancel-btn {
      background: #f44336;
      color: white;
    }
  `]
})
export class StatusConfirmationComponent {
  @Input() show = false;
  @Input() status: string = '';
  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  onConfirm() {
    this.confirm.emit();
  }

  onCancel() {
    this.cancel.emit();
  }
} 