import { Injectable } from '@angular/core';
import {
  credentialConfigControllerGetConfigs,
  presentationManagementControllerConfiguration,
  sessionControllerGetAllSessions,
  sessionControllerGetSessionStats,
  keyChainControllerGetAll,
  issuanceConfigControllerGetIssuanceConfigurations,
  registrarControllerGetConfig,
  trustListControllerGetAllTrustLists,
  KeyChainResponseDto,
  Session,
  SessionStatsResponseDto,
  SessionStatusCountsDto,
} from '@eudiplo/sdk-core';
import { JwtService } from '../services/jwt.service';
import { apiErrorDetail, hasHttpStatus } from '../utils/error-message';

type AccessCertificateStatus = 'missing' | 'expired' | 'expiring' | 'healthy';

/** One backend request of the dashboard. */
export type DashboardSource =
  | 'keyChains'
  | 'credentials'
  | 'issuance'
  | 'presentations'
  | 'trustLists'
  | 'registrar'
  | 'sessionStats'
  | 'recentSessions';

const sourceLabels: Record<DashboardSource, string> = {
  keyChains: 'key chains',
  credentials: 'credential configs',
  issuance: 'issuer settings',
  presentations: 'presentation configs',
  trustLists: 'trust lists',
  registrar: 'registrar config',
  sessionStats: 'session counts',
  recentSessions: 'recent sessions',
};

export interface DashboardWarning {
  message: string;
  /** Route to the page that fixes the cause. */
  action?: { label: string; route: string[] };
  /** The cause is a failed request that loading again may fix. */
  retry?: boolean;
}

