import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { presentationManagementControllerGetOffer, sessionControllerGetSession } from '@eudiplo/sdk';

export interface VerificationResult {
  sessionId: string;
  status: 'active' | 'completed' | 'failed' | 'expired';
  presentedCredentials: PresentedCredential[];
  rawCredentials?: any[];
  message?: string;
  timestamp: number;
}

export interface PresentedCredential {
  type: string;
  issuer?: string;
  expiryDate?: number;
  verified: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class VerificationStatusService {
  private verificationResultSubject = new BehaviorSubject<VerificationResult | null>(null);
  public verificationResult$ = this.verificationResultSubject.asObservable();

  private pollIntervalMs = 2000; // Poll every 2 seconds
  private pollTimeoutId?: any;
  private sessionId?: string;

  constructor() {}

  /**
   * Start verification flow - creates offer and starts polling
   */
  async start(presentationId: string): Promise<string> {
    this.clearResult();

    const response = await presentationManagementControllerGetOffer({
      body: {
        response_type: 'uri',
        requestId: presentationId,
      }
    });

    this.sessionId = response.data.session;

    // Initialize with pending status
    this.verificationResultSubject.next({
      sessionId: this.sessionId,
      status: 'active',
      presentedCredentials: [],
      timestamp: Date.now(),
    });

    // Start polling
    this.startPolling(this.sessionId);

    return response.data.uri;
  }

  /**
   * Start polling for verification result
   */
  private startPolling(sessionId: string): void {
    this.stopPolling();
    this.poll(sessionId);
  }

  /**
   * Stop polling
   */
  stopPolling(): void {
    if (this.pollTimeoutId) {
      clearTimeout(this.pollTimeoutId);
      this.pollTimeoutId = undefined;
    }
  }

  /**
   * Get current verification result
   */
  getResult(): VerificationResult | null {
    return this.verificationResultSubject.value;
  }

  /**
   * Poll for verification status from backend
   */
  private async poll(sessionId: string): Promise<void> {
    try {
      const response = await sessionControllerGetSession({
        path: { id: sessionId }
      });

      console.log('Session status:', response.data.status);

      const status = response.data.status as 'active' | 'completed' | 'failed' | 'expired';

      console.log(response.data);

      // Map credentials to PresentedCredential format
      const presentedCredentials: PresentedCredential[] = (response.data.credentials || []).map((cred: any) => ({
        type: cred.type || 'Unknown',
        issuer: cred.issuer,
        expiryDate: cred.expiryDate,
        verified: true, // Assume verified if returned by backend
      }));

      const result: VerificationResult = {
        sessionId,
        status,
        presentedCredentials,
        rawCredentials: response.data.credentials || [],
        timestamp: Date.now(),
        message: this.getStatusMessage(status),
      };

      this.verificationResultSubject.next(result);

      // Continue polling if status is pending
      if (status === 'active') {
        this.pollTimeoutId = setTimeout(() => this.poll(sessionId), this.pollIntervalMs);
      } else {
        // Stop polling when complete
        console.log('Verification complete with status:', status);
        this.stopPolling();
      }
    } catch (err) {
      console.warn('Polling error:', err);
      // Retry on error with exponential backoff
      this.pollTimeoutId = setTimeout(() => this.poll(sessionId), this.pollIntervalMs * 2);
    }
  }

  /**
   * Get user-friendly status message
   */
  private getStatusMessage(status: string): string {
    switch (status) {
      case 'completed':
        return 'Credentials successfully verified';
      case 'failed':
        return 'Verification failed';
      case 'expired':
        return 'Verification request expired';
      case 'pending':
      default:
        return 'Waiting for credential presentation...';
    }
  }

  /**
   * Clear result and stop polling
   */
  clearResult(): void {
    this.verificationResultSubject.next(null);
    this.stopPolling();
    this.sessionId = undefined;
  }

  /**
   * Set polling interval (in ms)
   */
  setPollInterval(ms: number): void {
    this.pollIntervalMs = ms;
  }
}
