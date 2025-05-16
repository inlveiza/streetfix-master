import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-about',
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.css'],
  standalone: true,
  imports: [CommonModule]
})
export class AboutComponent {
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
