import { Component, type OnInit, ChangeDetectionStrategy } from '@angular/core';
import { DatePipe } from '@angular/common';
import type { Session } from '@eudiplo/sdk-core';

import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterModule } from '@angular/router';
import { FlexLayoutModule } from 'ngx-flexible-layout';
import { JwtService } from '../services/jwt.service';
import { GrafanaLinkService } from '../services/grafana-link.service';
import { ApiService } from '../core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { DashboardService, DashboardSource } from './dashboard.service';
import { isPresentationSession } from '../session-management/session-management.service';
import {
  DashboardFocus,
  DashboardPreferences,
  DashboardPreferencesService,
  DashboardSection,
} from './dashboard-preferences.service';

interface DashboardFocusOption {
  value: DashboardFocus;
  label: string;
  description: string;
  icon: string;
  available: boolean;
}

interface StatCard {
  source: DashboardSource;
  value: number;
  label: string;
  icon: string;
  iconClass: string;
  route: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    FlexLayoutModule,
    MatCardModule,
    MatButtonModule,
    MatDividerModule,
    MatIconModule,
    MatChipsModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatCheckboxModule,
    DatePipe,
    RouterModule,
  ],
  templateUrl: './dashboard.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit {
  grafanaEnabled = false;
  customizePanelOpen = false;
  preferences: DashboardPreferences = {
    focus: 'balanced',
    visibleSections: {
      recentActivity: true,
      sessionOverview: true,
      quickActions: true,
      resources: true,
    },
  };

  constructor(
    public apiService: ApiService,
    public dashboardService: DashboardService,
    public grafanaLinkService: GrafanaLinkService,
    public jwtService: JwtService,
    private readonly snackBar: MatSnackBar,
    private readonly dashboardPreferencesService: DashboardPreferencesService
  ) {}

  ngOnInit(): void {
    this.preferences = this.dashboardPreferencesService.load(this.defaultPreferences);
    if (!this.isFocusAvailable(this.preferences.focus)) {
      this.preferences = this.defaultPreferences;
      this.dashboardPreferencesService.save(this.preferences);
    }

    // Fetch dashboard stats
    this.dashboardService.getCounters();

    // Load Grafana config
    this.grafanaLinkService.getConfig().then(() => {
      this.grafanaEnabled = this.grafanaLinkService.isEnabled();
    });
  }

  refresh(): void {
    this.dashboardService.getCounters({ keepPrevious: true });
  }

  get currentBaseUrl(): string {
    return this.apiService.getBaseUrl() || 'Not configured';
  }

  get statCards(): StatCard[] {
    const service = this.dashboardService;
    const cards: StatCard[] = [];
    if (service.canManageIssuance) {
      cards.push({
        source: 'credentials',
        value: service.credentialConfigs,
        label: 'Credential Configs',
        icon: 'badge',
        iconClass: 'credential',
        route: '/credential-config',
      });
    }
    if (service.canManagePresentation) {
      cards.push({
        source: 'presentations',
        value: service.presentationConfigs,
        label: 'Presentation Configs',
        icon: 'verified_user',
        iconClass: 'presentation',
        route: '/presentation-config',
      });
    }
    if (service.canManageKeyChains) {
      cards.push({
        source: 'keyChains',
        value: service.totalKeyChains,
        label: 'Key Chains',
        icon: 'vpn_key',
        iconClass: 'keys',
        route: '/keys',
      });
    }
    if (service.canViewSessions) {
      cards.push({
        source: 'sessionStats',
        value: service.totalSessions,
        label: 'Total Sessions',
        icon: 'sync',
        iconClass: 'sessions',
        route: '/session-management',
      });
    }
    return cards;
  }

  /** The value once its request has loaded, otherwise what the user is waiting for. */
  loadedValue(source: DashboardSource, value: string): string {
    if (this.dashboardService.isLoaded(source)) return value;
    return this.dashboardService.hasFailed(source) ? 'Could not be loaded' : 'Loading…';
  }

  sessionTypeLabel(session: Session): string {
    return isPresentationSession(session) ? 'Presentation' : 'Issuance';
  }

  sessionDetails(session: Session): string {
    return [session.requestId, session.reference, session.failureCode, session.id.slice(0, 8)]
      .filter((part) => !!part)
      .join(' · ');
  }

  openGrafana(): void {
    const url = this.grafanaLinkService.getBaseUrl();
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  }

  get focusOptions(): DashboardFocusOption[] {
    return [
      {
        value: 'balanced',
        label: 'Balanced',
        description: 'A broad view across configuration and operations',
        icon: 'dashboard',
        available: true,
      },
      {
        value: 'issuance',
        label: 'Issuance',
        description: 'Prioritize credential issuance workflows',
        icon: 'card_giftcard',
        available:
          this.dashboardService.canManageIssuance || this.dashboardService.canOfferIssuance,
      },
      {
        value: 'verification',
        label: 'Verification',
        description: 'Prioritize presentation requests and verification',
        icon: 'fact_check',
        available:
          this.dashboardService.canManagePresentation ||
          this.jwtService.hasRole('presentation:request'),
      },
      {
        value: 'operations',
        label: 'Operations',
        description: 'Focus on health, sessions, and recent activity',
        icon: 'monitor_heart',
        available: this.dashboardService.canViewSessions,
      },
    ];
  }

  get focusLabel(): string {
    return this.focusOptions.find((option) => option.value === this.preferences.focus)?.label ?? '';
  }

  get readinessTitle(): string {
    if (this.dashboardService.isLoading) return 'Checking system readiness…';
    if (this.dashboardService.hasWarnings) {
      const count = this.dashboardService.warnings.length;
      return `${count} ${count === 1 ? 'item needs' : 'items need'} attention`;
    }
    if (this.dashboardService.isReadOnly) {
      return 'Monitoring access: your roles cannot change the issuance or presentation setup';
    }
    if (this.dashboardService.isSetupComplete) return 'Ready for wallet flows';
    return 'Setup incomplete';
  }

  get defaultPreferences(): DashboardPreferences {
    let focus: DashboardFocus = 'balanced';
    if (
      (this.dashboardService.canManageIssuance || this.dashboardService.canOfferIssuance) &&
      !this.dashboardService.canManagePresentation &&
      !this.jwtService.hasRole('presentation:request')
    ) {
      focus = 'issuance';
    } else if (
      (this.dashboardService.canManagePresentation ||
        this.jwtService.hasRole('presentation:request')) &&
      !this.dashboardService.canManageIssuance &&
      !this.dashboardService.canOfferIssuance
    ) {
      focus = 'verification';
    } else if (
      this.dashboardService.canViewSessions &&
      !this.dashboardService.canManageIssuance &&
      !this.dashboardService.canManagePresentation
    ) {
      focus = 'operations';
    }

    return this.preferencesForFocus(focus);
  }

  isSectionVisible(section: DashboardSection): boolean {
    return this.preferences.visibleSections[section];
  }

  setFocus(focus: DashboardFocus): void {
    if (!this.isFocusAvailable(focus)) return;
    this.preferences = this.preferencesForFocus(focus);
    this.persistPreferences();
  }

  setSectionVisibility(section: DashboardSection, visible: boolean): void {
    this.preferences = {
      ...this.preferences,
      visibleSections: { ...this.preferences.visibleSections, [section]: visible },
    };
    this.persistPreferences();
  }

  resetDashboard(): void {
    this.dashboardPreferencesService.reset();
    this.preferences = this.defaultPreferences;
    this.customizePanelOpen = false;
    this.snackBar.open('Dashboard reset to your role-based defaults.', 'Close', {
      duration: 3000,
    });
  }

  sessionStatusIcon(status: string): string {
    switch (status) {
      case 'completed':
        return 'check_circle';
      case 'failed':
        return 'error';
      case 'expired':
        return 'schedule';
      case 'cancelled':
        return 'cancel';
      case 'fetched':
        return 'download';
      default:
        return 'hourglass_empty';
    }
  }

  private persistPreferences(): void {
    this.dashboardPreferencesService.save(this.preferences);
  }

  private preferencesForFocus(focus: DashboardFocus): DashboardPreferences {
    const visibleSections: Record<DashboardSection, boolean> = {
      recentActivity: true,
      sessionOverview: true,
      quickActions: true,
      resources: focus === 'balanced',
    };

    if (focus === 'operations') {
      visibleSections.quickActions = false;
    }

    return { focus, visibleSections };
  }

  private isFocusAvailable(focus: DashboardFocus): boolean {
    return this.focusOptions.some((option) => option.value === focus && option.available);
  }
}
