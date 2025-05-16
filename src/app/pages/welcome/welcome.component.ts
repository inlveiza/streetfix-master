import { Component, OnInit, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TermsAndConditionsComponent } from '../../components/terms-and-conditions/terms-and-conditions.component';
import { AboutComponent } from '../../components/about/about.component';

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

  constructor(private router: Router) {}

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