/** Network errors, timeouts, rate limits and server errors can pass on a retry. */
function isRetryable(error: unknown): boolean {
  const status = (error as { statusCode?: unknown } | null | undefined)?.statusCode;
  return typeof status !== 'number' || status >= 500 || status === 408 || status === 429;
}

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  private readonly accessCertificateExpiringSoonDays = 30;
  private readonly loadedSources = new Set<DashboardSource>();
  /** Why each failed request failed. */
  private readonly failedSources = new Map<DashboardSource, unknown>();
  private loadId = 0;

  credentialConfigs = 0;
  presentationConfigs = 0;
  /** Only holds the session types the user may read. */
  sessionStats: SessionStatsResponseDto = {};
  totalKeyChains = 0;
  accessKeyChains = 0;
  /** The access key chain whose certificate needs attention, or the one in use. */
  accessKeyChainId: string | null = null;
  hasActiveAccessCertificate = false;
  hasUsableAccessCertificate = false;
  accessCertificateStatus: AccessCertificateStatus = 'missing';
  accessCertificateExpiresAt: string | null = null;
  accessCertificateDaysUntilExpiry: number | null = null;
  trustListCount = 0;
  hasTrustList = false;
  hasRegistrarConfig = false;
  hasIssuanceConfig = false;
  recentSessions: Session[] = [];
  isLoading = true;
  /** When the last load finished. */
  lastUpdatedAt: Date | null = null;

  constructor(private readonly jwtService: JwtService) {}

  /**
   * Loads all dashboard data the user's roles allow. With `keepPrevious` the
   * previous values stay visible until the new ones arrive; a first load
   * starts empty, so no data of a previously signed-in user shows.
   */
  async getCounters({ keepPrevious = false } = {}): Promise<void> {
    const loadId = ++this.loadId;
    this.isLoading = true;
    if (!keepPrevious) {
      this.reset();
      this.lastUpdatedAt = null;
    }

    // Build list of promises based on user roles
    const promises: Promise<any>[] = [];
    const promiseKeys: DashboardSource[] = [];

    if (this.canManageKeyChains) {
      promises.push(keyChainControllerGetAll());
      promiseKeys.push('keyChains');
    }

    // Credential configs require issuance:manage
    if (this.jwtService.hasRole('issuance:manage')) {
      promises.push(credentialConfigControllerGetConfigs());
      promiseKeys.push('credentials');
      promises.push(issuanceConfigControllerGetIssuanceConfigurations());
      promiseKeys.push('issuance');
    }

    // Presentation configs require presentation:manage OR presentation:request
    if (this.canReadPresentationConfigs) {
      promises.push(presentationManagementControllerConfiguration());
      promiseKeys.push('presentations');
    }

    // Trust lists require presentation:manage
    if (this.canManagePresentation) {
      promises.push(trustListControllerGetAllTrustLists());
      promiseKeys.push('trustLists');
    }

    // Sessions require issuance:offer OR presentation:request
    if (this.canViewSessions) {
      promises.push(sessionControllerGetSessionStats());
      promiseKeys.push('sessionStats');
      promises.push(
        sessionControllerGetAllSessions({
          query: { pageSize: 5, sortBy: 'updatedAt', sortOrder: 'desc' },
        })
      );
      promiseKeys.push('recentSessions');
    }

    if (this.canManageRegistrar) {
      promises.push(registrarControllerGetConfig());
      promiseKeys.push('registrar');
    }

    const results = await Promise.allSettled(promises);
    // A newer load has started; its results win.
    if (loadId !== this.loadId) return;

    this.reset();
    results.forEach((result, index) => {
      const key = promiseKeys[index];
      if (result.status === 'fulfilled') {
        try {
          this.apply(key, result.value.data);
        } catch (error) {
          // The response does not have the expected shape; treat it like a failed request.
          console.error(`Unexpected ${sourceLabels[key]} response for the dashboard:`, error);
          this.failedSources.set(key, { message: 'the response has an unexpected format' });
          return;
        }
      } else if (!(key === 'registrar' && hasHttpStatus(result.reason, 404))) {
        // The registrar answers 404 while it is not configured; anything else is a failure.
        console.error(`Failed to load ${sourceLabels[key]} for the dashboard:`, result.reason);
        this.failedSources.set(key, result.reason);
        return;
      }
      this.loadedSources.add(key);
    });
    this.lastUpdatedAt = new Date();
    this.isLoading = false;
  }

  /** At least one load has finished. */
  get hasLoaded(): boolean {
    return this.lastUpdatedAt !== null;
  }

  isLoaded(source: DashboardSource): boolean {
    return this.loadedSources.has(source);
  }

  hasFailed(source: DashboardSource): boolean {
    return this.failedSources.has(source);
  }

  // Role-based visibility helpers
  // Key chains require issuance:manage OR presentation:manage
  get canManageKeyChains(): boolean {
    return this.jwtService.hasRole(['issuance:manage', 'presentation:manage']);
  }

  get canManageIssuance(): boolean {
    return this.jwtService.hasRole('issuance:manage');
  }

  get canManagePresentation(): boolean {
    return this.jwtService.hasRole('presentation:manage');
  }

  get canManageRegistrar(): boolean {
    return this.jwtService.hasRole('registrar:manage');
  }

  get isReadOnly(): boolean {
    return !this.canManageIssuance && !this.canManagePresentation;
  }

  get canOfferIssuance(): boolean {
    return this.jwtService.hasRole('issuance:offer');
  }

  get canViewSessions(): boolean {
    return this.canOfferIssuance || this.jwtService.hasRole('presentation:request');
  }

  get canReadPresentationConfigs(): boolean {
    return this.canManagePresentation || this.jwtService.hasRole('presentation:request');
  }

  get totalSessions(): number {
    return (this.sessionStats.issuance?.total ?? 0) + (this.sessionStats.presentation?.total ?? 0);
  }

  get sessionActive(): number {
    return this.countSessions('active');
  }

  get sessionFetched(): number {
    return this.countSessions('fetched');
  }

  get sessionCompleted(): number {
    return this.countSessions('completed');
  }

  get sessionExpired(): number {
    return this.countSessions('expired');
  }

  get sessionFailed(): number {
    return this.countSessions('failed');
  }

  get sessionCancelled(): number {
    return this.countSessions('cancelled');
  }

  get lastSuccessfulIssuanceAt(): string | null {
    return this.sessionStats.issuance?.lastCompletedAt ?? null;
  }

  get lastSuccessfulPresentationAt(): string | null {
    return this.sessionStats.presentation?.lastCompletedAt ?? null;
  }

  /** At least one health signal of the operational health card applies to the user. */
  get hasHealthSignals(): boolean {
    return (
      this.canManageKeyChains ||
      this.canManagePresentation ||
      this.canManageRegistrar ||
      !!this.sessionStats.issuance ||
      !!this.sessionStats.presentation
    );
  }

  // Prerequisites check - only relevant if user can manage key chains
  get hasPrerequisites(): boolean {
    return this.prerequisiteReason === null;
  }

  // Issuance readiness
  get isReadyToIssue(): boolean {
    if (!this.canManageIssuance) {
      return false; // User can't manage issuance
    }
    return this.issueReadinessReason === null;
  }

  // Verification readiness
  get isReadyToVerify(): boolean {
    if (!this.canReadPresentationConfigs) {
      return false; // User can't see presentation configs
    }
    return this.verifyReadinessReason === null;
  }

  // Overall setup complete (at least one path is ready)
  // Request-only access to presentations is not a setup the user completed
  private get isVerificationSetUp(): boolean {
    return this.canManagePresentation && this.isReadyToVerify;
  }

  get isSetupComplete(): boolean {
    return this.isReadyToIssue || this.isVerificationSetUp;
  }

  // Show setup guide if prerequisites are not met OR neither path is ready
  get showSetupGuide(): boolean {
    // A failed request would show steps as missing; the warning offers a retry instead.
    if (this.isReadOnly || this.setupSources.some((source) => this.hasFailed(source))) {
      return false;
    }

    return !this.hasPrerequisites || (!this.isReadyToIssue && !this.isVerificationSetUp);
  }

  get issueReadinessReason(): string | null {
    if (!this.canManageIssuance) {
      // The issuance form lists credential configs, which need issuance:manage.
      return this.canOfferIssuance
        ? 'The issuance form needs the issuance:manage role'
        : 'Read-only: missing issuance:manage role';
    }
    const prerequisite = this.prerequisiteReason;
    if (prerequisite) {
      return prerequisite;
    }
    if (this.hasFailed('issuance')) {
      return 'Issuer settings could not be loaded';
    }
    if (this.hasFailed('credentials')) {
      return 'Credential configs could not be loaded';
    }
    if (!this.hasIssuanceConfig) {
      return 'No issuer settings';
    }
    if (this.credentialConfigs === 0) {
      return 'No credential config';
    }
    return null;
  }

  get verifyReadinessReason(): string | null {
    if (!this.canReadPresentationConfigs) {
      return 'Read-only: missing presentation:manage or presentation:request role';
    }
    const prerequisite = this.prerequisiteReason;
    if (prerequisite) {
      return prerequisite;
    }
    if (this.hasFailed('presentations')) {
      return 'Presentation configs could not be loaded';
    }
    if (this.presentationConfigs === 0) {
      return this.canManagePresentation
        ? 'No presentation config'
        : 'No presentation config; ask a user with presentation:manage to create one';
    }
    return null;
  }

  // Key chains are only loaded for users who can manage them; not relevant otherwise.
  private get prerequisiteReason(): string | null {
    if (!this.canManageKeyChains) {
      return null;
    }
    if (this.hasFailed('keyChains')) {
      return 'Key chains could not be loaded';
    }
    if (this.totalKeyChains === 0) {
      return 'No key chain configured';
    }
    if (this.accessKeyChains === 0) {
      return 'No access key chain configured';
    }
    if (!this.hasActiveAccessCertificate) {
      return 'No access certificate configured';
    }
    if (!this.hasUsableAccessCertificate) {
      return 'Access certificate is expired';
    }
    return null;
  }

  /** The requests the setup guide relies on. */
  private get setupSources(): DashboardSource[] {
    const sources: DashboardSource[] = [];
    if (this.canManageKeyChains) sources.push('keyChains');
    if (this.canManageIssuance) sources.push('credentials', 'issuance');
    if (this.canManagePresentation) sources.push('presentations');
    return sources;
  }

  /** Where to fix the access certificate: the affected key chain, or a new one. */
  get accessCertificateRoute(): string[] {
    return this.accessKeyChainId ? ['/keys', this.accessKeyChainId] : ['/keys/create'];
  }

  get accessCertificateStatusLabel(): string {
    switch (this.accessCertificateStatus) {
      case 'healthy':
        return 'Healthy';
      case 'expiring':
        return 'Expiring soon';
      case 'expired':
        return 'Expired';
      default:
        return 'Missing';
    }
  }

  get warnings(): DashboardWarning[] {
    const warnings: DashboardWarning[] = [];
    for (const [source, reason] of this.failedSources) {
      const detail = apiErrorDetail(reason);
      warnings.push({
        message: detail
          ? `Could not load ${sourceLabels[source]}: ${detail}`
          : `Could not load ${sourceLabels[source]}.`,
        retry: isRetryable(reason),
      });
    }

    const certificateWarning = this.accessCertificateWarning;
    if (certificateWarning) {
      warnings.push(certificateWarning);
    }

    if (this.canManagePresentation && this.isLoaded('trustLists') && !this.hasTrustList) {
      warnings.push({
        message: 'No trust list configured. Presentation trust-chain validation may fail.',
        action: { label: 'Add Trust List', route: ['/trust-list/create'] },
      });
    }

    if (this.canManageRegistrar && this.isLoaded('registrar') && !this.hasRegistrarConfig) {
      warnings.push({
        message:
          'Registrar is not configured. Access certificate enrollment via registrar is unavailable.',
        action: { label: 'Configure Registrar', route: ['/registrar'] },
      });
    }

    return warnings;
  }

  // A missing or expired certificate blocks the setup, so the setup guide shows it with a link.
  private get accessCertificateWarning(): DashboardWarning | null {
    // Key chains are only loaded for users who can manage them.
    if (!this.canManageKeyChains || !this.isLoaded('keyChains')) {
      return null;
    }
    if (this.accessCertificateStatus === 'expiring') {
      return {
        message: `Access certificate expires within ${this.accessCertificateExpiringSoonDays} days. Plan renewal to avoid interruptions.`,
        action: { label: 'Open Access Key Chain', route: this.accessCertificateRoute },
      };
    }
    return null;
  }

  get hasWarnings(): boolean {
    return this.warnings.length > 0;
  }

  private reset(): void {
    this.loadedSources.clear();
    this.failedSources.clear();
    this.sessionStats = {};
    this.totalKeyChains = 0;
    this.accessKeyChains = 0;
    this.accessKeyChainId = null;
    this.hasActiveAccessCertificate = false;
    this.hasUsableAccessCertificate = false;
    this.accessCertificateStatus = 'missing';
    this.accessCertificateExpiresAt = null;
    this.accessCertificateDaysUntilExpiry = null;
    this.trustListCount = 0;
    this.hasTrustList = false;
    this.hasRegistrarConfig = false;
    this.credentialConfigs = 0;
    this.presentationConfigs = 0;
    this.hasIssuanceConfig = false;
    this.recentSessions = [];
  }

  private apply(source: DashboardSource, data: any): void {
    switch (source) {
      case 'credentials':
        this.credentialConfigs = data.length;
        break;
      case 'presentations':
        this.presentationConfigs = data.length;
        break;
      case 'sessionStats':
        this.sessionStats = data;
        break;
      case 'recentSessions':
        this.recentSessions = data.items;
        break;
      case 'keyChains':
        this.totalKeyChains = data.filter(
          (kc: KeyChainResponseDto) => kc.usageType !== 'encrypt'
        ).length;
        this.applyAccessCertificateHealth(
          data.filter((kc: KeyChainResponseDto) => kc.usageType === 'access')
        );
        break;
      case 'issuance':
        this.hasIssuanceConfig = !!data;
        break;
      case 'trustLists':
        this.trustListCount = data.length;
        this.hasTrustList = this.trustListCount > 0;
        break;
      case 'registrar':
        this.hasRegistrarConfig = !!data;
        break;
    }
  }

  private applyAccessCertificateHealth(accessKeyChains: KeyChainResponseDto[]): void {
    this.accessKeyChains = accessKeyChains.length;
    this.accessKeyChainId = accessKeyChains[0]?.id ?? null;

    const now = Date.now();
    const withCertificate = accessKeyChains.filter((kc) => !!kc.activeCertificate?.pem);

    this.hasActiveAccessCertificate = withCertificate.length > 0;

    if (withCertificate.length === 0) {
      this.hasUsableAccessCertificate = false;
      this.accessCertificateStatus = 'missing';
      this.accessCertificateExpiresAt = null;
      this.accessCertificateDaysUntilExpiry = null;
      return;
    }

    let nearestValidExpiry: number | null = null;
    let hasNonExpired = false;

    for (const keyChain of withCertificate) {
      const notAfter = keyChain.activeCertificate?.notAfter;
      const expiryMs = notAfter ? Date.parse(notAfter) : Number.NaN;
      if (Number.isNaN(expiryMs)) {
        continue;
      }

      if (expiryMs > now) {
        hasNonExpired = true;
        if (nearestValidExpiry === null || expiryMs < nearestValidExpiry) {
          nearestValidExpiry = expiryMs;
          this.accessKeyChainId = keyChain.id;
        }
      }
    }

    this.hasUsableAccessCertificate = hasNonExpired;

    if (!hasNonExpired) {
      this.accessKeyChainId = withCertificate[0].id;
      this.accessCertificateStatus = 'expired';
      this.accessCertificateExpiresAt = null;
      this.accessCertificateDaysUntilExpiry = null;
      return;
    }

    this.accessCertificateExpiresAt =
      nearestValidExpiry !== null ? new Date(nearestValidExpiry).toISOString() : null;

    this.accessCertificateDaysUntilExpiry =
      nearestValidExpiry !== null
        ? Math.max(0, Math.ceil((nearestValidExpiry - now) / (24 * 60 * 60 * 1000)))
        : null;

    if (
      nearestValidExpiry !== null &&
      nearestValidExpiry - now <= this.accessCertificateExpiringSoonDays * 24 * 60 * 60 * 1000
    ) {
      this.accessCertificateStatus = 'expiring';
      return;
    }

    this.accessCertificateStatus = 'healthy';
  }

  private countSessions(status: keyof SessionStatusCountsDto): number {
    return (
      (this.sessionStats.issuance?.byStatus[status] ?? 0) +
      (this.sessionStats.presentation?.byStatus[status] ?? 0)
    );
  }
}
