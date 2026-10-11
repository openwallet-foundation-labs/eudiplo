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
  SchemaMetaConfig,
  TrustList,
  TrustListVersion,
  trustListControllerDeleteTrustList,
  trustListControllerExportTrustList,
  trustListControllerGetTrustList,
  trustListControllerGetTrustListVersions,
} from '@eudiplo/sdk-core';
import { ApiService } from '../../core';
import { FlexLayoutModule } from 'ngx-flexible-layout';
import { CredentialConfigService } from '../../issuance/credential-config/credential-config.service';
import { ConfigOwnershipDirective } from '../../config-portability/config-ownership.directive';
import { ConfigOwnershipNoticeComponent } from '../../config-portability/config-ownership-notice.component';
import { FrontendConfigService } from '../../services/frontend-config.service';
import { JwtService } from '../../services/jwt.service';
import { trustListUrl } from '../../utils/public-url';
import { getApiErrorMessage } from '../../utils/error-message';
import { openErrorSnackBar } from '../../utils/error-snackbar';

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
  private readonly frontendConfigService = inject(FrontendConfigService);
  private readonly jwtService = inject(JwtService);

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
        await this.loadRelatedCredentialConfigs();
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
    if (!this.trustList || !this.canReadCredentialConfigs) return;

    let allConfigs: CredentialConfig[];
    this.relatedCredentialConfigsLoading = true;
    try {
      allConfigs = await this.credentialConfigService.loadConfigurations();
    } catch {
      this.relatedCredentialConfigsFailed = true;
      return;
    } finally {
      this.relatedCredentialConfigsLoading = false;
    }
    const trustListId = this.trustList.id;
    const trustListPathSegment = `/trust-list/${trustListId}`;

    this.relatedCredentialConfigs = allConfigs.filter((config) => {
      const authorities =
        (config.schemaMeta as SchemaMetaConfig | undefined)?.trustedAuthorities ?? [];
      return authorities.some((ta) => {
        if (ta.frameworkType !== 'etsi_tl') return false;
        const value = ta.value ?? '';
        return value === trustListId || value.includes(trustListPathSegment);
      });
    });
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
    const id = this.route.snapshot.paramMap.get('id')!;
    if (
      !confirm(`Delete trust list "${this.trustList?.description || id}"? This cannot be undone.`)
    ) {
      return;
    }
    trustListControllerDeleteTrustList({ path: { id } }).then(
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
  async download() {
    const config = await trustListControllerExportTrustList({ path: { id: this.id } }).then(
      (res) => res.data
    );
    const dataStr =
      'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(config, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute('href', dataStr);
    downloadAnchorNode.setAttribute('download', `trustlist-${this.id}-config.json`);
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    this.snackBar.open('Trust list configuration downloaded', 'Close', { duration: 3000 });
  }
}
