import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface VerificationResult {
  sessionId: string;
  status: 'pending' | 'success' | 'failed' | 'expired';
  presentedCredentials: PresentedCredential[];
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

  private pollIntervalMs = 1000; // Poll every 1 second
  private pollTimeoutId?: any;

  constructor() {}

  /**
   * Start polling for verification result
   */
  startPolling(sessionId: string): void {
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
   * Simulate verification result (mock for now, will integrate with backend)
   */
  private async poll(sessionId: string): Promise<void> {
    try {
      // TODO: Replace with actual backend call to fetch verification status
      // For now, we simulate polling behavior
      const result = await this.fetchVerificationStatus(sessionId);

      if (result) {
        this.verificationResultSubject.next(result);

        // Stop polling if verification is complete
        if (result.status !== 'pending') {
          return;
        }
      }

      // Schedule next poll
      this.pollTimeoutId = setTimeout(() => this.poll(sessionId), this.pollIntervalMs);
    } catch (err) {
      console.warn('Polling error:', err);
      // Retry on error
      this.pollTimeoutId = setTimeout(() => this.poll(sessionId), this.pollIntervalMs * 2);
    }
  }

  /**
   * Fetch verification status from backend (stub)
   */
  private async fetchVerificationStatus(sessionId: string): Promise<VerificationResult | null> {
    // TODO: Call backend API endpoint
    // For now, return mock successful result after 5 seconds
    const currentResult = this.verificationResultSubject.value;
    if (!currentResult || currentResult.status === 'pending') {
      // Simulate delay and eventual success
      return null; // Keep polling
    }
    return currentResult;
  }

  /**
   * Manually set a verification result (for testing/demo)
   */
  setMockResult(result: VerificationResult): void {
    this.verificationResultSubject.next(result);
  }

  /**
   * Clear result
   */
  clearResult(): void {
    this.verificationResultSubject.next(null);
    this.stopPolling();
  }

  /**
   * Set polling interval (in ms)
   */
  setPollInterval(ms: number): void {
    this.pollIntervalMs = ms;
  }
}
