import { Injectable } from '@angular/core';
import {
  credentialConfigControllerGetConfigs,
  presentationManagementControllerConfiguration,
  sessionControllerGetAllSessions,
  keyControllerGetKeys,
  issuanceConfigControllerGetIssuanceConfigurations,
  certControllerGetCertificates,
} from '@eudiplo/sdk';

export interface DashboardStats {
  credentialConfigs: number;
  presentationConfigs: number;
  sessionActive: number;
  sessionCompleted: number;
  sessionFetched: number;
  sessionFailed: number;
  sessionExpired: number;
  totalKeys: number;
  totalCertificates: number;
  hasIssuanceConfig: boolean;
  isLoading: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  credentialConfigs = 0;
  presentationConfigs = 0;
  sessionActive = 0;
  sessionCompleted = 0;
  sessionFetched = 0;
  sessionFailed = 0;
  sessionExpired = 0;
  totalKeys = 0;
  totalCertificates = 0;
  hasIssuanceConfig = false;
  isLoading = true;

  async getCounters(): Promise<void> {
    this.isLoading = true;
    // Reset counters
    this.sessionActive = 0;
    this.sessionCompleted = 0;
    this.sessionFetched = 0;
    this.sessionFailed = 0;
    this.sessionExpired = 0;

    try {
      const [credentialRes, presentationRes, sessionRes, keysRes, certsRes, issuanceRes] =
        await Promise.allSettled([
          credentialConfigControllerGetConfigs(),
          presentationManagementControllerConfiguration(),
          sessionControllerGetAllSessions(),
          keyControllerGetKeys(),
          certControllerGetCertificates(),
          issuanceConfigControllerGetIssuanceConfigurations(),
        ]);

      if (credentialRes.status === 'fulfilled') {
        this.credentialConfigs = credentialRes.value.data.length;
      }

      if (presentationRes.status === 'fulfilled') {
        this.presentationConfigs = presentationRes.value.data.length;
      }

      if (sessionRes.status === 'fulfilled') {
        sessionRes.value.data.forEach((session) => {
          switch (session.status) {
            case 'active':
              this.sessionActive++;
              break;
            case 'completed':
              this.sessionCompleted++;
              break;
            case 'fetched':
              this.sessionFetched++;
              break;
            case 'failed':
              this.sessionFailed++;
              break;
            case 'expired':
              this.sessionExpired++;
              break;
          }
        });
      }

      if (keysRes.status === 'fulfilled') {
        this.totalKeys = keysRes.value.data.length;
      }

      if (certsRes.status === 'fulfilled') {
        this.totalCertificates = certsRes.value.data.length;
      }

      if (issuanceRes.status === 'fulfilled') {
        this.hasIssuanceConfig = !!issuanceRes.value.data;
      }
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
    } finally {
      this.isLoading = false;
    }
  }

  // Prerequisites check
  get hasPrerequisites(): boolean {
    return this.totalKeys > 0 && this.totalCertificates > 0;
  }

  // Issuance readiness
  get isReadyToIssue(): boolean {
    return this.hasPrerequisites && this.hasIssuanceConfig && this.credentialConfigs > 0;
  }

  // Verification readiness
  get isReadyToVerify(): boolean {
    return this.hasPrerequisites && this.presentationConfigs > 0;
  }

  // Overall setup complete (at least one path is ready)
  get isSetupComplete(): boolean {
    return this.isReadyToIssue || this.isReadyToVerify;
  }

  // Show setup guide if prerequisites are not met OR neither path is ready
  get showSetupGuide(): boolean {
    return !this.hasPrerequisites || (!this.isReadyToIssue && !this.isReadyToVerify);
  }

  get setupProgress(): number {
    const totalSteps = 4; // key, cert, (issuance OR presentation)
    let completedSteps = 0;

    if (this.totalKeys > 0) completedSteps++;
    if (this.totalCertificates > 0) completedSteps++;
    if (this.hasIssuanceConfig && this.credentialConfigs > 0) completedSteps++;
    if (this.presentationConfigs > 0) completedSteps++;

    // Max is 100% when at least one path is complete
    const maxSteps = this.totalKeys > 0 && this.totalCertificates > 0 ? 4 : 2;
    return Math.round((completedSteps / Math.min(totalSteps, maxSteps)) * 100);
  }
}
