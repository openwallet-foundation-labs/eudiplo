import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import * as QRCode from 'qrcode';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatBadgeModule } from '@angular/material/badge';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { VerifyService } from '../verify-qr/verify.service';
import { VerificationStatusService, VerificationResult } from '../services/verification-status.service';
import { CredentialsService } from '../services/credentials.service';

@Component({
  standalone: true,
  selector: 'app-verification-status',
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatListModule,
    MatBadgeModule,
    MatSnackBarModule,
  ],
  templateUrl: './verification-status.component.html',
  styleUrls: ['./verification-status.component.scss'],
})
export class VerificationStatusComponent implements OnInit, OnDestroy {
  qrSrc?: string;
  url?: string;
  loading = true;
  error?: string;
  sessionId?: string;

  constructor(
    private verifyService: VerifyService,
    public verificationStatusService: VerificationStatusService,
    private credentialsService: CredentialsService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {
  }

  ngOnInit(): void {
    this.startVerification();
  }

  ngOnDestroy(): void {
    this.verificationStatusService.stopPolling();
  }

  /**
   * Initialize verification flow
   */
  private async startVerification(): Promise<void> {
    try {
      // Get selected credential requirements
      const selectedTypes = this.credentialsService.getSelectedCredentialTypes();
      if (selectedTypes.length === 0) {
        this.error = 'No credential types configured. Please go back and configure.';
        this.loading = false;
        return;
      }

      // Call backend to create verification request
      const offerUri = await this.verifyService.start();
      this.url = offerUri;

      // Extract session ID from the URI (format: openid://?request_uri=...)
      this.sessionId = this.extractSessionId(offerUri);

      // Generate QR code
      this.qrSrc = await QRCode.toDataURL(offerUri, { width: 300 });

      // Start polling for verification results
      if (this.sessionId) {
        this.verificationStatusService.startPolling(this.sessionId);
      }

      this.loading = false;
    } catch (err: any) {
      this.error = `Failed to start verification: ${err?.message || String(err)}`;
      this.loading = false;
    }
  }

  /**
   * Extract session ID from offer URI (mock implementation)
   */
  private extractSessionId(uri: string): string {
    // TODO: Implement proper extraction based on actual URI format
    return `session_${Date.now()}`;
  }

  /**
   * Copy URL to clipboard
   */
  copyUrl(): void {
    if (this.url) {
      navigator.clipboard.writeText(this.url).then(() => {
        this.snackBar.open('URL copied to clipboard', 'Close', { duration: 2000 });
      });
    }
  }

  /**
   * Reset and start over
   */
  startOver(): void {
    this.verificationStatusService.clearResult();
    this.router.navigate(['/import']);
  }

  /**
   * Check if verification is successful
   */
  isVerificationSuccess(result: VerificationResult | null): boolean {
    return result?.status === 'success' && (result?.presentedCredentials || []).length > 0;
  }

  /**
   * Get status icon
   */
  getStatusIcon(status: string): string {
    switch (status) {
      case 'success':
        return 'check_circle';
      case 'failed':
        return 'error';
      case 'expired':
        return 'schedule';
      default:
        return 'hourglass_empty';
    }
  }

  /**
   * Get status color
   */
  getStatusColor(status: string): string {
    switch (status) {
      case 'success':
        return 'accent'; // green
      case 'failed':
        return 'warn'; // red
      case 'expired':
        return 'warn';
      default:
        return 'primary'; // blue
    }
  }
}
