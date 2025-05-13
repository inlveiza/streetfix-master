import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { ProfileComponent } from './pages/profile/profile.component';
import { ReportAnIssueComponent } from './pages/report-an-issue/report-an-issue.component';
import { ReportsComponent } from './pages/reports/reports.component';
import { SignInComponent } from './pages/sign-in/sign-in.component';
import { SignUpComponent } from './pages/sign-up/sign-up.component';
import { WelcomeComponent } from './pages/welcome/welcome.component';

export const routes: Routes = [
  { path: '', redirectTo: 'welcome', pathMatch: 'full' },
  { path: 'welcome', component: WelcomeComponent },
  { path: 'sign-in', component: SignInComponent },
  { path: 'sign-up', component: SignUpComponent },
  { 
    path: 'profile', 
    component: ProfileComponent,
    canActivate: [authGuard]
  },
  { 
    path: 'reports', 
    component: ReportsComponent,
    canActivate: [authGuard]
  },
  { 
    path: 'report-an-issue', 
    component: ReportAnIssueComponent,
    canActivate: [authGuard]
  }
];
