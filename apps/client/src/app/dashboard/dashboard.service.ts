import { Injectable } from '@angular/core';
import {
  credentialConfigControllerGetConfigs,
  presentationManagementControllerConfiguration,
  sessionControllerGetAllSessions,
  keyControllerGetKeys,
  issuanceConfigControllerGetIssuanceConfigurations,
  certControllerGetCertificates,
} from '@eudiplo/sdk-core';
import { JwtService } from '../services/jwt.service';

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

  constructor(private readonly jwtService: JwtService) {}

  async getCounters(): Promise<void> {
    this.isLoading = true;
    // Reset counters
    this.sessionActive = 0;
    this.sessionCompleted = 0;
    this.sessionFetched = 0;
    this.sessionFailed = 0;
    this.sessionExpired = 0;

    try {
      // Build list of promises based on user roles
      const promises: Promise<any>[] = [];
      const promiseKeys: string[] = [];

      // Keys and certs require issuance:manage OR presentation:manage
      const canManageKeysAndCerts =
        this.jwtService.hasRole('issuance:manage') ||
        this.jwtService.hasRole('presentation:manage');

      if (canManageKeysAndCerts) {
        promises.push(keyControllerGetKeys());
        promiseKeys.push('keys');
        promises.push(certControllerGetCertificates());
        promiseKeys.push('certs');
      }

      // Credential configs require issuance:manage
      if (this.jwtService.hasRole('issuance:manage')) {
        promises.push(credentialConfigControllerGetConfigs());
        promiseKeys.push('credentials');
        promises.push(issuanceConfigControllerGetIssuanceConfigurations());
        promiseKeys.push('issuance');
      }

      // Presentation configs require presentation:manage
      if (this.jwtService.hasRole('presentation:manage')) {
        promises.push(presentationManagementControllerConfiguration());
        promiseKeys.push('presentations');
      }

      // Sessions require issuance:offer OR presentation:request
      if (
        this.jwtService.hasRole('issuance:offer') ||
        this.jwtService.hasRole('presentation:request')
      ) {
        promises.push(sessionControllerGetAllSessions());
        promiseKeys.push('sessions');
      }

      const results = await Promise.allSettled(promises);

      // Process results based on their keys
      results.forEach((result, index) => {
        const key = promiseKeys[index];
        if (result.status === 'fulfilled') {
          switch (key) {
            case 'credentials':
              this.credentialConfigs = result.value.data.length;
              break;
            case 'presentations':
              this.presentationConfigs = result.value.data.length;
              break;
            case 'sessions':
              result.value.data.forEach((session: { status: string }) => {
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
              break;
            case 'keys':
              this.totalKeys = result.value.data.length;
              break;
            case 'certs':
              this.totalCertificates = result.value.data.length;
              break;
            case 'issuance':
              this.hasIssuanceConfig = !!result.value.data;
              break;
          }
        }
      });
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
    } finally {
      this.isLoading = false;
    }
  }

  // Role-based visibility helpers
  get canManageKeysAndCerts(): boolean {
    return (
      this.jwtService.hasRole('issuance:manage') || this.jwtService.hasRole('presentation:manage')
    );
  }

  get canManageIssuance(): boolean {
    return this.jwtService.hasRole('issuance:manage');
  }

  get canManagePresentation(): boolean {
    return this.jwtService.hasRole('presentation:manage');
  }

  get canViewSessions(): boolean {
    return (
      this.jwtService.hasRole('issuance:offer') || this.jwtService.hasRole('presentation:request')
    );
  }

  // Prerequisites check - only relevant if user can manage keys/certs
  get hasPrerequisites(): boolean {
    if (!this.canManageKeysAndCerts) {
      return true; // Not relevant for this user
    }
    return this.totalKeys > 0 && this.totalCertificates > 0;
  }

  // Issuance readiness
  get isReadyToIssue(): boolean {
    if (!this.canManageIssuance) {
      return false; // User can't manage issuance
    }
    return this.hasPrerequisites && this.hasIssuanceConfig && this.credentialConfigs > 0;
  }

  // Verification readiness
  get isReadyToVerify(): boolean {
    if (!this.canManagePresentation) {
      return false; // User can't manage presentations
    }
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
