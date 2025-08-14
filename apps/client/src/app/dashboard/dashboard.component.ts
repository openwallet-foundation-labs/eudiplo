import { Component, type OnDestroy, type OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { FlexLayoutModule } from 'ngx-flexible-layout';
import { ApiService } from '../api.service';
import { EnvironmentService } from '../services/environment.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FlexLayoutModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTooltipModule,
  ],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit, OnDestroy {
  private refreshInterval?: NodeJS.Timeout;
  private tokenCheckInterval?: NodeJS.Timeout;

  constructor(
    public apiService: ApiService,
    public environmentService: EnvironmentService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    // Check token status periodically (every 30 seconds)
    this.tokenCheckInterval = setInterval(() => {
      this.checkTokenStatus();
    }, 30000);

    // Initial check
    this.checkTokenStatus();
  }

  ngOnDestroy(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
    if (this.tokenCheckInterval) {
      clearInterval(this.tokenCheckInterval);
    }
  }

  /**
   * Check token status and show warnings if needed
   */
  private checkTokenStatus(): void {
    if (!this.apiService.getAuthenticationStatus()) {
      // Token has expired, redirect to login
      this.snackBar
        .open('Your session has expired. Please login again.', 'Login', {
          duration: 0, // Don't auto-dismiss
          panelClass: ['error-snackbar'],
        })
        .onAction()
        .subscribe(() => {
          this.apiService.logout();
          this.router.navigate(['/login']);
        });
      return;
    }

    // Check if token is expiring soon (within 5 minutes) and can't auto-refresh
    const timeRemaining = this.apiService.getTokenTimeRemaining();
    if (timeRemaining < 300000 && !this.canAutoRefresh) {
      // 5 minutes
      const minutes = Math.floor(timeRemaining / 60000);
      this.snackBar.open(`Token expires in ${minutes} minutes. Please save your work.`, 'OK', {
        duration: 10000,
        panelClass: ['warning-snackbar'],
      });
    }
  }

  get currentBaseUrl(): string {
    return this.apiService.getBaseUrl() || 'Not configured';
  }

  get canAutoRefresh(): boolean {
    return this.apiService.canRefreshToken();
  }

  get currentClientId(): string {
    return this.apiService.getClientId() || 'Not configured';
  }

  get currentClientSecret(): string {
    return this.apiService.getClientSecret() || 'Not configured';
  }

  get currentOidcUrl(): string {
    return this.apiService.getoidcUrl() || 'Not configured';
  }

  get oauthConfiguration(): { server?: string; clientId?: string; baseUrl?: string } | null {
    return this.apiService.getOAuthConfiguration();
  }

  navigateToCredentialConfig(): void {
    this.router.navigate(['/credential-config']);
  }

  navigateToKeyManagement(): void {
    this.router.navigate(['/key-management']);
  }

  navigateToIssuanceConfig(): void {
    this.router.navigate(['/issuance-config']);
  }

  navigateToPresentationConfig(): void {
    this.router.navigate(['/presentation-config']);
  }

  navigateToSessionManagement(): void {
    this.router.navigate(['/session-management']);
  }

  /**
   * Copy text to clipboard
   */
  async copyToClipboard(text: string, label: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      this.snackBar.open(`${label} copied to clipboard!`, 'OK', {
        duration: 2000,
        panelClass: ['success-snackbar'],
      });
    } catch (err) {
      console.error('Failed to copy text: ', err);
      this.snackBar.open(`Failed to copy ${label}`, 'OK', {
        duration: 3000,
        panelClass: ['error-snackbar'],
      });
    }
  }
}
