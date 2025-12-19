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
import { VerificationStatusService, VerificationResult } from '../services/verification-status.service';
import { CredentialsService } from '../services/credentials.service';
import { FlexLayoutModule } from 'ngx-flexible-layout';

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
    FlexLayoutModule
  ],
  templateUrl: './verification-status.component.html',
  styleUrls: ['./verification-status.component.scss'],
})
export class VerificationStatusComponent implements OnInit, OnDestroy {
  qrSrc?: string;
  url?: string;
  loading = true;
  error?: string;

  constructor(
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
      // Get credential configuration
      const credential = this.credentialsService.getCredential();
      if (!credential) {
        this.error = 'No connection configuration found. Please go back and import configuration.';
        this.loading = false;
        return;
      }

      // Start verification and get offer URI
      const offerUri = await this.verificationStatusService.start(credential.presentationId);
      this.url = offerUri;

      // Generate QR code
      this.qrSrc = await QRCode.toDataURL(offerUri, { width: 300 });

      this.loading = false;
    } catch (err: any) {
      this.error = `Failed to start verification: ${err?.message || String(err)}`;
      this.loading = false;
    }
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
    return result?.status === 'completed' && (result?.presentedCredentials || []).length > 0;
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

  /**
   * Get credential data keys (excluding standard JWT fields)
   */
  getCredentialDataKeys(value: any): string[] {
    if (!value) return [];
    const standardKeys = ['iat', 'exp', 'vct', 'iss', 'nbf', 'jti', 'sub', 'aud'];
    return Object.keys(value).filter(key => !standardKeys.includes(key));
  }

  /**
   * Check if a value is an object
   */
  isObject(value: any): boolean {
    return value !== null && typeof value === 'object';
  }

  /**
   * Check if credential is still valid based on expiration timestamp
   */
  isCredentialValid(value: any): boolean {
    if (!value || !value.exp) return true; // If no expiration, assume valid
    const now = Math.floor(Date.now() / 1000); // Current time in seconds
    return value.exp > now;
  }

  /**
   * Recursively render credential field with nested structures
   */
  renderCredentialField(key: string, value: any, depth: number = 0): string {
    const isArray = Array.isArray(value);
    const isObj = this.isObject(value) && !isArray;

    if (isObj) {
      let html = `<div class="field-object" data-depth="${depth}">`;
      html += `<strong class="field-key">${key}:</strong>`;
      html += '<div class="field-nested">';
      Object.keys(value).forEach(subKey => {
        html += this.renderCredentialField(subKey, value[subKey], depth + 1);
      });
      html += '</div></div>';
      return html;
    } else if (isArray) {
      let html = `<div class="field-array" data-depth="${depth}">`;
      html += `<strong class="field-key">${key}:</strong>`;
      html += '<div class="field-nested">';
      value.forEach((item: any, index: number) => {
        if (this.isObject(item)) {
          html += `<div class="array-index"><em>[${index}]</em></div>`;
          Object.keys(item).forEach(subKey => {
            html += this.renderCredentialField(subKey, item[subKey], depth + 1);
          });
        } else {
          html += `<div class="array-item" data-depth="${depth + 1}">[${index}]: ${item}</div>`;
        }
      });
      html += '</div></div>';
      return html;
    } else {
      return `<div class="field-value" data-depth="${depth}">
        <strong class="field-key">${key}:</strong>
        <span class="field-data">${value}</span>
      </div>`;
    }
  }
}
