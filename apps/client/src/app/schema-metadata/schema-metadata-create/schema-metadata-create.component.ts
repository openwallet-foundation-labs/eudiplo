import { CommonModule } from '@angular/common';
import { Component, OnInit, isDevMode } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FlexLayoutModule } from 'ngx-flexible-layout';
import {
  CredentialConfig,
  TrustList,
  trustListControllerGetAllTrustLists,
} from '@eudiplo/sdk-core';
import { ApiService } from '../../core';
import { CredentialConfigService } from '../../issuance/credential-config/credential-config.service';
import { SchemaMetadataService } from '../schema-metadata.service';

const SEMVER_REGEX =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

@Component({
  selector: 'app-schema-metadata-create',
  imports: [
    CommonModule,
    MatButtonModule,
    MatCardModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatSnackBarModule,
    MatTooltipModule,
    FlexLayoutModule,
    ReactiveFormsModule,
    RouterModule,
  ],
  templateUrl: './schema-metadata-create.component.html',
  styleUrl: './schema-metadata-create.component.scss',
})
export class SchemaMetadataCreateComponent implements OnInit {
  loading = false;
  readonly demoDefaultsEnabled = isDevMode();
  /** Credential config ID passed via query param — linked back to the schema metadata on submit */
  credentialConfigId: string | undefined;

  /** All credential configs (for importing schema URIs) */
  credentialConfigs: CredentialConfig[] = [];
  /** All trust lists (for importing trusted authorities) */
  trustLists: TrustList[] = [];

  readonly attestationLoSOptions = [
    { value: 'iso_18045_high', label: 'High (ISO 18045)' },
    { value: 'iso_18045_moderate', label: 'Moderate (ISO 18045)' },
    { value: 'iso_18045_enhanced-basic', label: 'Enhanced Basic (ISO 18045)' },
    { value: 'iso_18045_basic', label: 'Basic (ISO 18045)' },
  ];

  readonly bindingTypeOptions = [
    { value: 'claim', label: 'Claim' },
    { value: 'key', label: 'Key' },
    { value: 'biometric', label: 'Biometric' },
    { value: 'none', label: 'None' },
  ];

  readonly frameworkTypeOptions = [
    { value: 'etsi_tl', label: 'ETSI TL' },
    { value: 'openid_federation', label: 'OpenID Federation' },
  ];

  readonly schemaFormatOptions = [
    { value: 'dc+sd-jwt', label: 'dc+sd-jwt' },
    { value: 'mso_mdoc', label: 'mso_mdoc' },
  ];

  /** The main schema metadata composition form */
  composeForm = new FormGroup({
    version: new FormControl('', [Validators.required, Validators.pattern(SEMVER_REGEX)]),
    rulebookURI: new FormControl('', [Validators.required]),
    attestationLoS: new FormControl('', [Validators.required]),
    bindingType: new FormControl('', [Validators.required]),
    schemaURIs: new FormArray<FormGroup>([], Validators.required),
    trustedAuthorities: new FormArray<FormGroup>([], Validators.required),
  });

  /** For selecting a config whose schemaURIs to import */
  importSchemaConfigId = new FormControl('');
  /** For selecting a trust list to import as trusted authority */
  importTrustListId = new FormControl('');

  constructor(
    private readonly fb: FormBuilder,
    private readonly schemaMetadataService: SchemaMetadataService,
    private readonly credentialConfigService: CredentialConfigService,
    private readonly apiService: ApiService,
    private readonly snackBar: MatSnackBar,
    private readonly router: Router,
    private readonly route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.credentialConfigId =
      this.route.snapshot.queryParamMap.get('credentialConfigId') ?? undefined;
    this.loadData();
    if (this.demoDefaultsEnabled) {
      this.applyDemoValues();
    }
  }

