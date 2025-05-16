import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

import { AppComponent } from './app.component';
import { WelcomeComponent } from './pages/welcome/welcome.component';
import { TermsAndConditionsComponent } from './components/terms-and-conditions/terms-and-conditions.component';
import { AboutComponent } from './components/about/about.component';

// Add other components as needed

@NgModule({
  declarations: [
    AppComponent,
    WelcomeComponent,
    TermsAndConditionsComponent,
    AboutComponent,
    // Add other components as needed
  ],
  imports: [
    BrowserModule,
    FormsModule,
    RouterModule.forRoot([
      // Define your routes here
      { path: '', component: WelcomeComponent },
      // Add other routes as needed
    ])
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { } 