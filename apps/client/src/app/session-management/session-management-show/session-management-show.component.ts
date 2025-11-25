import { Component, type OnDestroy, type OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FlexLayoutModule } from 'ngx-flexible-layout';
import * as QRCode from 'qrcode';
import { Session } from '../../generated';
import { SessionManagementService } from '../session-management.service';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { decodeJwt } from 'jose';
@Component({
  selector: 'app-session-management-show',
  imports: [
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    RouterModule,
    FlexLayoutModule,
    MatTabsModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
  templateUrl: './session-management-show.component.html',
  styleUrl: './session-management-show.component.scss',
})
export class SessionManagementShowComponent implements OnInit, OnDestroy {
  session: Session | null = null;
  loading = false;

  // QR Code functionality
  qrCodeDataUrl: string | null = null;
  generatingQR = false;

  // Status polling properties
  pollingInterval: any = null;
  readonly POLLING_INTERVAL_MS = 3000; // Poll every 3 seconds
  readonly MAX_POLLING_DURATION_MS = 300000; // Stop polling after 5 minutes
  pollingStartTime: number | null = null;
  offerUri: string | null = null;
  metadata?: any;

  constructor(
    private sessionManagementService: SessionManagementService,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar,
    private router: Router,
    private httpClient: HttpClient
  ) {}

  async ngOnInit(): Promise<void> {
    const sessionId = this.route.snapshot.params['id'];
    await this.loadSession(sessionId);
    await this.startPolling(sessionId);
  }

  ngOnDestroy(): void {
    this.stopPolling();
  }

  async loadSession(sessionId: string): Promise<void> {
    this.loading = true;
    try {
      this.session = await this.sessionManagementService.getSession(sessionId);
      this.generateQRCode(this.session.offerUrl || this.session.requestUrl!);

      this.getIssuerMetadata();
    } catch (error) {
      console.error('Error loading session:', error);
      this.snackBar.open('Failed to load session', 'Close', {
        duration: 3000,
      });
      this.router.navigate(['../'], { relativeTo: this.route });
    } finally {
      this.loading = false;
    }
  }

  printJWT(jwt: string) {
    if (!jwt) return 'No JWT data available';

    try {
      // Decode and pretty-print the JWT payload
      const decodedPayload = decodeJwt(jwt);
      return JSON.stringify(decodedPayload, null, 2);
    } catch (error) {
      console.error('Error decoding JWT:', error);
      return `Error decoding JWT: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
  }

  getIssuerMetadata(): void {
    if (!this.session?.offer) return;
    const url = new URL((this.session.offer as any).credential_issuer);
    firstValueFrom(
      this.httpClient.get(`${url.origin}/.well-known/openid-credential-issuer${url.pathname}`)
    ).then((res) => (this.metadata = res));
  }

  getStatusDisplayText(status: any): string {
    if (!status) return 'Unknown';
    if (typeof status === 'string') return status;
    if (typeof status === 'object') {
      return Object.entries(status)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');
    }
    return JSON.stringify(status);
  }

  async getDcApiCall() {
    if (!this.session?.requestUrl) return;

    if (
      !('credentials' in navigator) ||
      !('get' in navigator.credentials) ||
      !('DigitalCredential' in window)
    ) {
      console.warn('Digital Credentials API not available — handing off via deep link.');
      return;
    }

    console.log('Calling Digital Credentials API (signed)…');
    const dcResponse = await navigator.credentials.get({
      mediation: 'required',
      digital: {
        requests: [
          { protocol: 'openid4vp-v1-signed', data: { request: this.session.requestObject } },
        ],
      },
    } as CredentialRequestOptions);

    if (dcResponse?.data?.error) {
      console.error('Wallet protocol error:', dcResponse.data.error, dcResponse.data);
      throw new Error(dcResponse.data.error);
    }

    const responseUri = decodeJwt<any>(this.session.requestObject!).response_uri;
    const submitRes = await firstValueFrom(
      this.httpClient.post(responseUri, { ...dcResponse!.data, sendResponse: true })
    );
    console.log('Verifier response:', submitRes);
  }

  getStatusClass(status: any): string {
    const statusStr = this.getStatusDisplayText(status).toLowerCase();
    if (statusStr.includes('completed') || statusStr.includes('success')) return 'status-success';
    if (statusStr.includes('pending') || statusStr.includes('processing')) return 'status-pending';
    if (statusStr.includes('failed') || statusStr.includes('error')) return 'status-error';
    return 'status-default';
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString();
  }

  formatJson(obj: any): string {
    if (!obj) return 'N/A';
    return JSON.stringify(obj, null, 2);
  }

  goBack(): void {
    this.router.navigate(['../'], { relativeTo: this.route });
  }

  copyToClipboard(text: string): void {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        this.snackBar.open('Copied to clipboard', 'Close', {
          duration: 2000,
        });
      })
      .catch(() => {
        this.snackBar.open('Failed to copy to clipboard', 'Close', {
          duration: 3000,
        });
      });
  }

  // QR Code functionality
  async generateQRCode(uri: string): Promise<void> {
    if (!uri) return;

    this.offerUri = uri;

    this.generatingQR = true;
    try {
      this.qrCodeDataUrl = await QRCode.toDataURL(uri, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });
    } catch (error) {
      console.error('Error generating QR code:', error);
      this.qrCodeDataUrl = null;
      this.snackBar.open('Failed to generate QR code', 'Close', {
        duration: 3000,
      });
    } finally {
      this.generatingQR = false;
    }
  }

  // Status polling functionality
  startPolling(sessionId: string): void {
    this.stopPolling();
    this.pollingStartTime = Date.now();

    // Set up interval
    this.pollingInterval = setInterval(() => {
      const elapsed = Date.now() - (this.pollingStartTime || 0);

      if (elapsed >= this.MAX_POLLING_DURATION_MS) {
        this.stopPolling();
        return;
      }

      this.fetchSessionStatus(sessionId);
    }, this.POLLING_INTERVAL_MS);
  }

  stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
      this.pollingStartTime = null;
    }
  }

  async fetchSessionStatus(sessionId: string): Promise<void> {
    try {
      const previousStatus = this.session ? this.getSessionStatusValue(this.session) : null;
      const updatedSession = await this.sessionManagementService.getSession(sessionId);
      const currentStatus = this.getSessionStatusValue(updatedSession);

      this.session = updatedSession;

      // Notify user of status changes
      if (previousStatus && previousStatus !== currentStatus) {
        this.snackBar.open(`Session status: ${currentStatus}`, 'Close', {
          duration: 4000,
          panelClass: this.getStatusSnackbarClass(currentStatus),
        });

        // Stop polling if session is in a final state
        if (['completed', 'expired', 'failed'].includes(currentStatus)) {
          this.stopPolling();
        }
      }
    } catch (error) {
      console.error('Error fetching session status:', error);
      // Don't show error to user for polling failures, just log them
    }
  }

  getSessionStatusValue(session: Session): string {
    // Extract status from the session.status object or return a default
    if (typeof session.status === 'object' && session.status !== null) {
      const statusObj = session.status as any;
      if (
        statusObj.status &&
        ['active', 'completed', 'expired', 'failed'].includes(statusObj.status)
      ) {
        return statusObj.status;
      }
      if (
        statusObj.state &&
        ['active', 'completed', 'expired', 'failed'].includes(statusObj.state)
      ) {
        return statusObj.state;
      }
    } else if (
      typeof session.status === 'string' &&
      ['active', 'completed', 'expired', 'failed'].includes(session.status)
    ) {
      return session.status;
    }
    return 'active';
  }

  getStatusSnackbarClass(status: string): string[] {
    switch (status) {
      case 'completed':
        return ['success-snackbar'];
      case 'failed':
      case 'expired':
        return ['error-snackbar'];
      default:
        return [];
    }
  }

  isPolling(): boolean {
    return this.pollingInterval !== null;
  }

  // Helper to check if this is an issuance session that might have a QR code
  isIssuanceSession(): boolean {
    return !this.session?.requestId;
  }

  // Get the offer URI if available in session data
  getOfferUri(): string | null {
    if (!this.session || this.session.status !== 'active') return null;
    return this.offerUri;
  }
}