  applyDemoValues(): void {
    this.composeForm.patchValue({
      version: '1.0.0',
      rulebookURI:
        'https://raw.githubusercontent.com/cre8/catalog-of-attestations/refs/heads/main/rulebooks/gym-membership-card/1.0.0.md',
      attestationLoS: 'iso_18045_basic',
      bindingType: 'key',
    });

    // schemaURIs: skip when credentialConfigId is provided — the backend
    // auto-derives the URI from the credential config UUID and format.
    // For demo convenience (without credentialConfigId), prefill the
    // format only and let the user provide/import the URI.
    this.schemaURIs.clear();
    if (!this.credentialConfigId) {
      this.schemaURIs.push(this.createSchemaURIGroup('dc+sd-jwt', ''));
    }

    const baseUrl = (this.apiService.getBaseUrl() ?? '').replace(/\/$/, '');
    this.trustedAuthorities.clear();
    this.trustedAuthorities.push(
      this.createTrustedAuthorityGroup(
        'etsi_tl',
        `${baseUrl}/issuers/playground/trust-list/580831bc-ef11-43f4-a3be-a2b6bf1b29a3`,
        true
      )
    );
  }

  get schemaURIs(): FormArray<FormGroup> {
    return this.composeForm.get('schemaURIs') as FormArray<FormGroup>;
  }

  get trustedAuthorities(): FormArray<FormGroup> {
    return this.composeForm.get('trustedAuthorities') as FormArray<FormGroup>;
  }

  /** Display label for a credential config (used in select dropdown). */
  configLabel(c: CredentialConfig): string {
    return c.description ? `${c.description} (${c.id})` : c.id;
  }

  /** Display label for a trust list (used in select dropdown). */
  trustListLabel(tl: TrustList): string {
    return tl.description ? `${tl.description} (${tl.id})` : tl.id;
  }

  private createSchemaURIGroup(format = '', uri = '', imported = false): FormGroup {
    const group = this.fb.group({
      format: [format, Validators.required],
      uri: [uri, Validators.required],
      imported: [imported],
    });
    if (imported) {
      group.get('format')!.disable();
      group.get('uri')!.disable();
    }
    return group;
  }

  private createTrustedAuthorityGroup(
    frameworkType = '',
    value = '',
    isLoTE = false,
    imported = false
  ): FormGroup {
    const group = this.fb.group({
      frameworkType: [frameworkType, Validators.required],
      value: [value, Validators.required],
      isLoTE: [isLoTE],
      imported: [imported],
    });
    if (imported) {
      group.get('frameworkType')!.disable();
      group.get('value')!.disable();
    }
    return group;
  }

  addSchemaURI(): void {
    this.schemaURIs.push(this.createSchemaURIGroup());
  }

  removeSchemaURI(index: number): void {
    this.schemaURIs.removeAt(index);
  }

  addTrustedAuthority(): void {
    this.trustedAuthorities.push(this.createTrustedAuthorityGroup());
  }

  removeTrustedAuthority(index: number): void {
    this.trustedAuthorities.removeAt(index);
  }

  /**
   * Build the public URL of a credential config's inline JSON schema.
   * Mirrors the backend route `GET /issuers/:tenantId/credentials-metadata/schema/:id/:format`.
   */
  private buildSchemaUrl(config: CredentialConfig): string {
    const baseUrl = (this.apiService.getBaseUrl() ?? '').replace(/\/$/, '');
    const tenantId = (config as { tenantId?: string }).tenantId ?? config.tenant?.id ?? '';
    const format = config.config?.format ?? '';
    return `${baseUrl}/issuers/${tenantId}/credentials-metadata/schema/${config.id}/${format}`;
  }

  /** Import schemaURIs from the selected credential config. */
  importSchemaURIsFromConfig(): void {
    const configId = this.importSchemaConfigId.value;
    if (!configId) return;
    const config = this.credentialConfigs.find((c) => c.id === configId);
    if (!config) return;
    const format = config.config?.format ?? '';

    // 1. Use explicitly configured schemaURIs if present.
    if (config.schemaMeta?.schemaURIs?.length) {
      for (const entry of config.schemaMeta.schemaURIs) {
        this.schemaURIs.push(
          this.createSchemaURIGroup(entry.format ?? format, entry.uri ?? '', true)
        );
      }
      this.importSchemaConfigId.setValue('');
      this.snackBar.open('Schema URIs imported from credential config', 'Close', {
        duration: 2500,
      });
      return;
    }

    // 2. Fall back to the inline JSON schema served by the backend.
    if (config.schema) {
      this.schemaURIs.push(this.createSchemaURIGroup(format, this.buildSchemaUrl(config), true));
      this.importSchemaConfigId.setValue('');
      this.snackBar.open('Schema URI added from credential config', 'Close', { duration: 2500 });
      return;
    }

    // 3. No schema available at all.
    this.snackBar.open('Selected credential config has no JSON schema configured', 'Close', {
      duration: 4000,
    });
  }

