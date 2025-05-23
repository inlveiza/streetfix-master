import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-status-confirmation-dialog',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './status-confirmation-dialog.component.html',
  styleUrls: ['./status-confirmation-dialog.component.css']
})
export class StatusConfirmationDialogComponent {
  @Input() newStatus!: 'pending' | 'in_progress' | 'resolved';
  @Output() confirm = new EventEmitter<void>();
  @Output() cancel = new EventEmitter<void>();

  onConfirm(): void {
    this.confirm.emit();
  }

  onCancel(): void {
    this.cancel.emit();
  }

  getStatusText(status: string): string {
    switch (status) {
      case 'pending': return 'Pending';
      case 'in_progress': return 'In Progress';
      case 'resolved': return 'Resolved';
      default: return status;
    }
  }
} 