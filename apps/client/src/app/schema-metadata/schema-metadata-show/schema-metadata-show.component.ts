import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FlexLayoutModule } from 'ngx-flexible-layout';
import type {
  CredentialConfig,
  SchemaMetaConfig,
  UpdateSchemaMetadataDto,
} from '@eudiplo/sdk-core';
import { CredentialConfigService } from '../../issuance/credential-config/credential-config.service';
import { SchemaMetadata, SchemaMetadataService } from '../schema-metadata.service';

@Component({
  selector: 'app-schema-metadata-show',
  imports: [
    CommonModule,
    DatePipe,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSnackBarModule,
    MatTooltipModule,
    FlexLayoutModule,
    ReactiveFormsModule,
    RouterModule,
  ],
  templateUrl: './schema-metadata-show.component.html',
  styleUrl: './schema-metadata-show.component.scss',
})
export class SchemaMetadataShowComponent implements OnInit {
  id = '';
  item?: SchemaMetadata;
  loading = false;
  showPublishForm = false;
  publishing = false;

  /** Credential configs that reference this schema metadata via schemaMeta.id */
  relatedCredentialConfigs: CredentialConfig[] = [];

  /**
   * For each trusted authority whose value is a local trust-list URL,
   * the extracted UUID — used to build the /trust-list/:id router link.
   */
  trustListIds: { value: string; localId: string | null }[] = [];

  metadataForm = new FormGroup({
    category: new FormControl(''),
    tagsCsv: new FormControl(''),
  });