  /** URL of an exported trust list — must match the backend route. */
  private getTrustListUrl(tl: TrustList): string {
    const baseUrl = (this.apiService.getBaseUrl() ?? '').replace(/\/$/, '');
    return `${baseUrl}/issuers/${tl.tenantId}/trust-list/${tl.id}`;
  }

  /** Import a trust list as a trusted authority entry. */
  importTrustList(): void {
    const trustListId = this.importTrustListId.value;
    if (!trustListId) return;
    const tl = this.trustLists.find((t) => t.id === trustListId);
    if (!tl) return;
    // ETSI TL imports default to LoTE=true.
    this.trustedAuthorities.push(
      this.createTrustedAuthorityGroup('etsi_tl', this.getTrustListUrl(tl), true, true)
    );
    this.importTrustListId.setValue('');
    this.snackBar.open('Trust list added as ETSI TL (LoTE enabled by default)', 'Close', {
      duration: 4000,
    });
  }

  async loadData(): Promise<void> {
    try {
      const [configs, tlResponse] = await Promise.all([
        this.credentialConfigService.loadConfigurations(),
        trustListControllerGetAllTrustLists(),
      ]);
      this.credentialConfigs = configs;
      this.trustLists = Array.isArray(tlResponse.data) ? tlResponse.data : [];

      // Auto-populate schemaURIs from the linked credential config when
      // credentialConfigId is provided via query param (navigated from config detail page).
      if (this.credentialConfigId && this.schemaURIs.length === 0) {
        const linked = configs.find((c) => c.id === this.credentialConfigId);
        if (linked) {
          this.schemaURIs.push(
            this.createSchemaURIGroup(
              linked.config?.format ?? '',
              this.buildSchemaUrl(linked),
              true
            )
          );
        }
      }
    } catch {
      // non-fatal — selects will simply be empty
    }
  }

  /**
   * Build the SchemaMetaConfig payload from the form. The attestation `id`
   * and all integrity hashes are intentionally omitted — they are produced
   * by the backend during signing (id from the registrar, integrity hashes
   * computed from the live URIs).
   */
  private buildConfig(): Record<string, unknown> {
    const raw = this.composeForm.getRawValue();
    return {
      version: raw.version!,
      rulebookURI: raw.rulebookURI!,
      attestationLoS: raw.attestationLoS,
      bindingType: raw.bindingType,
      schemaURIs: (raw.schemaURIs as Record<string, unknown>[]).map((e) => ({
        format: e['format'],
        uri: e['uri'],
        // `imported` is a UI-only flag — exclude from payload
      })),
      trustedAuthorities: (raw.trustedAuthorities as Record<string, unknown>[]).map((e) => ({
        frameworkType: e['frameworkType'],
        value: e['value'],
        ...(e['isLoTE'] !== undefined ? { isLoTE: e['isLoTE'] } : {}),
        // `imported` is a UI-only flag — exclude from payload
      })),
    };
  }

  async submit(): Promise<void> {
    if (this.composeForm.invalid) {
      this.composeForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    try {
      // The backend reserves the attestation id, signs the config and submits
      // it to the registrar in a single call — we just receive the resulting
      // metadata entry.
      const created = await this.schemaMetadataService.signSchemaMetaConfig(
        this.buildConfig() as never,
        undefined,
        this.credentialConfigId
      );

      this.snackBar.open('Schema metadata submitted', 'Close', { duration: 3000 });
      this.router.navigate(['/schema-metadata', created.id]);
    } catch (error) {
      console.error('Failed to submit schema metadata:', error);
      const msg = error instanceof Error ? error.message : 'Failed to submit schema metadata';
      this.snackBar.open(msg, 'Close', { duration: 5000 });
    } finally {
      this.loading = false;
    }
  }
}
