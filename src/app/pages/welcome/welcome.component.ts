import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-welcome',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './welcome.component.html',
  styleUrls: ['./welcome.component.css']
})
export class WelcomeComponent implements OnInit {
  currentTime: string = '';

  constructor(private router: Router) {}

  goToSignIn() {
    this.router.navigate(['/sign-in']);
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