  publishForm = new FormGroup({
    newVersion: new FormControl('', [Validators.required, Validators.pattern(/^\d+\.\d+\.\d+$/)]),
    rulebookURI: new FormControl(''),
    deprecateCurrent: new FormControl(true),
  });

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly schemaMetadataService: SchemaMetadataService,
    private readonly credentialConfigService: CredentialConfigService,
    private readonly snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id') || '';
    this.load();
  }

  async load(): Promise<void> {
    if (!this.id) return;
    this.loading = true;
    try {
      this.item = await this.schemaMetadataService.getById(this.id);
      this.metadataForm.patchValue({
        category: this.item.category || '',
        tagsCsv: (this.item.tags || []).join(', '),
      });
      this.publishForm.patchValue({
        newVersion: this.bumpMinorVersion(this.item.version),
        rulebookURI: this.item.rulebookURI || '',
      });
      // Map trusted authority values to local trust-list IDs (last URL segment)
      this.trustListIds = (this.item.trustedAuthorities ?? []).map((ta) => ({
        value: ta.value,
        localId: this.extractTrustListId(ta.value),
      }));
      const allConfigs = await this.credentialConfigService.loadConfigurations();
      this.relatedCredentialConfigs = allConfigs.filter((c) => {
        const schemaMetaId = (c.schemaMeta as SchemaMetaConfig | undefined)?.id;
        const schemaMetaIdMatches =
          !!schemaMetaId &&
          (schemaMetaId === this.item!.id || schemaMetaId.split('/').pop() === this.item!.id);

        // Fallback for entries where schemaMeta.id was not written back:
        // infer relation via schema URI path segment /schema/{credentialConfigId}/{format}.
        const schemaUriMatches = (this.item?.schemaURIs ?? []).some(
          (entry) => typeof entry.uri === 'string' && entry.uri.includes(`/schema/${c.id}/`)
        );

        return schemaMetaIdMatches || schemaUriMatches;
      });
    } catch (error) {
      console.error('Failed to load schema metadata:', error);
      this.snackBar.open('Failed to load schema metadata', 'Close', { duration: 3000 });
      this.router.navigate(['/schema-metadata']);
    } finally {
      this.loading = false;
    }
  }

  async saveMetadata(): Promise<void> {
    if (!this.id) return;
    try {
      const tagsCsv = this.metadataForm.get('tagsCsv')?.value || '';
      const tags = tagsCsv
        .split(',')
        .map((t) => t.trim())
        .filter((t) => !!t);

      this.item = await this.schemaMetadataService.updateMetadata(
        this.id,
        this.item?.version ?? '',
        {
          category:
            (this.metadataForm.get('category')?.value as
              | UpdateSchemaMetadataDto['category']
              | undefined) || undefined,
          tags,
        }
      );

      this.snackBar.open('Metadata updated', 'Close', { duration: 3000 });
    } catch (error) {
      console.error('Failed to update metadata:', error);
      this.snackBar.open('Failed to update metadata', 'Close', { duration: 3000 });
    }
  }

  async copyJwt(): Promise<void> {
    if (!this.id) return;
    try {
      const jwt = await this.schemaMetadataService.getSignedJwt(this.id, this.item?.version ?? '');
      await navigator.clipboard.writeText(jwt);
      this.snackBar.open('Signed JWT copied to clipboard', 'Close', { duration: 3000 });
    } catch (error) {
      console.error('Failed to copy JWT:', error);
      this.snackBar.open('Failed to copy JWT', 'Close', { duration: 3000 });
    }
  }

  get jwtUrl(): string {
    const version = this.item?.version;
    const idUrl = this.extractCatalogIdFromSignedJwt(this.item?.signedJwt);
    if (!idUrl || !version) return '';

    // If the ID already points to a versioned JWT endpoint, keep it as-is.
    if (/\/versions\/[^/]+\/jwt$/.test(idUrl)) {
      return idUrl;
    }

    return `${idUrl}/versions/${version}/jwt`;
  }

  private extractCatalogIdFromSignedJwt(jwt?: string): string | null {
    if (!jwt) return null;
    try {
      const parts = jwt.split('.');
      if (parts.length < 2) return null;

      const payloadBase64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const padded = payloadBase64.padEnd(
        payloadBase64.length + ((4 - (payloadBase64.length % 4)) % 4),
        '='
      );
      const payloadJson = atob(padded);
      const payload = JSON.parse(payloadJson) as { id?: unknown };
      const idUrl = typeof payload.id === 'string' ? payload.id.replace(/\/$/, '') : '';
      return idUrl || null;
    } catch {
      return null;
    }
  }

  private getErrorMessage(error: unknown, fallback: string): string {
    if (typeof error === 'object' && error !== null) {
      const asRecord = error as Record<string, unknown>;

      // SDK/network errors often wrap backend payloads in an `error` field.
      const nested = asRecord['error'];
      if (typeof nested === 'object' && nested !== null) {
        const nestedRecord = nested as Record<string, unknown>;
        const nestedMessage = nestedRecord['message'];

        if (typeof nestedMessage === 'string' && nestedMessage.trim()) {
          return nestedMessage;
        }
        if (typeof nestedMessage === 'object' && nestedMessage !== null) {
          const innerMessage = (nestedMessage as Record<string, unknown>)['message'];
          if (typeof innerMessage === 'string' && innerMessage.trim()) {
            return innerMessage;
          }
        }
      }

      const topLevelMessage = asRecord['message'];
      if (typeof topLevelMessage === 'string' && topLevelMessage.trim()) {
        return topLevelMessage;
      }
      if (typeof topLevelMessage === 'object' && topLevelMessage !== null) {
        const innerMessage = (topLevelMessage as Record<string, unknown>)['message'];
        if (typeof innerMessage === 'string' && innerMessage.trim()) {
          return innerMessage;
        }
      }
    }

    return fallback;
  }

  async copyJwtUrl(): Promise<void> {
    if (!this.jwtUrl) return;
    try {
      await navigator.clipboard.writeText(this.jwtUrl);
      this.snackBar.open('JWT URL copied to clipboard', 'Close', { duration: 3000 });
    } catch (error) {
      console.error('Failed to copy JWT URL:', error);
      this.snackBar.open('Failed to copy JWT URL', 'Close', { duration: 3000 });
    }
  }

  async downloadExport(): Promise<void> {
    if (!this.id) return;
    try {
      const exported = await this.schemaMetadataService.exportCatalog(
        this.id,
        this.item?.version ?? ''
      );
      const data = JSON.stringify(exported, null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `schema-metadata-${this.id}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export schema metadata:', error);
      this.snackBar.open('Failed to export schema metadata', 'Close', { duration: 3000 });
    }
  }

  /** Increment the minor segment of a SemVer string and reset patch to 0. */
  private bumpMinorVersion(version: string): string {
    const parts = version.split('.');
    if (parts.length === 3) {
      const minor = parseInt(parts[1], 10);
      return `${parts[0]}.${minor + 1}.0`;
    }
    return version;
  }

  /**
   * Extract the UUID at the end of a trust-list URL
   * (e.g. http://host/issuers/tenant/trust-list/<uuid> → <uuid>).
   * Returns null if the value does not look like a local trust-list URL.
   */
  private extractTrustListId(value: string): string | null {
    try {
      const url = new URL(value);
      const segments = url.pathname.split('/').filter(Boolean);
      const idx = segments.indexOf('trust-list');
      if (idx !== -1 && segments[idx + 1]) {
        return segments[idx + 1];
      }
    } catch {
      // not a URL
    }
    return null;
  }

  togglePublishForm(): void {
    this.showPublishForm = !this.showPublishForm;
  }

  async publishNewVersion(): Promise<void> {
    if (!this.item || this.publishForm.invalid) return;

    const newVersion = this.publishForm.get('newVersion')!.value!;
    const rulebookURI = this.publishForm.get('rulebookURI')!.value || this.item.rulebookURI;
    const deprecateCurrent = this.publishForm.get('deprecateCurrent')!.value;
    const catalogId = this.extractCatalogIdFromSignedJwt(this.item.signedJwt);

    if (!catalogId) {
      this.snackBar.open(
        'Cannot publish new version: invalid catalog ID in signed JWT payload',
        'Close',
        {
          duration: 4000,
        }
      );
      return;
    }

    const config: SchemaMetaConfig = {
      id: catalogId,
      version: newVersion,
      rulebookURI: rulebookURI ?? undefined,
      attestationLoS: this.item.attestationLoS,
      bindingType: this.item.bindingType,
      schemaURIs: (this.item.schemaURIs ?? []).map((s) => ({
        format: s.formatIdentifier,
        uri: s.uri,
      })),
      trustedAuthorities: (this.item.trustedAuthorities ?? []).map((t) => ({
        frameworkType: t.frameworkType,
        value: t.value,
      })),
    };

    this.publishing = true;
    try {
      const newEntry = await this.schemaMetadataService.publishNewVersion(config);

      if (deprecateCurrent) {
        await this.schemaMetadataService.deprecateVersion(this.item.id, this.item.version, {
          deprecated: true,
          message: `Superseded by version ${newVersion}`,
          supersededByVersion: newVersion,
        });
      }

      this.snackBar.open(`Version ${newVersion} published successfully`, 'Close', {
        duration: 4000,
      });
      this.showPublishForm = false;
      this.router.navigate(['/schema-metadata', newEntry.id]);
    } catch (error) {
      console.error('Failed to publish new version:', error);
      this.snackBar.open(this.getErrorMessage(error, 'Failed to publish new version'), 'Close', {
        duration: 6000,
      });
    } finally {
      this.publishing = false;
    }
  }

  async delete(): Promise<void> {
    try {
      await this.schemaMetadataService.delete(this.id, this.item?.version ?? '');
      this.snackBar.open('Schema metadata deleted', 'Close', { duration: 3000 });
      this.router.navigate(['/schema-metadata']);
    } catch (error) {
      console.error('Failed to delete schema metadata:', error);
      this.snackBar.open('Failed to delete schema metadata', 'Close', { duration: 3000 });
    }
  }
}
