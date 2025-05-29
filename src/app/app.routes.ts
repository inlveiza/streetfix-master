import { Routes } from '@angular/router';
import { adminGuard } from './guards/admin.guard';
import { authGuard } from './guards/auth.guard';
import { ReportAnIssueComponent } from './pages/report-an-issue/report-an-issue.component';
import { ReportsComponent } from './pages/reports/reports.component';
import { WelcomeComponent } from './pages/welcome/welcome.component';

export const routes: Routes = [
  { path: '', redirectTo: 'welcome', pathMatch: 'full' },
  { path: 'sign-in', loadComponent: () => import('./pages/sign-in/sign-in.component').then(m => m.SignInComponent) },
  { path: 'sign-up', loadComponent: () => import('./pages/sign-up/sign-up.component').then(m => m.SignUpComponent) }, 
  { path: 'profile', loadComponent: () => import('./pages/profile/profile.component').then(m => m.ProfileComponent), canActivate: [authGuard] },
  { path: 'reports', component: ReportsComponent, canActivate: [authGuard] },
  { path: 'report-an-issue', component: ReportAnIssueComponent, canActivate: [authGuard] },
  { path: 'admin-dashboard', loadComponent: () => import('./admin-dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent), canActivate: [authGuard, adminGuard] },
  { path: 'welcome', component: WelcomeComponent },
  { path: '**', redirectTo: 'sign-in' }
];
