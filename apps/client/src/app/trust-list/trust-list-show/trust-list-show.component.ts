import { CommonModule, DatePipe } from '@angular/common';
import { Component, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import {
  CredentialConfig,
  PresentationConfig,
  TrustList,
  TrustListVersion,
  trustListControllerDeleteTrustList,
  trustListControllerGetTrustList,
  trustListControllerGetTrustListVersions,
} from '@eudiplo/sdk-core';
import { ApiService } from '../../core';
import { FlexLayoutModule } from 'ngx-flexible-layout';
import { CredentialConfigService } from '../../issuance/credential-config/credential-config.service';
import { PresentationManagementService } from '../../presentation/presentation-config/presentation-management.service';
import { ConfigOwnershipDirective } from '../../config-portability/config-ownership.directive';
import { ConfigOwnershipNoticeComponent } from '../../config-portability/config-ownership-notice.component';
import { FrontendConfigService } from '../../services/frontend-config.service';
import { JwtService } from '../../services/jwt.service';
import { trustListUrl } from '../../utils/public-url';
import { getApiErrorMessage } from '../../utils/error-message';
import { openErrorSnackBar } from '../../utils/error-snackbar';
import { TrustListService } from '../trust-list.service';
import {
  credentialConfigReferencesTrustList,
  presentationConfigReferencesTrustList,
} from '../trust-list-reference';

interface EntityInfo {
  name: string;
  lang?: string;
  uri?: string;
  country?: string;
  locality?: string;
  postalCode?: string;
  streetAddress?: string;
  contactUri?: string;
}

interface InternalEntity {
  type: 'internal';
  issuerKeyChainId: string;
  revocationKeyChainId: string;
  info: EntityInfo;
}

interface ExternalEntity {
  type: 'external';
  issuerCertPem: string;
  revocationCertPem: string;
  info: EntityInfo;
}

type TrustListEntity = InternalEntity | ExternalEntity;

type ReferenceCheckState = 'checked' | 'loading' | 'failed' | 'forbidden';

/** Whether the references of one kind of config are known, still loading, or not readable. */
function referenceCheckState(
  canRead: boolean,
  loading: boolean,
  failed: boolean
): ReferenceCheckState {
  if (!canRead) return 'forbidden';
  if (failed) return 'failed';
  return loading ? 'loading' : 'checked';
}

@Component({
  selector: 'app-trust-list-show',
  imports: [
    CommonModule,
    DatePipe,
    MatSnackBarModule,
    MatButtonModule,
    MatCardModule,
    MatChipsModule,
    MatExpansionModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatTabsModule,
    MatTooltipModule,
    FlexLayoutModule,
    RouterModule,
    ConfigOwnershipDirective,
    ConfigOwnershipNoticeComponent,
  ],
  templateUrl: './trust-list-show.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './trust-list-show.component.scss',
})
export class TrustListShowComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);
  private readonly apiService = inject(ApiService);
  private readonly credentialConfigService = inject(CredentialConfigService);
  private readonly presentationService = inject(PresentationManagementService);
  private readonly frontendConfigService = inject(FrontendConfigService);
  private readonly jwtService = inject(JwtService);
  private readonly trustListService = inject(TrustListService);

  trustList?: TrustList;
  entities: TrustListEntity[] = [];
  versions: TrustListVersion[] = [];
  publicUrl = '';
  /**
   * True when the backend did not report its public URL and publicUrl uses the instance URL
   * the admin signed in with instead, which wallets may not reach.
   */
  publicUrlIsInstanceUrl = false;
  relatedCredentialConfigs: CredentialConfig[] = [];
  relatedCredentialConfigsLoading = false;
  relatedCredentialConfigsFailed = false;
  relatedPresentationConfigs: PresentationConfig[] = [];
  relatedPresentationConfigsLoading = false;
  relatedPresentationConfigsFailed = false;
  private readonly id: string;

  constructor() {
    this.id = this.route.snapshot.paramMap.get('id')!;
  }

  ngOnInit(): void {
    trustListControllerGetTrustList({ path: { id: this.id } }).then(
      async (res) => {
        this.trustList = res.data;
        this.parseEntities();
        this.loadVersions(this.id);
        void this.buildPublicUrl();
        await Promise.all([
          this.loadRelatedCredentialConfigs(),
          this.loadRelatedPresentationConfigs(),
        ]);
      },
      (error) => {
        openErrorSnackBar(this.snackBar, getApiErrorMessage(error, 'Error loading trust list'));
        this.router.navigate(['/trust-list']);
      }
    );
  }

  private parseEntities(): void {
    if (this.trustList?.entityConfig) {
      this.entities = this.trustList.entityConfig as unknown as TrustListEntity[];
    }
  }

  private loadVersions(id: string): void {
    trustListControllerGetTrustListVersions({ path: { id } }).then(
      (res) => {
        this.versions = res.data ?? [];
      },
      () => {
        // Version history not critical, just log
        console.warn('Could not load version history');
      }
    );
  }

  isInternalEntity(entity: TrustListEntity): entity is InternalEntity {
    return entity.type === 'internal';
  }

  isExternalEntity(entity: TrustListEntity): entity is ExternalEntity {
    return entity.type === 'external';
  }

  getTrustedEntitiesCount(): number {
    const data = this.trustList?.data as { LoTE?: { TrustedEntitiesList?: unknown[] } } | undefined;
    return data?.LoTE?.TrustedEntitiesList?.length ?? 0;
  }

  /**
   * Wallets fetch the list under the backend's PUBLIC_URL, not under the instance URL used to
   * sign in. Backends that do not report it get the instance URL with a warning.
   */
  private async buildPublicUrl(): Promise<void> {
    const trustList = this.trustList;
    if (!trustList) return;
    const publicUrl = (await this.frontendConfigService.getConfig())?.publicUrl;
    this.publicUrlIsInstanceUrl = !publicUrl;
    this.publicUrl = trustListUrl(
      publicUrl ?? this.apiService.getBaseUrl() ?? '',
      trustList.tenantId,
      trustList.id
    );
  }

  /** Credential configs, and so their references to this list, need `issuance:manage`. */
  get canReadCredentialConfigs(): boolean {
    return this.jwtService.hasRole('issuance:manage');
  }

  private async loadRelatedCredentialConfigs(): Promise<void> {
    const trustList = this.trustList;
    if (!trustList || !this.canReadCredentialConfigs) return;

    this.relatedCredentialConfigsLoading = true;
    try {
      const allConfigs = await this.credentialConfigService.loadConfigurations();
      this.relatedCredentialConfigs = allConfigs.filter((config) =>
        credentialConfigReferencesTrustList(config, trustList)
      );
    } catch {
      this.relatedCredentialConfigsFailed = true;
    } finally {
      this.relatedCredentialConfigsLoading = false;
    }
  }

  /** Presentation configs, and so their DCQL trust references, need a presentation role. */
  get canReadPresentationConfigs(): boolean {
    return this.jwtService.hasRole(['presentation:manage', 'presentation:request']);
  }

  private async loadRelatedPresentationConfigs(): Promise<void> {
    const trustList = this.trustList;
    if (!trustList || !this.canReadPresentationConfigs) return;

    this.relatedPresentationConfigsLoading = true;
    try {
      const allConfigs = await this.presentationService.loadConfigurations();
      this.relatedPresentationConfigs = allConfigs.filter((config) =>
        presentationConfigReferencesTrustList(config, trustList)
      );
    } catch {
      this.relatedPresentationConfigsFailed = true;
    } finally {
      this.relatedPresentationConfigsLoading = false;
    }
  }

  /**
   * Asks before deleting. The backend deletes the list even while configs still use it, so the
   * question names the credential and presentation configs that still reference it, and the kinds
   * of config whose references are still loading, failed to load, or need another role.
   */
  deleteQuestion(): string {
    const kinds = [
      {
        noun: 'credential config',
        roles: 'the issuance:manage role',
        count: this.relatedCredentialConfigs.length,
        state: referenceCheckState(
          this.canReadCredentialConfigs,
          this.relatedCredentialConfigsLoading,
          this.relatedCredentialConfigsFailed
        ),
      },
      {
        noun: 'presentation config',
        roles: 'the presentation:manage or presentation:request role',
        count: this.relatedPresentationConfigs.length,
        state: referenceCheckState(
          this.canReadPresentationConfigs,
          this.relatedPresentationConfigsLoading,
          this.relatedPresentationConfigsFailed
        ),
      },
    ];
    const inState = (state: ReferenceCheckState) => kinds.filter((kind) => kind.state === state);
    const nouns = (state: ReferenceCheckState) =>
      inState(state)
        .map((kind) => `${kind.noun}s`)
        .join(' and ');

    const question = [`Delete trust list "${this.trustList?.description || this.id}"?`];
    const used = inState('checked').filter((kind) => kind.count > 0);
    if (used.length) {
      const counts = used.map((kind) => `${kind.count} ${kind.noun}${kind.count === 1 ? '' : 's'}`);
      const total = used.reduce((sum, kind) => sum + kind.count, 0);
      question.push(
        `${counts.join(' and ')} still ${total === 1 ? 'references' : 'reference'} it` +
          ' and would then point to a missing trust list.'
      );
    }
    if (nouns('loading')) question.push(`References from ${nouns('loading')} are still loading.`);
    if (nouns('failed')) question.push(`References from ${nouns('failed')} could not be loaded.`);
    for (const kind of inState('forbidden')) {
      question.push(`Checking ${kind.noun} references needs ${kind.roles}.`);
    }
    question.push('This cannot be undone.');
    return question.join(' ');
  }

  copyToClipboard(text: string, label: string): void {
    navigator.clipboard.writeText(text).then(
      () => {
        this.snackBar.open(`${label} copied to clipboard`, 'Close', { duration: 2000 });
      },
      () => {
        this.snackBar.open('Failed to copy to clipboard', 'Close', { duration: 2000 });
      }
    );
  }

  delete() {
    if (!confirm(this.deleteQuestion())) {
      return;
    }
    trustListControllerDeleteTrustList({ path: { id: this.id } }).then(
      () => {
        this.snackBar.open('Trust list deleted', 'Close', { duration: 3000 });
        this.router.navigate(['/trust-list']);
      },
      (error) => {
        openErrorSnackBar(this.snackBar, getApiErrorMessage(error, 'Error deleting trust list'));
      }
    );
  }

  /**
   * Downloads the current configuration as a JSON file.
   */
  async download(): Promise<void> {
    try {
      await this.trustListService.downloadConfig(this.id);
      this.snackBar.open('Trust list configuration downloaded', 'Close', { duration: 3000 });
    } catch (error) {
      console.error('Error downloading config:', error);
      openErrorSnackBar(
        this.snackBar,
        getApiErrorMessage(error, 'Failed to download configuration')
      );
    }
  }
}
