import { CommonModule } from '@angular/common';
import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AboutComponent } from '../../components/about/about.component';
import { TermsAndConditionsComponent } from '../../components/terms-and-conditions/terms-and-conditions.component';

@Component({
  selector: 'app-welcome',
  standalone: true,
  imports: [CommonModule, FormsModule, TermsAndConditionsComponent, AboutComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  templateUrl: './welcome.component.html',
  styleUrls: ['./welcome.component.css']
})
export class WelcomeComponent implements OnInit {
  currentTime: string = '';
  termsAccepted = false;
  termsVisible = false;
  aboutVisible = false;
  showError = false;
  public userFlowHovered = false;

  constructor(private router: Router) {}

  handleGetStarted(): void {
    if (!this.termsAccepted) {
      this.showError = true;
      return;
    }
    this.goToSignIn();
  }

  closeError(): void {
    this.showError = false;
  }

  goToSignIn(): void {
    this.router.navigate(['/sign-in']);
  }

  showTerms(): void {
    this.termsVisible = true;
  }

  showAbout(): void {
    this.aboutVisible = true;
  }

  ngOnInit() {
    this.updateTime();
    setInterval(() => this.updateTime(), 60000); // Update time every minute
  }

  updateTime() {
    const now = new Date();
    this.currentTime = now.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).toLowerCase();
  }

  onGetStarted() {
    this.router.navigate(['/home']);
  }
}
