import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-terms-and-conditions',
  templateUrl: './terms-and-conditions.component.html',
  styleUrls: ['./terms-and-conditions.component.css'],
  standalone: true,
  imports: [CommonModule]
})
export class TermsAndConditionsComponent {
  @Input() isVisible = false;
  @Output() closed = new EventEmitter<void>();

  closeModal(event: MouseEvent): void {
    // Only close if the click was directly on the overlay, not on its children
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
      this.close();
    }
  }

  close(): void {
    this.isVisible = false;
    this.closed.emit();
  }
}
